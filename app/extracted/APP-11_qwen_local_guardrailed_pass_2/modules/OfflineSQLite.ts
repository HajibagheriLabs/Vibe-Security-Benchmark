// filename: modules/OfflineSQLite.ts
/**
 * Offline SQLite Database Module
 * 
 * Rule §1: SQLite is a cleartext store. Sensitive fields (email, phone) are stored 
 * as plain text. No tokens are persisted here.
 * Rule §5: react-native-sqlite-storage is pinned to a stable version.
 */

import SQLite from 'react-native-sqlite-storage';

// Initialize the database in the default location (sandboxed)
// Security: Device-only access by default in RN SQLite implementation.
const db = SQLite.openDatabase({
  name: 'user_profile.db',
  location: 'default',
});

// Schema Versioning
const DB_VERSION = 1;
const DB_NAME = 'user_profile.db';

// Initialize table if it doesn't exist
// Security: UNIQUE constraint on email prevents duplicate accounts.
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          phone_number TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        [],
        () => resolve(),
        (_, error) => reject(error)
      );
    });
  });
};

// Insert a new user profile
// Security: Phone number is stored as TEXT. Consider masking in UI.
export const insertUserProfile = (
  email: string,
  phoneNumber: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO user_profiles (email, phone_number) VALUES (?, ?);',
        [email, phoneNumber],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

// Get user profile by email
// Security: Returns raw data. Caller should verify against session identity if used for auth.
export const getUserProfileByEmail = (email: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM user_profiles WHERE email = ?;',
        [email],
        (_, result) => {
          if (result.rows.length > 0) {
            resolve(result.rows.item(0));
          } else {
            resolve(null);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Update user profile
export const updateUserProfile = (
  id: number,
  email: string,
  phoneNumber: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE user_profiles SET email = ?, phone_number = ? WHERE id = ?;',
        [email, phoneNumber, id],
        () => resolve(),
        (_, error) => reject(error)
      );
    });
  });
};

// Delete user profile
export const deleteUserProfile = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM user_profiles WHERE id = ?;',
        [id],
        () => resolve(),
        (_, error) => reject(error)
      );
    });
  });
};