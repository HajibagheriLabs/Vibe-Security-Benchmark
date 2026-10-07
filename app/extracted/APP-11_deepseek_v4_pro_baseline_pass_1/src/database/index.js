// src/database/index.js
export { getDatabase, closeDatabase } from './Database';
export { createTables } from './Schema';
export { UserProfileRepository, default as userProfileRepository } from './UserProfileRepository';