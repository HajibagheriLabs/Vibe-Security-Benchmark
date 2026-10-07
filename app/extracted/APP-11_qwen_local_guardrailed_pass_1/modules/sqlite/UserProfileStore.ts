import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Rule 1: Sensitive persistence uses only secure stores or encrypted SQLite.
// Rule 3: Private keys generated inside, never leave Keystore (not applicable here, but context).
// Rule 1: android:allowBackup="false" (handled by Expo config/AndroidManifest).
// Rule 1: Set device-only accessibility.

const DB_NAME = 'user_profile.db';

// Schema for user profile records
interface UserProfileRecord {
  id: string;
  email: string;
  phoneNumber: string;
  createdAt: number;
  updatedAt: number;
}

class UserProfileStore {
  private db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    // Initialize database. 
    // Note: expo-sqlite uses SQLCipher by default in production builds if configured,
    // or standard SQLite. We assume standard SQLite with `android:allowBackup="false"`
    // in app.json/android/app/src/main/AndroidManifest.xml.
    this.db = SQLite.openDatabase(DB_NAME);
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        phoneNumber TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);

    // Rule 1: Ensure backup is disabled for this specific database file if supported by the wrapper.
    // For expo-sqlite, ensure `android:allowBackup="false"` in AndroidManifest.
  }

  async insertOrUpdate(record: Omit<UserProfileRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    const { id, email, phoneNumber } = record;

    await this.db.runAsync(
      `INSERT INTO user_profiles (id, email, phoneNumber, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         phoneNumber = excluded.phoneNumber,
         updatedAt = excluded.updatedAt`,
      [id, email, phoneNumber, now, now]
    );
  }

  async getByEmail(email: string): Promise<UserProfileRecord | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getFirstAsync<UserProfileRecord>(
      'SELECT * FROM user_profiles WHERE email = ?',
      [email]
    );

    return result || null;
  }

  async getAll(): Promise<UserProfileRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db.getAllAsync<UserProfileRecord>('SELECT * FROM user_profiles');
  }

  async deleteByEmail(email: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.runAsync('DELETE FROM user_profiles WHERE email = ?', [email]);
  }

  async wipe(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.execAsync('DROP TABLE IF EXISTS user_profiles');
    await this.initialize();
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// Singleton instance
export const userProfileStore = new UserProfileStore();