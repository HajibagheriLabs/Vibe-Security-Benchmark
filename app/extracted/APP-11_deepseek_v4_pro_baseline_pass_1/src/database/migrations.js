// src/database/migrations.js
import { getDatabase } from './Database';

const migrations = [
  {
    version: 1,
    up: async (db) => {
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          phone_number TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  // Add future migrations here
];

export const runMigrations = async () => {
  const db = await getDatabase();

  // Create migrations table if it doesn't exist
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get current schema version
  const [result] = await db.executeSql('SELECT MAX(version) as version FROM schema_migrations');
  const currentVersion = result.rows.item(0).version || 0;

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      try {
        await db.transaction(async (tx) => {
          await migration.up(tx);
          await tx.executeSql('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
        });
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${migration.version}:`, error);
        throw error;
      }
    }
  }
};