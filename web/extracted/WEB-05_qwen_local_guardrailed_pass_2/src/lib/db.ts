import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './config';

// Flag: Secret boundary. DB credentials never reach client bundle.
// Scope: 'db:admin' (full read/write) or 'db:readonly' (select only) depending on deployment.

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool);