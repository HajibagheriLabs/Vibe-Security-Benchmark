// src/storage/profileDb.test.ts
/**
 * Negative tests for the profile database module.
 * These verify that PII is never written in plaintext.
 */
import {
  openProfileDatabase,
  upsertUserProfile,
  getUserProfile,
  wipeProfileDatabase,
} from './profileDb';
import SQLite from 'react-native-sqlite-storage';

describe('ProfileDatabase security', () => {
  beforeEach(async () => {
    await wipeProfileDatabase();
  });

  it('stores email and phone encrypted, not plaintext', async () => {
    await upsertUserProfile({
      userUuid: 'test-uuid-1',
      displayName: 'Test User',
      email: 'test@example.com',
      phone: '+15551234567',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const db = await openProfileDatabase();
    const [result] = await db.executeSql(
      'SELECT email_encrypted, phone_encrypted FROM user_profiles WHERE user_uuid = ?',
      ['test-uuid-1'],
    );

    const row = result.rows.item(0);
    expect(row.email_encrypted).not.toContain('test@example.com');
    expect(row.phone_encrypted).not.toContain('+15551234567');
    expect(row.email_encrypted).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    expect(row.phone_encrypted).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
  });

  it('round-trips encrypted PII correctly', async () => {
    const email = 'roundtrip@example.com';
    const phone = '+15559876543';

    await upsertUserProfile({
      userUuid: 'test-uuid-2',
      displayName: 'Round Trip',
      email,
      phone,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const profile = await getUserProfile('test-uuid-2');
    expect(profile).not.toBeNull();
    expect(profile!.email).toBe(email);
    expect(profile!.phone).toBe(phone);
  });

  it('rejects corrupted encrypted data', async () => {
    const db = await openProfileDatabase();
    await db.executeSql(
      `INSERT INTO user_profiles
         (user_uuid, display_name, email_encrypted, phone_encrypted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['corrupt-uuid', 'Corrupt', 'not-valid-format', 'also-invalid', Date.now(), Date.now()],
    );

    await expect(getUserProfile('corrupt-uuid')).rejects.toThrow();
  });
});