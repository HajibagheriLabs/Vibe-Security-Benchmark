// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Security: Database credentials are server-side only, never exposed to the client.
// Required scope: Read-only access to analytics tables for the dashboard user.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

export const db = drizzle(pool, { schema });

export async function closeDbConnection() {
  await pool.end();
}