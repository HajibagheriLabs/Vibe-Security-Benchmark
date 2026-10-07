// src/helpers/credential-store.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_FILE_NAME = 'user-credentials.json';

/**
 * Gets the path to the credentials file in the user data directory.
 * @returns {string} The absolute path to the credentials file.
 */
function getCredentialsFilePath() {
  return path.join(app.getPath('userData'), CREDENTIALS_FILE_NAME);
}

/**
 * Reads the credentials from the JSON file.
 * @returns {Promise<Object|null>} The parsed credentials object, or null if not found or invalid.
 */
async function readCredentials() {
  const filePath = getCredentialsFilePath();
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read credentials:', error);
    return null;
  }
}

/**
 * Writes the credentials to the JSON file.
 * @param {Object} credentials - The credentials object to save.
 * @returns {Promise<void>}
 */
async function writeCredentials(credentials) {
  const filePath = getCredentialsFilePath();
  
  try {
    // Ensure the directory exists (though userData usually does)
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    
    await fs.promises.writeFile(filePath, JSON.stringify(credentials, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write credentials:', error);
    throw error;
  }
}

/**
 * Removes the credentials file.
 * @returns {Promise<void>}
 */
async function clearCredentials() {
  const filePath = getCredentialsFilePath();
  
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    throw error;
  }
}

module.exports = {
  readCredentials,
  writeCredentials,
  clearCredentials,
  getCredentialsFilePath
};