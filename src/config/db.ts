import { MongoClient, type Db } from 'mongodb';
import { env } from './env.js';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (client && dbInstance) {
    return { client, db: dbInstance };
  }

  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  dbInstance = client.db(env.MONGODB_DB_NAME);

  return { client, db: dbInstance };
}

export function getDatabase(): Db {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return dbInstance;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
  }
}
