import { invoke } from '@tauri-apps/api/core';

export interface DirEntryInfo {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  is_symlink: boolean;
  size?: number;
  modified?: string;
}

export async function readDirectory(path: string): Promise<DirEntryInfo[]> {
  return await invoke<DirEntryInfo[]>('read_directory', { path });
}