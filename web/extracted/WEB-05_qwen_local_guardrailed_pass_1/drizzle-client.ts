// drizzle-client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Flag: Secret `DATABASE_URL` is server-only, never prefixed with NEXT_PUBLIC_
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });