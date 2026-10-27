import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectToDatabase, closeDatabaseConnection } from './config/db.js';

// Pre-warm database connection pool before accepting incoming traffic
try {
  await connectToDatabase();
  console.log('✅ Connected to MongoDB connection pool successfully.');
} catch (error) {
  console.error('❌ Failed to establish initial database connection on server start:', error);
  process.exit(1);
}

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
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);

  // Forced exit fallback after 10s timeout
  const forceExitTimer = setTimeout(() => {
    console.error('⚠️ Forced exit: Graceful shutdown timed out after 10s.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close(async () => {
    console.log('🔒 HTTP server closed.');
    try {
      await closeDatabaseConnection();
      console.log('📦 Database connections closed. Process terminating safely.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error closing database connections:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
