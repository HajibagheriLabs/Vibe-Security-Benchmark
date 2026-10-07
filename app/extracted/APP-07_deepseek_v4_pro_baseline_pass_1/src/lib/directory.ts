import { invoke } from '@tauri-apps/api/core';

export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export interface DirectoryContents {
  entries: DirectoryEntry[];
  total_files: number;
  total_dirs: number;
}

/**
 * Reads the contents of a directory from the filesystem.
 * @param directoryPath - The absolute path to the directory to read.
 * @returns A promise resolving to the directory contents.
 */
export async function readDirectory(directoryPath: string): Promise<DirectoryContents> {
  return await invoke<DirectoryContents>('read_directory', {
    directoryPath,
  });
}