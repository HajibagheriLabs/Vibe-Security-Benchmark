import { databaseManager } from '../DatabaseManager';

describe('DatabaseManager', () => {
  beforeAll(async () => {
    await databaseManager.initialize();
  });

  afterAll(async () => {
    await databaseManager.close();
  });

  beforeEach(async () => {
    await databaseManager.clearAllData();
  });

  describe('createUserProfile', () => {
    it('should create a new user profile', async () => {
      const input = {
        email: 'test@example.com',
        phoneNumber: '+1234567890',
      };

      const profile = await databaseManager.createUserProfile(input);

      expect(profile.id).toBeDefined();
      expect(profile.email).toBe(input.email);
      expect(profile.phoneNumber).toBe(input.phoneNumber);
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const input = {
        email: 'duplicate@example.com',
        phoneNumber: '+1234567890',
      };

      await databaseManager.createUserProfile(input);
      
      await expect(databaseManager.createUserProfile(input)).rejects.toThrow();
    });
  });

  describe('getUserProfileById', () => {
    it('should return profile by id', async () => {
      const created = await databaseManager.createUserProfile({
        email: 'getbyid@example.com',
        phoneNumber: '+1234567890',
      });

      const profile = await databaseManager.getUserProfileById(created.id);

      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(created.id);
      expect(profile?.email).toBe(created.email);
    });

    it('should return null for non-existent id', async () => {
      const profile = await databaseManager.getUserProfileById(99999);
      expect(profile).toBeNull();
    });
  });

  describe('getUserProfileByEmail', () => {
    it('should return profile by email', async () => {
      const created = await databaseManager.createUserProfile({
        email: 'getbyemail@example.com',
        phoneNumber: '+1234567890',
      });

      const profile = await databaseManager.getUserProfileByEmail(created.email);

      expect(profile).not.toBeNull();
      expect(profile?.email).toBe(created.email);
    });

    it('should return null for non-existent email', async () => {
      const profile = await databaseManager.getUserProfileByEmail('nonexistent@example.com');
      expect(profile).toBeNull();
    });
  });

  describe('getAllUserProfiles', () => {
    it('should return all profiles ordered by created_at desc', async () => {
      await databaseManager.createUserProfile({
        email: 'first@example.com',
        phoneNumber: '+1111111111',
      });
      await databaseManager.createUserProfile({
        email: 'second@example.com',
        phoneNumber: '+2222222222',
      });
      await databaseManager.createUserProfile({
        email: 'third@example.com',
        phoneNumber: '+3333333333',
      });

      const profiles = await databaseManager.getAllUserProfiles();

      expect(profiles).toHaveLength(3);
      expect(profiles[0].email).toBe('third@example.com');
      expect(profiles[1].email).toBe('second@example.com');
      expect(profiles[2].email).toBe('first@example.com');
    });

    it('should return empty array when no profiles', async () => {
      const profiles = await databaseManager.getAllUserProfiles();
      expect(profiles).toEqual([]);
    });
  });

  describe('updateUserProfile', () => {
    it('should update email', async () => {
      const created = await databaseManager.createUserProfile({
        email: 'update@example.com',
        phoneNumber: '+1234567890',
      });

      const updated = await databaseManager.updateUserProfile(created.id, {
        email: 'updated@example.com',
      });

      expect(updated).not.toBeNull();
      expect(updated?.email).toBe('updated@example.com');
      expect(updated?.phoneNumber).toBe(created.phoneNumber);
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it('should update phone number', async () => {
      const created = await databaseManager.createUserProfile({
        email: 'updatephone@example.com',
        phoneNumber: '+1234567890',
      });

      const updated = await databaseManager.updateUserProfile(created.id, {
        phoneNumber: '+0987654321',
      });

      expect(updated).not.toBeNull();
      expect(updated?.phoneNumber).toBe('+0987654321');
    });

    it('should return null for non-existent id', async () => {
      const updated = await databaseManager.updateUserProfile(99999, {
        email: 'test@example.com',
      });
      expect(updated).toBeNull();
    });
  });

  describe('deleteUserProfile', () => {
    it('should delete profile and return true', async () => {
      const created = await databaseManager.createUserProfile({
        email: 'delete@example.com',
        phoneNumber: '+1234567890',
      });

      const result = await databaseManager.deleteUserProfile(created.id);

      expect(result).toBe(true);
      const profile = await databaseManager.getUserProfileById(created.id);
      expect(profile).toBeNull();
    });

    it('should return false for non-existent id', async () => {
      const result = await databaseManager.deleteUserProfile(99999);
      expect(result).toBe(false);
    });
  });

  describe('searchUserProfiles', () => {
    it('should search by email', async () => {
      await databaseManager.createUserProfile({
        email: 'searchable@example.com',
        phoneNumber: '+1111111111',
      });
      await databaseManager.createUserProfile({
        email: 'other@example.com',
        phoneNumber: '+2222222222',
      });

      const results = await databaseManager.searchUserProfiles('searchable');

      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('searchable@example.com');
    });

    it('should search by phone number', async () => {
      await databaseManager.createUserProfile({
        email: 'phone1@example.com',
        phoneNumber: '+1234567890',
      });
      await databaseManager.createUserProfile({
        email: 'phone2@example.com',
        phoneNumber: '+9876543210',
      });

      const results = await databaseManager.searchUserProfiles('123456');

      expect(results).toHaveLength(1);
      expect(results[0].phoneNumber).toBe('+1234567890');
    });
  });

  describe('getUserProfilesCount', () => {
    it('should return correct count', async () => {
      expect(await databaseManager.getUserProfilesCount()).toBe(0);
      
      await databaseManager.createUserProfile({
        email: 'count1@example.com',
        phoneNumber: '+1111111111',
      });
      expect(await databaseManager.getUserProfilesCount()).toBe(1);
      
      await databaseManager.createUserProfile({
        email: 'count2@example.com',
        phoneNumber: '+2222222222',
      });
      expect(await databaseManager.getUserProfilesCount()).toBe(2);
    });
  });
});