import { openDatabase, closeDatabase } from './database';
import { runMigrations } from './migrations';

export * from './profileRepository';

/**
 * Initialize the offline profile database.
 * Call once at app startup.
 */
export async function initProfileDatabase(): Promise<void> {
  await openDatabase();
  await runMigrations();
}

export async function shutdownProfileDatabase(): Promise<void> {
  await closeDatabase();
}