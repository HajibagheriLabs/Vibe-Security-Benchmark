import { invoke } from '@tauri-apps/api/core';

export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export interface DirectoryListing {
  entries: DirectoryEntry[];
  canonical_path: string;
}

/**
 * Lists the contents of a directory on the local filesystem.
 * 
 * Security: The path is validated and confined to allowed roots
 * on the Rust side. Never pass user-controlled paths without
 * server-side (Rust) validation.
 * 
 * @param directoryPath - Absolute path to the directory to list
 * @returns Promise resolving to the directory listing
 * @throws Error if the path is outside allowed directories or invalid
 */
export async function listDirectoryContents(
  directoryPath: string
): Promise<DirectoryListing> {
  // Validate input is a non-empty string before sending to backend
  if (typeof directoryPath !== 'string' || directoryPath.trim().length === 0) {
    throw new Error('Directory path must be a non-empty string');
  }
  
  // Reject paths with null bytes or other suspicious characters
  if (directoryPath.includes('\0')) {
    throw new Error('Invalid directory path');
  }
  
  try {
    return await invoke<DirectoryListing>('list_directory_contents', {
      directoryPath,
    });
  } catch (error) {
    // Log the error without exposing sensitive filesystem details
    console.error('Failed to list directory contents:', error);
    throw new Error('Failed to list directory contents');
  }
}