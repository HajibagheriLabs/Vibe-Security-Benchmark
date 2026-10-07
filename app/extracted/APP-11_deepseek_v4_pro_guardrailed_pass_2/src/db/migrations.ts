import { getDatabase } from './database';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS secure_fields (
    profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email_ciphertext BLOB,
    email_iv BLOB,
    email_auth_tag BLOB,
    phone_ciphertext BLOB,
    phone_iv BLOB,
    phone_auth_tag BLOB,
    key_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_profiles_uuid ON profiles(uuid);
`;

export async function runMigrations(): Promise<void> {
  const db = await getDatabase();
  await db.executeSql(SCHEMA_SQL);
}