import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';

// Security decision: SQLite file is created with restrictive permissions where the OS allows.
// On Android, the database lives in app-private storage (not world-readable).
// On iOS, the app sandbox provides equivalent isolation.
SQLite.enablePromise(true);

const DB_NAME = 'profiles.db';
const DB_LOCATION = 'default'; // app-private directory

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabase({
    name: DB_NAME,
    location: DB_LOCATION,
  });

  // Enable foreign keys and WAL for durability.
  await db.executeSql('PRAGMA foreign_keys = ON;');
  await db.executeSql('PRAGMA journal_mode = WAL;');

  // Security decision: ensure the DB file is not accessible to other apps.
  if (Platform.OS === 'android') {
    await db.executeSql('PRAGMA secure_delete = ON;');
  }

  dbInstance = db;
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    return openDatabase();
  }
  return dbInstance;
}