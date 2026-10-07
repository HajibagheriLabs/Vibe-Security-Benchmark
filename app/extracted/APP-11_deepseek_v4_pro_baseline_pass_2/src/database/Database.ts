import { Platform } from 'react-native';
import SQLite, {
  SQLiteDatabase,
  Transaction,
  ResultSet,
} from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const DATABASE_NAME = 'user_profiles.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'User Profiles Database';
const DATABASE_SIZE = 200000; // ~200KB

let databaseInstance: SQLiteDatabase | null = null;

export interface UserProfile {
  id?: number;
  email: string;
  phoneNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileRecord {
  id: number;
  email: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Opens the SQLite database connection.
 * Creates the database if it does not exist.
 */
export async function openDatabase(): Promise<SQLiteDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  try {
    const db = await SQLite.openDatabase({
      name: DATABASE_NAME,
      location: 'default',
    });

    databaseInstance = db;
    return db;
  } catch (error) {
    throw new DatabaseError('Failed to open database', error);
  }
}

/**
 * Closes the database connection and resets the instance.
 */
export async function closeDatabase(): Promise<void> {
  if (!databaseInstance) {
    return;
  }

  try {
    await databaseInstance.close();
    databaseInstance = null;
  } catch (error) {
    throw new DatabaseError('Failed to close database', error);
  }
}

/**
 * Initializes the database schema by creating required tables.
 */
export async function initializeDatabase(): Promise<void> {
  const db = await openDatabase();

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
    ON user_profiles (email);
  `;

  try {
    await db.executeSql(createTableQuery);
    await db.executeSql(createIndexQuery);
  } catch (error) {
    throw new DatabaseError('Failed to initialize database schema', error);
  }
}

/**
 * Executes a SQL query and returns the result set.
 */
async function executeQuery(
  db: SQLiteDatabase,
  query: string,
  params: unknown[] = [],
): Promise<ResultSet> {
  try {
    const [result] = await db.executeSql(query, params);
    return result;
  } catch (error) {
    throw new DatabaseError(`Query failed: ${query}`, error);
  }
}

/**
 * Maps a raw database row to a UserProfile object.
 */
function mapRowToProfile(row: UserProfileRecord): UserProfile {
  return {
    id: row.id,
    email: row.email,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a UserProfile object to database column values.
 */
function mapProfileToRow(profile: UserProfile): {
  email: string;
  phone_number: string;
} {
  return {
    email: profile.email,
    phone_number: profile.phoneNumber,
  };
}

/**
 * Inserts a new user profile record.
 */
export async function insertUserProfile(
  profile: UserProfile,
): Promise<number> {
  const db = await openDatabase();

  const insertQuery = `
    INSERT INTO user_profiles (email, phone_number)
    VALUES (?, ?);
  `;

  const { email, phone_number } = mapProfileToRow(profile);

  try {
    const result = await executeQuery(db, insertQuery, [email, phone_number]);
    return result.insertId ?? -1;
  } catch (error) {
    if (
      error instanceof DatabaseError &&
      String(error.cause).includes('UNIQUE constraint failed')
    ) {
      throw new DatabaseError(
        `A profile with email "${profile.email}" already exists`,
        error,
      );
    }
    throw error;
  }
}

/**
 * Retrieves a user profile by its ID.
 */
export async function getUserProfileById(
  id: number,
): Promise<UserProfile | null> {
  const db = await openDatabase();

  const selectQuery = `
    SELECT id, email, phone_number, created_at, updated_at
    FROM user_profiles
    WHERE id = ?;
  `;

  const result = await executeQuery(db, selectQuery, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToProfile(result.rows.item(0) as UserProfileRecord);
}

/**
 * Retrieves a user profile by email address.
 */
export async function getUserProfileByEmail(
  email: string,
): Promise<UserProfile | null> {
  const db = await openDatabase();

  const selectQuery = `
    SELECT id, email, phone_number, created_at, updated_at
    FROM user_profiles
    WHERE email = ?;
  `;

  const result = await executeQuery(db, selectQuery, [email]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToProfile(result.rows.item(0) as UserProfileRecord);
}

/**
 * Retrieves all user profiles.
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const db = await openDatabase();

  const selectQuery = `
    SELECT id, email, phone_number, created_at, updated_at
    FROM user_profiles
    ORDER BY created_at DESC;
  `;

  const result = await executeQuery(db, selectQuery);

  const profiles: UserProfile[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    profiles.push(mapRowToProfile(result.rows.item(i) as UserProfileRecord));
  }

  return profiles;
}

/**
 * Updates an existing user profile.
 */
export async function updateUserProfile(
  id: number,
  updates: Partial<Pick<UserProfile, 'email' | 'phoneNumber'>>,
): Promise<boolean> {
  const db = await openDatabase();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }

  if (updates.phoneNumber !== undefined) {
    fields.push('phone_number = ?');
    values.push(updates.phoneNumber);
  }

  if (fields.length === 0) {
    return false;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const updateQuery = `
    UPDATE user_profiles
    SET ${fields.join(', ')}
    WHERE id = ?;
  `;

  const result = await executeQuery(db, updateQuery, values);
  return result.rowsAffected > 0;
}

/**
 * Deletes a user profile by its ID.
 */
export async function deleteUserProfile(id: number): Promise<boolean> {
  const db = await openDatabase();

  const deleteQuery = `
    DELETE FROM user_profiles
    WHERE id = ?;
  `;

  const result = await executeQuery(db, deleteQuery, [id]);
  return result.rowsAffected > 0;
}

/**
 * Deletes all user profiles.
 */
export async function deleteAllUserProfiles(): Promise<number> {
  const db = await openDatabase();

  const deleteQuery = `DELETE FROM user_profiles;`;

  const result = await executeQuery(db, deleteQuery);
  return result.rowsAffected;
}

/**
 * Counts the total number of user profiles.
 */
export async function countUserProfiles(): Promise<number> {
  const db = await openDatabase();

  const countQuery = `SELECT COUNT(*) as count FROM user_profiles;`;

  const result = await executeQuery(db, countQuery);

  if (result.rows.length === 0) {
    return 0;
  }

  return result.rows.item(0).count as number;
}

/**
 * Executes multiple operations within a single transaction.
 */
export async function runInTransaction<T>(
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    db.transaction(
      async (tx) => {
        try {
          const result = await callback(tx);
          resolve(result);
        } catch (error) {
          reject(new DatabaseError('Transaction failed', error));
        }
      },
      (error) => {
        reject(new DatabaseError('Transaction error', error));
      },
    );
  });
}

/**
 * Checks if the database connection is active.
 */
export function isDatabaseOpen(): boolean {
  return databaseInstance !== null;
}

/**
 * Gets the current database instance (for advanced use cases).
 */
export function getDatabaseInstance(): SQLiteDatabase | null {
  return databaseInstance;
}