// lib/db/server.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    // @ts-expect-error - accessing internal client for cleanup
    dbInstance.$client?.end?.();
    dbInstance = null;
  }
}