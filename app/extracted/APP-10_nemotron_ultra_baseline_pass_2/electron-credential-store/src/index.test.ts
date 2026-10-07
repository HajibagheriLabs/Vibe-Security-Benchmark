import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { CredentialStore, StoredCredentials } from './index';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/userData'),
    getName: jest.fn(() => 'TestApp'),
    getVersion: jest.fn(() => '1.0.0'),
  },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((buffer: Buffer) => Buffer.from('encrypted-' + buffer.toString())),
    decryptString: jest.fn((buffer: Buffer) => Buffer.from(buffer.toString().replace('encrypted-', ''))),
  },
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  constants: {
    F_OK: 0,
  },
}));

describe('CredentialStore', () => {
  let store: CredentialStore;
  const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new CredentialStore({ serviceName: 'test-service', fileName: 'test.enc' });
  });

  describe('saveCredentials', () => {
    it('should encrypt and save credentials', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const result = await store.saveCredentials('user123', 'pass456');
      
      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCall = mockFs.writeFile.mock.calls[0];
      expect(writeCall[0]).toContain('test.enc');
      expect(writeCall[1]).toBe('ZW5jcnlwdGVk-{"username":"user123","password":"pass456","updatedAt":');
    });

    it('should return false when encryption is unavailable', async () => {
      const { safeStorage } = require('electron');
      safeStorage.isEncryptionAvailable.mockReturnValue(false);
      
      const result = await store.saveCredentials('user123', 'pass456');
      
      expect(result).toBe(false);
    });

    it('should return false on write error', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      const result = await store.saveCredentials('user123', 'pass456');
      
      expect(result).toBe(false);
    });
  });

  describe('getCredentials', () => {
    it('should decrypt and return credentials', async () => {
      const credentials: StoredCredentials = {
        username: 'user123',
        password: 'pass456',
        updatedAt: Date.now(),
      };
      mockFs.readFile.mockResolvedValue('ZW5jcnlwdGVk-' + JSON.stringify(credentials));
      
      const result = await store.getCredentials();
      
      expect(result).toEqual(credentials);
    });

    it('should return null when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      
      const result = await store.getCredentials();
      
      expect(result).toBeNull();
    });

    it('should return null when decryption fails', async () => {
      mockFs.readFile.mockResolvedValue('invalid-data');
      
      const result = await store.getCredentials();
      
      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', async () => {
      mockFs.readFile.mockResolvedValue('ZW5jcnlwdGVk-invalid-json');
      
      const result = await store.getCredentials();
      
      expect(result).toBeNull();
    });

    it('should return null for missing username or password', async () => {
      const credentials = { username: '', password: 'pass', updatedAt: Date.now() };
      mockFs.readFile.mockResolvedValue('ZW5jcnlwdGVk-' + JSON.stringify(credentials));
      
      const result = await store.getCredentials();
      
      expect(result).toBeNull();
    });
  });

  describe('deleteCredentials', () => {
    it('should delete the credentials file', async () => {
      mockFs.unlink.mockResolvedValue(undefined);
      
      const result = await store.deleteCredentials();
      
      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('test.enc'));
    });

    it('should return false on error', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));
      
      const result = await store.deleteCredentials();
      
      expect(result).toBe(false);
    });
  });

  describe('hasCredentials', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await store.hasCredentials();
      
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue({ code: 'ENOENT' });
      
      const result = await store.hasCredentials();
      
      expect(result).toBe(false);
    });
  });

  describe('isEncryptionAvailable', () => {
    it('should return true when encryption is available', () => {
      expect(store.isEncryptionAvailable()).toBe(true);
    });

    it('should return false when encryption is unavailable', () => {
      const { safeStorage } = require('electron');
      safeStorage.isEncryptionAvailable.mockReturnValue(false);
      
      expect(store.isEncryptionAvailable()).toBe(false);
    });
  });
});