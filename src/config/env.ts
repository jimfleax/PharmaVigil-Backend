import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8787),

  // Dynamic MongoDB URL parts
  MONGODB_PROTOCOL: z.string().default('mongodb+srv'),
  MONGODB_USER: z.string().optional(),
  MONGODB_PASSWORD: z.string().optional(),
  MONGODB_HOST: z.string().optional(),
  MONGODB_DB_NAME: z.string().default('pharmavigil_test'),
  MONGODB_PARAMS: z.string().default('compressors=zlib&retryWrites=true&w=majority'),
  MONGODB_URI: z.string().optional(),

  APP_ORIGIN_ALLOWLIST: z.string().default('http://localhost:3000'),
  SESSION_COOKIE_NAME: z.string().default('__Host-vf_session'),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default('dev_insecure_random_session_secret_for_local_testing_only_32_bytes'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(30),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: z.coerce.number().default(8),
  CSRF_SECRET: z
    .string()
    .min(16)
    .default('dev_insecure_random_csrf_secret_for_local_testing_only_32_bytes'),
  DEMO_WORKSPACE_ID: z.string().default('synthetic-demo-hospital'),
  DEMO_RESET_ENABLED: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface EffectiveEnv extends RawEnv {
  EFFECTIVE_MONGODB_URI: string;
}

function resolveMongoUri(parsed: RawEnv): string {
  // If individual parts are specified, construct dynamically
  if (parsed.MONGODB_USER && parsed.MONGODB_PASSWORD && parsed.MONGODB_HOST) {
    const user = encodeURIComponent(parsed.MONGODB_USER);
    const pass = encodeURIComponent(parsed.MONGODB_PASSWORD);
    const params = parsed.MONGODB_PARAMS ? `?${parsed.MONGODB_PARAMS}` : '';
    return `${parsed.MONGODB_PROTOCOL}://${user}:${pass}@${parsed.MONGODB_HOST}/${parsed.MONGODB_DB_NAME}${params}`;
  }

  // If a full URI is supplied, inject or replace the database path with MONGODB_DB_NAME
  if (parsed.MONGODB_URI) {
    try {
      const url = new URL(parsed.MONGODB_URI);
      url.pathname = `/${parsed.MONGODB_DB_NAME}`;
      if (parsed.MONGODB_PARAMS) {
        const queryParams = new URLSearchParams(parsed.MONGODB_PARAMS);
        for (const [key, value] of queryParams.entries()) {
          url.searchParams.set(key, value);
        }
      }
      return url.toString();
    } catch {
      return parsed.MONGODB_URI;
    }
  }

  // Fallback to local default
  return `mongodb://localhost:27017/${parsed.MONGODB_DB_NAME}`;
}

function parseEnv(): EffectiveEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid backend environment configuration:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  const effectiveUri = resolveMongoUri(result.data);

  return {
    ...result.data,
    EFFECTIVE_MONGODB_URI: effectiveUri,
  };
}

export const env = parseEnv();
