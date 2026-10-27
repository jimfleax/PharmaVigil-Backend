/**
 * @file db-connection.test.ts
 * @description Reference test suite verifying connection caching, single-flight coalescing,
 * 3-retry jittered backoff, credential masking, fail-fast validation, and lifecycle teardown.
 */

import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';
import { MongoClient } from 'mongodb';
import {
  connectDB,
  connectToDatabase,
  disconnectDB,
  checkDatabaseHealth,
  maskMongoUri,
  DatabaseConnectionError,
  _resetConnectionCacheForTesting,
  getDatabase,
  getClient,
} from '../../src/config/db.js';
import { env } from '../../src/config/env.js';

describe('Robust Database Connection & Caching Suite', () => {
  const testMongoUri = env.EFFECTIVE_MONGODB_URI;

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await disconnectDB();
  });

  describe('URI Validation (Fail-Fast)', () => {
    it('should throw DatabaseConnectionError immediately without retries on missing URI', async () => {
      const origEnv = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;

      const connectSpy = vi.spyOn(MongoClient.prototype, 'connect');

      await expect(connectDB('')).rejects.toThrow(DatabaseConnectionError);
      await expect(connectDB('   ')).rejects.toThrow(DatabaseConnectionError);

      // Asserts 0 connection attempts were wasted
      expect(connectSpy).not.toHaveBeenCalled();
      process.env.MONGODB_URI = origEnv;
    });

    it('should specify attempts: 0 when URI is empty', async () => {
      try {
        await connectDB('');
        expect.unreachable('Should have thrown DatabaseConnectionError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(DatabaseConnectionError);
        expect((err as DatabaseConnectionError).attempts).toBe(0);
      }
    });
  });

  describe('Connection Caching & Concurrency', () => {
    it('should establish a connection and provide active db and client', async () => {
      const result = await connectDB(testMongoUri);
      expect(result.client).toBeInstanceOf(MongoClient);
      expect(result.db).toBeDefined();

      const db = getDatabase();
      const client = getClient();
      expect(db).toBe(result.db);
      expect(client).toBe(result.client);

      const health = await checkDatabaseHealth();
      expect(health.ok).toBe(true);
      expect(health.status).toBe('connected');
      expect(typeof health.pingLatencyMs).toBe('number');
    });

    it('should reuse the existing connection across multiple requests without reconnecting', async () => {
      await connectDB(testMongoUri);

      const connectSpy = vi.spyOn(MongoClient.prototype, 'connect');

      const inst1 = await connectDB(testMongoUri);
      const inst2 = await connectDB(testMongoUri);
      const inst3 = await connectToDatabase();

      expect(inst1.client).toBe(inst2.client);
      expect(inst2.client).toBe(inst3.client);

      // Verify no extra connection handshakes were made
      expect(connectSpy).not.toHaveBeenCalled();
    });

    it('should coalesce concurrent cold-start connection requests to the same in-flight Promise', async () => {
      let callCount = 0;
      const originalConnect = MongoClient.prototype.connect;
      vi.spyOn(MongoClient.prototype, 'connect').mockImplementation(async function (
        this: MongoClient,
      ) {
        callCount++;
        await new Promise((r) => setTimeout(r, 40));
        return originalConnect.call(this);
      });

      // 5 concurrent requests hit the cold container simultaneously
      const results = await Promise.all([
        connectDB(testMongoUri),
        connectDB(testMongoUri),
        connectDB(testMongoUri),
        connectDB(testMongoUri),
        connectDB(testMongoUri),
      ]);

      const firstClient = results[0]?.client;
      results.forEach((res) => expect(res.client).toBe(firstClient));
      // Only 1 connect call made despite 5 concurrent requests
      expect(callCount).toBe(1);
    });
  });

  describe('3-Retry Jittered Mechanism', () => {
    it('should retry transient failures and recover on attempt 3', async () => {
      let attempts = 0;
      const originalConnect = MongoClient.prototype.connect;
      const warnings: string[] = [];

      vi.spyOn(MongoClient.prototype, 'connect').mockImplementation(async function (
        this: MongoClient,
      ) {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Transient drop attempt ${attempts}`);
        }
        return originalConnect.call(this);
      });

      const instance = await connectDB(testMongoUri, {
        retries: 3,
        initialBackoffMs: 10,
        maxBackoffMs: 30,
        jitter: false, // deterministic for test
        logger: {
          info: vi.fn(),
          warn: (msg: string) => warnings.push(msg),
          error: vi.fn(),
        },
      });

      expect(instance.client).toBeInstanceOf(MongoClient);
      expect(attempts).toBe(3);
      expect(warnings.length).toBe(2);
      expect(warnings[0]).toContain('Attempt 1/3 failed');
      expect(warnings[1]).toContain('Attempt 2/3 failed');
    });

    it('should throw DatabaseConnectionError after 3 failed attempts and clear cache', async () => {
      vi.spyOn(MongoClient.prototype, 'connect').mockImplementation(async () => {
        throw new Error('Cluster unavailable');
      });

      await expect(
        connectDB(testMongoUri, {
          retries: 3,
          initialBackoffMs: 5,
          maxBackoffMs: 15,
          jitter: false,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        }),
      ).rejects.toThrow(DatabaseConnectionError);

      // Verify that after failure, the cache is clear and throws uninitialized
      expect(() => getDatabase()).toThrow('Database not initialized');
    });
  });

  describe('Security: Credential Masking', () => {
    it('should mask passwords in MongoDB connection strings', () => {
      const masked = maskMongoUri(
        'mongodb://app_user:p%40ssw0rd123@cluster0.mongodb.net:27017/prod',
      );
      expect(masked).toBe('mongodb://app_user:****@cluster0.mongodb.net:27017/prod');
      expect(masked).not.toContain('p%40ssw0rd123');
    });

    it('should redact credentials inside DatabaseConnectionError properties', async () => {
      vi.spyOn(MongoClient.prototype, 'connect').mockImplementation(async () => {
        throw new Error('Connection failed');
      });

      try {
        await connectDB('mongodb://secretAdmin:verySecret@localhost:27017/test', {
          retries: 1,
          initialBackoffMs: 5,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(DatabaseConnectionError);
        const dbErr = err as DatabaseConnectionError;
        expect(dbErr.sanitizedUri).toBe('mongodb://secretAdmin:****@localhost:27017/test');
        expect(dbErr.sanitizedUri).not.toContain('verySecret');
        expect(dbErr.attempts).toBe(1);
      }
    });
  });

  describe('Lifecycle Teardown & Reconnect', () => {
    it('should disconnect cleanly and update health status', async () => {
      await connectDB(testMongoUri);
      expect((await checkDatabaseHealth()).ok).toBe(true);

      await disconnectDB();

      const health = await checkDatabaseHealth();
      expect(health.ok).toBe(false);
      expect(health.status).toBe('disconnected');
    });

    it('should automatically invalidate cache when connection is closed', async () => {
      const res = await connectDB(testMongoUri);
      await res.client.close();

      const connectSpy = vi.spyOn(MongoClient.prototype, 'connect');
      await connectDB(testMongoUri);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should reset connection cache using _resetConnectionCacheForTesting helper', async () => {
      await connectDB(testMongoUri);
      _resetConnectionCacheForTesting();
      expect(() => getDatabase()).toThrow('Database not initialized');
    });
  });
});
