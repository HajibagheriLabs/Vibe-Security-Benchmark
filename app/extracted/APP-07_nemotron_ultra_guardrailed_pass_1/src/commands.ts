import { invoke } from '@tauri-apps/api/core';

export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  size: number;
  modified: number | null;
}

export async function readDirectory(path: string): Promise<DirectoryEntry[]> {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }
  return invoke<DirectoryEntry[]>('read_directory', { path });
}