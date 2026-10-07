export {
  openDatabase,
  closeDatabase,
  initializeDatabase,
  insertUserProfile,
  getUserProfileById,
  getUserProfileByEmail,
  getAllUserProfiles,
  updateUserProfile,
  deleteUserProfile,
  deleteAllUserProfiles,
  countUserProfiles,
  runInTransaction,
  isDatabaseOpen,
  getDatabaseInstance,
  DatabaseError,
} from './Database';

export type { UserProfile, UserProfileRecord } from './Database';

export { DatabaseProvider, useDatabase } from './DatabaseProvider';