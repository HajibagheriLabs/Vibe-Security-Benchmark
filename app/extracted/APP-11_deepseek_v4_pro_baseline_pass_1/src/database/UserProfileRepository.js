// src/database/UserProfileRepository.js
import { getDatabase } from './Database';
import { createTables } from './Schema';

export class UserProfileRepository {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    const db = await getDatabase();
    await createTables(db);
    this.initialized = true;
  }

  async createProfile(email, phoneNumber) {
    await this.initialize();
    const db = await getDatabase();

    const query = `
      INSERT INTO user_profiles (email, phone_number)
      VALUES (?, ?)
    `;

    try {
      const [result] = await db.executeSql(query, [email, phoneNumber]);
      return result.insertId;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async getProfileById(id) {
    await this.initialize();
    const db = await getDatabase();

    const query = `
      SELECT * FROM user_profiles WHERE id = ?
    `;

    try {
      const [result] = await db.executeSql(query, [id]);
      if (result.rows.length > 0) {
        return result.rows.item(0);
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile by ID:', error);
      throw error;
    }
  }

  async getProfileByEmail(email) {
    await this.initialize();
    const db = await getDatabase();

    const query = `
      SELECT * FROM user_profiles WHERE email = ?
    `;

    try {
      const [result] = await db.executeSql(query, [email]);
      if (result.rows.length > 0) {
        return result.rows.item(0);
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile by email:', error);
      throw error;
    }
  }

  async getAllProfiles() {
    await this.initialize();
    const db = await getDatabase();

    const query = `
      SELECT * FROM user_profiles ORDER BY created_at DESC
    `;

    try {
      const [result] = await db.executeSql(query);
      const profiles = [];
      for (let i = 0; i < result.rows.length; i++) {
        profiles.push(result.rows.item(i));
      }
      return profiles;
    } catch (error) {
      console.error('Error fetching all profiles:', error);
      throw error;
    }
  }

  async updateProfile(id, email, phoneNumber) {
    await this.initialize();
    const db = await getDatabase();

    const query = `
      UPDATE user_profiles
      SET email = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      const [result] = await db.executeSql(query, [email, phoneNumber, id]);
      return result.rowsAffected;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async deleteProfile(id) {
    await this.initialize();
    const db = await getDatabase();

    const query = `
      DELETE FROM user_profiles WHERE id = ?
    `;

    try {
      const [result] = await db.executeSql(query, [id]);
      return result.rowsAffected;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }
}

export default new UserProfileRepository();