import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CredentialStore, StoredCredentials } from './credential-store';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((s: string) => Buffer.from(`encrypted:${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().replace(/^encrypted:/, '')),
  },
}));

describe('CredentialStore', () => {
  let store: CredentialStore;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'credential-store-test-'));
    vi.mocked(app.getPath).mockReturnValue(tempDir);
    store = new CredentialStore('test-credentials');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  const sampleCredentials: StoredCredentials = {
    username: 'testuser@example.com',
    password: 's3cret-p@ssw0rd',
    rememberMe: true,
  };

  describe('saveCredentials', () => {
    it('saves credentials encrypted when encryption is available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);

      const result = store.saveCredentials(sampleCredentials);

      expect(result).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.enc'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.checksum'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.json'))).toBe(false);
    });

    it('falls back to plaintext when encryption is unavailable', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = store.saveCredentials(sampleCredentials);

      expect(result).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.enc'))).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('loadCredentials', () => {
    it('loads encrypted credentials successfully', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      store.saveCredentials(sampleCredentials);

      const loaded = store.loadCredentials();

      expect(loaded).toEqual(sampleCredentials);
    });

    it('returns null when no credentials are stored', () => {
      const loaded = store.loadCredentials();
      expect(loaded).toBeNull();
    });

    it('returns null when checksum verification fails', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      store.saveCredentials(sampleCredentials);

      // Corrupt the encrypted file
      const encPath = path.join(tempDir, 'test-credentials', 'credentials.enc');
      const corrupted = Buffer.from('corrupted-data');
      fs.writeFileSync(encPath, corrupted);

      const loaded = store.loadCredentials();
      expect(loaded).toBeNull();
    });

    it('loads legacy plaintext credentials and migrates them', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      store.saveCredentials(sampleCredentials);

      // Now encryption becomes available
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);

      const loaded = store.loadCredentials();

      expect(loaded).toEqual(sampleCredentials);
      // Should have migrated to encrypted storage
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.enc'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test-credentials', 'credentials.json'))).toBe(false);
    });
  });

  describe('clearCredentials', () => {
    it('removes all stored credential files', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      store.saveCredentials(sampleCredentials);

      store.clearCredentials();

      expect(store.hasStoredCredentials()).toBe(false);
    });
  });

  describe('hasStoredCredentials', () => {
    it('returns false when no credentials exist', () => {
      expect(store.hasStoredCredentials()).toBe(false);
    });

    it('returns true when encrypted credentials exist', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      store.saveCredentials(sampleCredentials);
      expect(store.hasStoredCredentials()).toBe(true);
    });

    it('returns true when legacy plaintext credentials exist', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      store.saveCredentials(sampleCredentials);
      expect(store.hasStoredCredentials()).toBe(true);
    });
  });

  describe('isEncryptionAvailable', () => {
    it('reflects safeStorage availability', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
      expect(store.isEncryptionAvailable()).toBe(true);

      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      expect(store.isEncryptionAvailable()).toBe(false);
    });
  });
});