import * as SQLite from 'expo-sqlite';

export interface UserProfile {
  id: number;
  email: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProfileInput {
  email: string;
  phoneNumber: string;
}

export interface UpdateUserProfileInput {
  email?: string;
  phoneNumber?: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'user_profiles.db';
  private readonly TABLE_NAME = 'user_profiles';

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        phone_number TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON ${this.TABLE_NAME}(email);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON ${this.TABLE_NAME}(phone_number);
    `);
  }

  async createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      `INSERT INTO ${this.TABLE_NAME} (email, phone_number, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [input.email, input.phoneNumber, now, now]
    );

    const newProfile = await this.getUserProfileById(result.lastInsertRowId);
    if (!newProfile) throw new Error('Failed to create user profile');
    return newProfile;
  }

  async getUserProfileById(id: number): Promise<UserProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<{
      id: number;
      email: string;
      phone_number: string;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM ${this.TABLE_NAME} WHERE id = ?`, [id]);

    return row ? this.mapRowToProfile(row) : null;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<{
      id: number;
      email: string;
      phone_number: string;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM ${this.TABLE_NAME} WHERE email = ?`, [email]);

    return row ? this.mapRowToProfile(row) : null;
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{
      id: number;
      email: string;
      phone_number: string;
      created_at: string;
      updated_at: string;
    }>(`SELECT * FROM ${this.TABLE_NAME} ORDER BY created_at DESC`);

    return rows.map(this.mapRowToProfile);
  }

  async updateUserProfile(id: number, input: UpdateUserProfileInput): Promise<UserProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email);
    }
    if (input.phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(input.phoneNumber);
    }

    if (updates.length === 0) return this.getUserProfileById(id);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await this.db.runAsync(
      `UPDATE ${this.TABLE_NAME} SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getUserProfileById(id);
  }

  async deleteUserProfile(id: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `DELETE FROM ${this.TABLE_NAME} WHERE id = ?`,
      [id]
    );

    return result.changes > 0;
  }

  async searchUserProfiles(query: string): Promise<UserProfile[]> {
    if (!this.db) throw new Error('Database not initialized');

    const searchTerm = `%${query}%`;
    const rows = await this.db.getAllAsync<{
      id: number;
      email: string;
      phone_number: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT * FROM ${this.TABLE_NAME} WHERE email LIKE ? OR phone_number LIKE ? ORDER BY created_at DESC`,
      [searchTerm, searchTerm]
    );

    return rows.map(this.mapRowToProfile);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  private mapRowToProfile(row: {
    id: number;
    email: string;
    phone_number: string;
    created_at: string;
    updated_at: string;
  }): UserProfile {
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const databaseService = new DatabaseService();