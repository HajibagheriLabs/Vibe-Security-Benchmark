import { invoke } from '@tauri-apps/api/core';

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  size?: number;
  modified?: string;
}

export async function readDirectory(path: string): Promise<DirEntry[]> {
  return await invoke<DirEntry[]>('read_directory', { path });
}