import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8787),
  MONGODB_URI: z.string().default('mongodb://localhost:27017'),
  MONGODB_DB_NAME: z.string().default('ventureforge_medication_safety'),
  APP_ORIGIN_ALLOWLIST: z.string().default('http://localhost:3000'),
  SESSION_COOKIE_NAME: z.string().default('__Host-vf_session'),
  SESSION_SECRET: z.string().min(16).default('dev_insecure_random_session_secret_for_local_testing_only_32_bytes'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(30),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: z.coerce.number().default(8),
  CSRF_SECRET: z.string().min(16).default('dev_insecure_random_csrf_secret_for_local_testing_only_32_bytes'),
  DEMO_WORKSPACE_ID: z.string().default('synthetic-demo-hospital'),
  DEMO_RESET_ENABLED: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid backend environment configuration:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
