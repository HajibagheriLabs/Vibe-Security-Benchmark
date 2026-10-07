import { invoke } from '@tauri-apps/api/tauri';

export interface FileInfo {
  name: string;
  is_dir: boolean;
  size: number;
}

/**
 * Lists contents of a directory relative to the user's home directory.
 * 
 * Security Decision: Uses `invoke` with typed arguments (no generic `eval`).
 * Path is resolved inside Rust, preventing path traversal outside home dir.
 */
export async function listDirectory(relativePath: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>('list_directory', { dirPath: relativePath });
}