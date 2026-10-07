import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export interface Database {
  users: {
    id: string;
    email: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    role: string;
    created_at: Date;
    updated_at: Date;
  };
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<Database>({ dialect });