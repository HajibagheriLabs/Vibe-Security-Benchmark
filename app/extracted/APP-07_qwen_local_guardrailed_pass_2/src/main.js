import { invoke } from '@tauri-apps/api/core';

/**
 * Reads the contents of a directory within the app's data folder.
 * @param {string} dirPath - The relative path from the app's data directory.
 * @returns {Promise<string[]>} - A promise resolving to a list of file/directory names.
 */
export async function readAppDirectory(dirPath) {
  try {
    // Security Decision: The path is typed as string. The backend resolves it 
    // against BaseDirectory::App, preventing arbitrary filesystem access.
    const contents = await invoke('read_dir', { dir: dirPath });
    return contents;
  } catch (error) {
    console.error('Failed to read directory:', error);
    throw error;
  }
}