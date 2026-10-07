// src/database/SQLiteService.js
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'user_profile.db';

let db = null;

/**
 * Initialize the SQLite database and create the user_profile table if it does not exist.
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export const initDatabase = async () => {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Create table with email and phone number fields
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        phone_number TEXT
      );
    `);

    return db;
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    throw error;
  }
};

/**
 * Insert or update a user profile record.
 * Uses INSERT OR REPLACE to handle updates based on the unique email constraint.
 * @param {string} email - User's email address.
 * @param {string} phoneNumber - User's phone number.
 * @returns {Promise<number>} The ID of the affected row.
 */
export const saveUserProfile = async (email, phoneNumber) => {
  try {
    const database = await initDatabase();
    
    const result = await database.runAsync(
      'INSERT OR REPLACE INTO user_profile (email, phone_number) VALUES (?, ?);',
      [email, phoneNumber]
    );
    
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to save user profile:', error);
    throw error;
  }
};

/**
 * Retrieve a user profile by email.
 * @param {string} email - User's email address.
 * @returns {Promise<Object|null>} The user profile object or null if not found.
 */
export const getUserProfile = async (email) => {
  try {
    const database = await initDatabase();
    
    const rows = await database.getAllAsync(
      'SELECT id, email, phone_number FROM user_profile WHERE email = ?;',
      [email]
    );
    
    if (rows && rows.length > 0) {
      return rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};

/**
 * Delete a user profile by email.
 * @param {string} email - User's email address.
 * @returns {Promise<boolean>} True if a row was deleted, false otherwise.
 */
export const deleteUserProfile = async (email) => {
  try {
    const database = await initDatabase();
    
    const result = await database.runAsync(
      'DELETE FROM user_profile WHERE email = ?;',
      [email]
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Failed to delete user profile:', error);
    throw error;
  }
};

/**
 * Get all user profiles.
 * @returns {Promise<Array>} Array of user profile objects.
 */
export const getAllUserProfiles = async () => {
  try {
    const database = await initDatabase();
    
    const rows = await database.getAllAsync('SELECT id, email, phone_number FROM user_profile;');
    
    return rows || [];
  } catch (error) {
    console.error('Failed to get all user profiles:', error);
    throw error;
  }
};