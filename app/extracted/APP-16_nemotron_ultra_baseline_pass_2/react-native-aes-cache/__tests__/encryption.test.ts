import {
  encryptDocument,
  decryptDocument,
  clearEncryptionKey,
  rotateEncryptionKey,
} from '../encryption';

describe('AES-256 Encryption', () => {
  beforeEach(async () => {
    await clearEncryptionKey();
  });

  afterAll(async () => {
    await clearEncryptionKey();
  });

  it('encrypts and decrypts a simple string', async () => {
    const original = 'Hello, World!';
    const encrypted = await encryptDocument(original);
    const decrypted = await decryptDocument(encrypted);
    expect(decrypted).toBe(original);
  });

  it('encrypts and decrypts a large document', async () => {
    const original = 'x'.repeat(100000);
    const encrypted = await encryptDocument(original);
    const decrypted = await decryptDocument(encrypted);
    expect(decrypted).toBe(original);
  });

  it('encrypts and decrypts JSON content', async () => {
    const original = JSON.stringify({
      userId: 'user_123',
      documents: [
        { id: 'doc_1', title: 'Report', content: 'Sensitive data' },
        { id: 'doc_2', title: 'Notes', content: 'More sensitive data' },
      ],
      metadata: { createdAt: '2024-01-15T10:30:00Z', version: 2 },
    });
    const encrypted = await encryptDocument(original);
    const decrypted = await decryptDocument(encrypted);
    expect(decrypted).toBe(original);
  });

  it('produces different ciphertext for same plaintext', async () => {
    const original = 'Same content';
    const encrypted1 = await encryptDocument(original);
    const encrypted2 = await encryptDocument(original);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('throws on tampered ciphertext', async () => {
    const original = 'Test document';
    const encrypted = await encryptDocument(original);
    
    const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf-8'));
    payload.ciphertext = Buffer.from('tampered').toString('base64');
    const tampered = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    await expect(decryptDocument(tampered)).rejects.toThrow();
  });

  it('throws on corrupted IV', async () => {
    const original = 'Test document';
    const encrypted = await encryptDocument(original);
    
    const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf-8'));
    payload.iv = Buffer.from('corruptediv12345').toString('base64');
    const corrupted = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    await expect(decryptDocument(corrupted)).rejects.toThrow();
  });

  it('rotates encryption key', async () => {
    const original = 'Document before rotation';
    const encrypted = await encryptDocument(original);
    
    await rotateEncryptionKey();
    
    await expect(decryptDocument(encrypted)).rejects.toThrow();
  });

  it('handles unicode content', async () => {
    const original = '🎉 Unicode: 中文, Español, العربية, 🇺🇸';
    const encrypted = await encryptDocument(original);
    const decrypted = await decryptDocument(encrypted);
    expect(decrypted).toBe(original);
  });
});