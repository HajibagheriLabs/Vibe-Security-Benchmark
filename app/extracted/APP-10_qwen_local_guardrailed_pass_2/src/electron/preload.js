const { contextBridge } = require('electron');
const { preloadCredentials } = require('./helpers/credentials');

// Rule 2: contextBridge exposes named single-purpose functions
preloadCredentials(contextBridge);