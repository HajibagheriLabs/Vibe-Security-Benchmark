import { describe, it, expect, vi } from 'vitest';
import { listDirectoryContents } from './directory';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('listDirectoryContents', () => {
  it('should call invoke with the correct arguments', async () => {
    const mockResult = {
      entries: [
        { name: 'file.txt', path: '/home/user/file.txt', is_dir: false, size: 1024 },
        { name: 'subdir', path: '/home/user/subdir', is_dir: true, size: 4096 },
      ],
      canonical_path: '/home/user',
    };
    
    vi.mocked(invoke).mockResolvedValue(mockResult);
    
    const result = await listDirectoryContents('/home/user');
    
    expect(invoke).toHaveBeenCalledWith('list_directory_contents', {
      directoryPath: '/home/user',
    });
    expect(result).toEqual(mockResult);
  });
  
  it('should reject empty paths', async () => {
    await expect(listDirectoryContents('')).rejects.toThrow(
      'Directory path must be a non-empty string'
    );
    expect(invoke).not.toHaveBeenCalled();
  });
  
  it('should reject paths with null bytes', async () => {
    await expect(listDirectoryContents('/path\0with-null')).rejects.toThrow(
      'Invalid directory path'
    );
    expect(invoke).not.toHaveBeenCalled();
  });
  
  it('should handle backend errors gracefully', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Access denied'));
    
    await expect(listDirectoryContents('/etc')).rejects.toThrow(
      'Failed to list directory contents'
    );
  });
});