// src/lib/directory.ts
import { invoke } from '@tauri-apps/api/core';

export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number | null;
}

export async function listDirectoryContents(dirPath: string): Promise<DirectoryEntry[]> {
  try {
    // Validate input before sending to backend
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error('Invalid directory path');
    }
    
    // Call the Tauri command
    const entries = await invoke<DirectoryEntry[]>('list_directory_contents', {
      dirPath
    });
    
    return entries;
  } catch (error) {
    console.error('Failed to list directory contents:', error);
    throw error;
  }
}