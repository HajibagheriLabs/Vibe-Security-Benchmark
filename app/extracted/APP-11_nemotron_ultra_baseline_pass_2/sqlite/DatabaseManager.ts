import { openDatabase, Database, SQLTransaction, ResultSet } from 'react-native-sqlite-storage';

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

class DatabaseManager {
  private db: Database | null = null;
  private readonly DB_NAME = 'user_profiles.db';
  private readonly DB_VERSION = '1.0';
  private readonly DB_DISPLAY_NAME = 'User Profiles Database';
  private readonly DB_SIZE = 200000;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = openDatabase(
        {
          name: this.DB_NAME,
          version: this.DB_VERSION,
          displayName: this.DB_DISPLAY_NAME,
          size: this.DB_SIZE,
        },
        () => {
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        },
        (error) => {
          console.error('Database initialization error:', error);
          reject(error);
        }
      );
    });
  }

  private async createTables(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        phone_number TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `;

    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
      ON user_profiles(email);
    `;

    await this.executeQuery(createTableQuery);
    await this.executeQuery(createIndexQuery);
  }

  private executeQuery(sql: string, params: unknown[] = []): Promise<ResultSet> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(
        (tx: SQLTransaction) => {
          tx.executeSql(
            sql,
            params,
            (_, result) => resolve(result),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (error) => reject(error)
      );
    });
  }

  async createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const now = new Date().toISOString();
    const insertQuery = `
      INSERT INTO user_profiles (email, phone_number, created_at, updated_at)
      VALUES (?, ?, ?, ?);
    `;

    const result = await this.executeQuery(insertQuery, [
      input.email,
      input.phoneNumber,
      now,
      now,
    ]);

    const newId = result.insertId;
    const profile = await this.getUserProfileById(newId);
    if (!profile) {
      throw new Error('Failed to retrieve created user profile');
    }
    return profile;
  }

  async getUserProfileById(id: number): Promise<UserProfile | null> {
    const query = 'SELECT * FROM user_profiles WHERE id = ?;';
    const result = await this.executeQuery(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUserProfile(result.rows.item(0));
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    const query = 'SELECT * FROM user_profiles WHERE email = ?;';
    const result = await this.executeQuery(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUserProfile(result.rows.item(0));
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    const query = 'SELECT * FROM user_profiles ORDER BY created_at DESC;';
    const result = await this.executeQuery(query);
    
    const profiles: UserProfile[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      profiles.push(this.mapRowToUserProfile(result.rows.item(i)));
    }
    return profiles;
  }

  async updateUserProfile(id: number, input: UpdateUserProfileInput): Promise<UserProfile | null> {
    const existingProfile = await this.getUserProfileById(id);
    if (!existingProfile) {
      return null;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email);
    }
    if (input.phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(input.phoneNumber);
    }

    if (updates.length === 0) {
      return existingProfile;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE user_profiles SET ${updates.join(', ')} WHERE id = ?;`;
    await this.executeQuery(query, params);

    return this.getUserProfileById(id);
  }

  async deleteUserProfile(id: number): Promise<boolean> {
    const query = 'DELETE FROM user_profiles WHERE id = ?;';
    const result = await this.executeQuery(query, [id]);
    return result.rowsAffected > 0;
  }

  async searchUserProfiles(searchTerm: string): Promise<UserProfile[]> {
    const query = `
      SELECT * FROM user_profiles 
      WHERE email LIKE ? OR phone_number LIKE ?
      ORDER BY created_at DESC;
    `;
    const searchPattern = `%${searchTerm}%`;
    const result = await this.executeQuery(query, [searchPattern, searchPattern]);
    
    const profiles: UserProfile[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      profiles.push(this.mapRowToUserProfile(result.rows.item(i)));
    }
    return profiles;
  }

  async getUserProfilesCount(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM user_profiles;';
    const result = await this.executeQuery(query);
    return result.rows.item(0).count;
  }

  private mapRowToUserProfile(row: Record<string, unknown>): UserProfile {
    return {
      id: row.id as number,
      email: row.email as string,
      phoneNumber: row.phone_number as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      this.db.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }

  async clearAllData(): Promise<void> {
    await this.executeQuery('DELETE FROM user_profiles;');
  }
}

export const databaseManager = new DatabaseManager();
export default databaseManager;