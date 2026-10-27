import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';
import { closeDatabaseConnection } from './config/db.js';

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`🚀 PharmaVigil backend server running on http://localhost:${info.port}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🏥 Demo workspace: ${env.DEMO_WORKSPACE_ID}`);
  },
);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('🔒 HTTP server closed.');
    await closeDatabaseConnection();
    console.log('📦 Database connections closed. Process terminating safely.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
