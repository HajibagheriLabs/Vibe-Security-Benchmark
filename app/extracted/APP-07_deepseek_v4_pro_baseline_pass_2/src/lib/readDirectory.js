// src/lib/readDirectory.js
import { invoke } from '@tauri-apps/api/core';

/**
 * Read the contents of a directory
 * @param {string} directoryPath - The absolute path to the directory
 * @returns {Promise<Object>} Directory contents with entries array
 */
export async function readDirectory(directoryPath) {
  try {
    const result = await invoke('read_directory', {
      directoryPath: directoryPath
    });
    
    return {
      success: true,
      data: result,
      error: null
    };
  } catch (error) {
    console.error('Failed to read directory:', error);
    return {
      success: false,
      data: null,
      error: error.message || String(error)
    };
  }
}