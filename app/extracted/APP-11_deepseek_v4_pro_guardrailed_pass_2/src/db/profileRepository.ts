import { getDatabase } from './database';
import { getOrCreateEncryptionKey, deleteEncryptionKey } from '../crypto/keyManager';
import { encryptField, decryptField, EncryptedField } from '../crypto/fieldCipher';

export interface ProfileRecord {
  id: number;
  uuid: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateProfileInput {
  uuid: string;
  displayName: string;
  avatarUrl?: string | null;
  email: string;
  phone: string;
}

function bufferToBlob(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer);
}

function blobToBuffer(blob: Uint8Array): Buffer {
  return Buffer.from(blob);
}

export async function createProfile(input: CreateProfileInput): Promise<ProfileRecord> {
  const db = await getDatabase();
  const key = await getOrCreateEncryptionKey();

  const emailEncrypted = encryptField(input.email, key);
  const phoneEncrypted = encryptField(input.phone, key);

  const now = Date.now();

  await db.transaction(async (tx) => {
    const profileResult = await tx.executeSql(
      `INSERT INTO profiles (uuid, display_name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [input.uuid, input.displayName, input.avatarUrl ?? null, now, now],
    );

    const profileId = profileResult.insertId;

    await tx.executeSql(
      `INSERT INTO secure_fields
         (profile_id, email_ciphertext, email_iv, email_auth_tag,
          phone_ciphertext, phone_iv, phone_auth_tag, key_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        bufferToBlob(emailEncrypted.ciphertext),
        bufferToBlob(emailEncrypted.iv),
        bufferToBlob(emailEncrypted.authTag),
        bufferToBlob(phoneEncrypted.ciphertext),
        bufferToBlob(phoneEncrypted.iv),
        bufferToBlob(phoneEncrypted.authTag),
        1,
      ],
    );
  });

  return getProfileByUuid(input.uuid);
}

export async function getProfileByUuid(uuid: string): Promise<ProfileRecord | null> {
  const db = await getDatabase();
  const key = await getOrCreateEncryptionKey();

  const result = await db.executeSql(
    `SELECT p.id, p.uuid, p.display_name, p.avatar_url, p.created_at, p.updated_at,
            s.email_ciphertext, s.email_iv, s.email_auth_tag,
            s.phone_ciphertext, s.phone_iv, s.phone_auth_tag
     FROM profiles p
     LEFT JOIN secure_fields s ON s.profile_id = p.id
     WHERE p.uuid = ?
     LIMIT 1`,
    [uuid],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows.item(0);

  if (!row.email_ciphertext || !row.phone_ciphertext) {
    // Security decision: missing encrypted fields means data was tampered with or corrupted.
    // Return null rather than partial data.
    return null;
  }

  const emailEncrypted: EncryptedField = {
    ciphertext: blobToBuffer(row.email_ciphertext),
    iv: blobToBuffer(row.email_iv),
    authTag: blobToBuffer(row.email_auth_tag),
  };

  const phoneEncrypted: EncryptedField = {
    ciphertext: blobToBuffer(row.phone_ciphertext),
    iv: blobToBuffer(row.phone_iv),
    authTag: blobToBuffer(row.phone_auth_tag),
  };

  return {
    id: row.id,
    uuid: row.uuid,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    email: decryptField(emailEncrypted, key),
    phone: decryptField(phoneEncrypted, key),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateProfile(
  uuid: string,
  updates: Partial<Pick<ProfileRecord, 'displayName' | 'avatarUrl' | 'email' | 'phone'>>,
): Promise<ProfileRecord | null> {
  const db = await getDatabase();
  const key = await getOrCreateEncryptionKey();

  const existing = await getProfileByUuid(uuid);
  if (!existing) {
    return null;
  }

  const now = Date.now();

  await db.transaction(async (tx) => {
    if (updates.displayName !== undefined || updates.avatarUrl !== undefined) {
      await tx.executeSql(
        `UPDATE profiles SET display_name = ?, avatar_url = ?, updated_at = ? WHERE uuid = ?`,
        [
          updates.displayName ?? existing.displayName,
          updates.avatarUrl ?? existing.avatarUrl,
          now,
          uuid,
        ],
      );
    }

    if (updates.email !== undefined || updates.phone !== undefined) {
      const emailEncrypted = updates.email
        ? encryptField(updates.email, key)
        : {
            ciphertext: blobToBuffer(
              (await tx.executeSql(
                'SELECT email_ciphertext FROM secure_fields WHERE profile_id = ?',
                [existing.id],
              )).rows.item(0).email_ciphertext,
            ),
            iv: blobToBuffer(
              (await tx.executeSql(
                'SELECT email_iv FROM secure_fields WHERE profile_id = ?',
                [existing.id],
              )).rows.item(0).email_iv,
            ),
            authTag: blobToBuffer(
              (await tx.executeSql(
                'SELECT email_auth_tag FROM secure_fields WHERE profile_id = ?',
                [existing.id],
              )).rows.item(0).email_auth_tag,
            ),
          };

      const phoneEncrypted = updates.phone
        ? encryptField(updates.phone, key)
        : {
            ciphertext: blobToBuffer(
              (await tx.executeSql(
                'SELECT phone_ciphertext FROM secure_fields WHERE profile_id = ?',
                [existing.id],
              )).rows.item(0).phone_ciphertext,
            ),
            iv: blobToBuffer(
              (await tx.executeSql(
                'SELECT phone_iv FROM secure_fields WHERE profile_id = ?',
                [existing.id],
              )).rows.item(0).phone_iv,
            ),
            authTag: blobToBuffer(
              (await tx.executeSql(
                'SELECT phone_auth_tag FROM secure_fields WHERE profile_id = ?',
                [existing.id],
              )).rows.item(0).phone_auth_tag,
            ),
          };

      await tx.executeSql(
        `UPDATE secure_fields
         SET email_ciphertext = ?, email_iv = ?, email_auth_tag = ?,
             phone_ciphertext = ?, phone_iv = ?, phone_auth_tag = ?
         WHERE profile_id = ?`,
        [
          bufferToBlob(emailEncrypted.ciphertext),
          bufferToBlob(emailEncrypted.iv),
          bufferToBlob(emailEncrypted.authTag),
          bufferToBlob(phoneEncrypted.ciphertext),
          bufferToBlob(phoneEncrypted.iv),
          bufferToBlob(phoneEncrypted.authTag),
          existing.id,
        ],
      );
    }
  });

  return getProfileByUuid(uuid);
}

export async function deleteProfile(uuid: string): Promise<void> {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM profiles WHERE uuid = ?', [uuid]);
}

/**
 * Security decision (AGENT_RULES §1): wipe the encryption key on logout.
 * After this call, all encrypted PII is unrecoverable.
 */
export async function wipeAllProfileData(): Promise<void> {
  const db = await getDatabase();
  await db.executeSql('DELETE FROM secure_fields;');
  await db.executeSql('DELETE FROM profiles;');
  await deleteEncryptionKey();
}