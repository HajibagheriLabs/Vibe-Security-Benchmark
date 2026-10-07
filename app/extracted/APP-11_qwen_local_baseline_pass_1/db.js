// @filename: db.js
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'user_profile.db';

let db = null;

export const getDatabase = async () => {
  if (db) {
    return db;
  }
  
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeDatabase();
    return db;
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
};

export const initializeDatabase = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL
      );
    `);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const insertUserProfile = async (email, phoneNumber) => {
  const database = await getDatabase();
  try {
    await database.runAsync(
      'INSERT INTO user_profiles (email, phone_number) VALUES (?, ?)',
      [email, phoneNumber]
    );
  } catch (error) {
    console.error('Failed to insert user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (email) => {
  const database = await getDatabase();
  try {
    const result = await database.getFirstAsync(
      'SELECT * FROM user_profiles WHERE email = ?',
      [email]
    );
    return result;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};

export const getAllUserProfiles = async () => {
  const database = await getDatabase();
  try {
    const results = await database.getAllAsync('SELECT * FROM user_profiles');
    return results;
  } catch (error) {
    console.error('Failed to get all user profiles:', error);
    throw error;
  }
};

export const updateUserProfile = async (email, phoneNumber) => {
  const database = await getDatabase();
  try {
    await database.runAsync(
      'UPDATE user_profiles SET phone_number = ? WHERE email = ?',
      [phoneNumber, email]
    );
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
};

export const deleteUserProfile = async (email) => {
  const database = await getDatabase();
  try {
    await database.runAsync(
      'DELETE FROM user_profiles WHERE email = ?',
      [email]
    );
  } catch (error) {
    console.error('Failed to delete user profile:', error);
    throw error;
  }
};