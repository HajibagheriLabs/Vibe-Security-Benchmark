// src/database/Database.js
import SQLite from 'react-native-sqlite-storage';

// Enable promises
SQLite.enablePromise(true);

let db = null;

export const getDatabase = async () => {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabase({
      name: 'UserProfiles.db',
      location: 'default',
      createFromLocation: '~UserProfiles.db',
    });
    console.log('Database opened successfully');
    return db;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
};

export const closeDatabase = async () => {
  if (db) {
    await db.close();
    db = null;
    console.log('Database closed');
  }
};