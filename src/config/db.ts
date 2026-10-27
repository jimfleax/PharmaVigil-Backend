/**
 * @file db.ts
 * @description Robust MongoDB connection manager for PharmaVigil.
 * Implements:
 *   - Global connection caching via globalThis (survives hot reloads and lambda warm invocations)
 *   - Single-flight concurrency coalescing (concurrent calls share one in-flight connect)
 *   - 3-retry exponential backoff with Full Jitter
 *   - Credential masking in all logs and error objects
 *   - Fail-fast URI validation (0 retries wasted on invalid/empty URI)
 *   - Connection lifecycle event listeners with automatic cache invalidation
 *   - Health probes (liveness and readiness)
 *   - Test helpers for cache isolation
 */

import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';
import { env } from './env.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface ConnectDBOptions {
  retries?: number; // Default: 3
  initialBackoffMs?: number; // Default: 1000ms
  maxBackoffMs?: number; // Default: 5000ms
  jitter?: boolean; // Default: true (Full Jitter)
  mongoClientOptions?: MongoClientOptions;
  dbName?: string;
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string | Error, ...args: unknown[]) => void;
  };
}

export interface DatabaseHealthResult {
  ok: boolean;
  status: 'connected' | 'disconnected' | 'connecting' | 'unknown';
  pingLatencyMs?: number;
  error?: string;
}

interface MongoDBCache {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

// ─── Global Cache ────────────────────────────────────────────────────

declare global {
  var __pharmavigilMongoClientCache: MongoDBCache | undefined;
}

const getCache = (): MongoDBCache => {
  if (!globalThis.__pharmavigilMongoClientCache) {
    globalThis.__pharmavigilMongoClientCache = { client: null, db: null, promise: null };
  }
  return globalThis.__pharmavigilMongoClientCache;
};

// ─── Custom Error ────────────────────────────────────────────────────

export class DatabaseConnectionError extends Error {
  public readonly attempts: number;
  public readonly sanitizedUri?: string | undefined;

  constructor(message: string, options?: { cause?: unknown; attempts?: number; uri?: string }) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.attempts = options?.attempts ?? 0;
    if (options?.uri !== undefined) {
      this.sanitizedUri = options.uri;
    }
    if (options?.cause) this.cause = options.cause;
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }
}

// ─── Credential Masking ──────────────────────────────────────────────

export function maskMongoUri(uri?: string): string {
  if (!uri || typeof uri !== 'string') return '';
  try {
    return uri.replace(/\/\/(.*?)@/, (_match, creds) => {
      const parts = creds.split(':');
      return parts.length >= 2 ? `//${parts[0]}:****@` : '//****@';
    });
  } catch {
    return 'mongodb://[masked]';
  }
}

// ─── Connection Lifecycle Listeners ──────────────────────────────────

function setupConnectionListeners(
  client: MongoClient,
  logger: NonNullable<ConnectDBOptions['logger']>,
) {
  const invalidate = () => {
    logger.warn?.('[MongoDB] Connection closed or topology destroyed. Invalidating cache.');
    const cache = getCache();
    if (cache.client === client) {
      cache.client = null;
      cache.db = null;
      cache.promise = null;
    }
  };

  // Intercept client.close to immediately invalidate cache
  const originalClose = client.close.bind(client);
  client.close = async function (force?: boolean): Promise<void> {
    invalidate();
    return originalClose(force);
  };

  client.on('topologyClosed', invalidate);
  client.on('connectionPoolClosed', invalidate);

  client.on('error', (err) => {
    logger.error?.('[MongoDB] Runtime client error:', err);
  });

  client.on('connectionClosed', (event) => {
    logger.warn?.(`[MongoDB] Individual connection closed (reason: ${event.reason || 'unknown'}).`);
  });
}

// ─── Connect (with retry, caching, coalescing) ────────────────────────

export async function connectToDatabase(
  uri?: string,
  optionsOrRetries: ConnectDBOptions | number = 3,
): Promise<{ client: MongoClient; db: Db }> {
  const options: ConnectDBOptions =
    typeof optionsOrRetries === 'number' ? { retries: optionsOrRetries } : optionsOrRetries || {};

  const targetUri = uri ?? (env?.EFFECTIVE_MONGODB_URI || process.env.MONGODB_URI);

  // Fail-fast: validate URI before any retry attempts
  if (!targetUri || typeof targetUri !== 'string' || targetUri.trim() === '') {
    throw new DatabaseConnectionError(
      'MongoDB URI is required. Provide a valid connection string or set MONGODB_URI.',
      { attempts: 0, uri: '' },
    );
  }

  const cache = getCache();
  const logger = options.logger ?? console;

  // 1. Reuse existing connection if active
  if (cache.client && cache.db) {
    if ((cache.client as unknown as { s?: { hasBeenClosed?: boolean } }).s?.hasBeenClosed) {
      cache.client = null;
      cache.db = null;
      cache.promise = null;
    } else {
      return { client: cache.client, db: cache.db };
    }
  }

  // 2. Coalesce concurrent connection attempts (single-flight pattern)
  if (cache.promise) {
    return cache.promise;
  }

  // 3. Initiate retry mechanism with Full Jitter backoff
  const retries = options.retries ?? 3;
  const initialBackoffMs = options.initialBackoffMs ?? 1000;
  const maxBackoffMs = options.maxBackoffMs ?? 5000;
  const useJitter = options.jitter ?? true;
  const dbName = options.dbName || env?.MONGODB_DB_NAME || 'pharmavigil_test';

  cache.promise = (async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      let client: MongoClient | null = null;
      try {
        const defaultOptions: MongoClientOptions = {
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
          ...options.mongoClientOptions,
        };

        client = new MongoClient(targetUri, defaultOptions);
        await client.connect();
        const db = client.db(dbName);

        setupConnectionListeners(client, logger);

        cache.client = client;
        cache.db = db;
        logger.info?.(`[MongoDB] Connected successfully to database: ${dbName}`);
        return { client, db };
      } catch (err) {
        lastError = err;
        cache.client = null;
        cache.db = null;

        if (client) {
          try {
            await client.close();
          } catch {
            // Ignore close error during failed attempt
          }
        }

        if (attempt < retries) {
          const expDelay = Math.min(initialBackoffMs * 2 ** (attempt - 1), maxBackoffMs);
          const delay = useJitter ? Math.floor(Math.random() * expDelay) + 50 : expDelay;
          logger.warn?.(
            `[MongoDB] Attempt ${attempt}/${retries} failed: ${(err as Error)?.message || String(err)}. Retrying in ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
        } else {
          logger.error?.(
            `[MongoDB] Connection failed after ${retries} attempts: ${(err as Error)?.message || String(err)}`,
          );
        }
      }
    }

    cache.promise = null;
    throw new DatabaseConnectionError(
      `Failed to connect to MongoDB after ${retries} attempts. Cause: ${(lastError as Error)?.message || String(lastError)}`,
      { cause: lastError, attempts: retries, uri: maskMongoUri(targetUri) },
    );
  })();

  try {
    return await cache.promise;
  } catch (error) {
    cache.promise = null;
    cache.client = null;
    cache.db = null;
    throw error;
  }
}

// Alias for skill compatibility
export const connectDB = connectToDatabase;

// ─── Synchronous Getters ─────────────────────────────────────────────

export function getDatabase(): Db {
  const cache = getCache();
  if (!cache.db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return cache.db;
}

export function getClient(): MongoClient {
  const cache = getCache();
  if (!cache.client) {
    throw new Error('Database client not initialized. Call connectToDatabase() first.');
  }
  return cache.client;
}

// ─── Health Check ────────────────────────────────────────────────────

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const cache = getCache();
  if (
    !cache.client ||
    !cache.db ||
    (cache.client as unknown as { s?: { hasBeenClosed?: boolean } }).s?.hasBeenClosed
  ) {
    return { ok: false, status: 'disconnected' };
  }

  try {
    const start = Date.now();
    await cache.db.command({ ping: 1 });
    return {
      ok: true,
      status: 'connected',
      pingLatencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      status: 'disconnected',
      error: (err as Error)?.message || String(err),
    };
  }
}

// ─── Disconnect ──────────────────────────────────────────────────────

export async function closeDatabaseConnection(): Promise<void> {
  const cache = getCache();
  try {
    if (cache.client) {
      await cache.client.close();
    }
  } finally {
    cache.client = null;
    cache.db = null;
    cache.promise = null;
  }
}

// Alias for skill compatibility
export const disconnectDB = closeDatabaseConnection;

// ─── Test Helper ─────────────────────────────────────────────────────

export function _resetConnectionCacheForTesting(): void {
  const cache = getCache();
  cache.client = null;
  cache.db = null;
  cache.promise = null;
}
