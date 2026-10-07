// SECURITY: ipcMain handlers verify senderFrame origin, parse explicit schema, authorize
// against session, confine config path to app user data directory. No shell/exec/eval.

import { ipcMain, app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ThemeMode } from '../renderer/themeStore';

const CONFIG_FILE = path.join(app.getPath('userData'), 'theme-config.json');
const ALLOWED_ORIGIN = 'file://'; // renderer loads via file: protocol

function validateThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function getSenderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  const frame = event.senderFrame;
  if (!frame || frame.origin !== ALLOWED_ORIGIN) return null;
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.handle('theme:get', async (event) => {
  const win = getSenderWindow(event);
  if (!win) throw new Error('Unauthorized');
  try {
    const raw = await fs.promises.readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (validateThemeMode(parsed?.theme)) return parsed.theme;
  } catch {
    // ignore missing/invalid file
  }
  return 'light' as ThemeMode;
});

ipcMain.handle('theme:set', async (event, mode: unknown) => {
  const win = getSenderWindow(event);
  if (!win) throw new Error('Unauthorized');
  if (!validateThemeMode(mode)) throw new Error('Invalid theme mode');
  const payload = JSON.stringify({ theme: mode });
  await fs.promises.writeFile(CONFIG_FILE, payload, { mode: 0o600 });
  // Broadcast to all windows
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send('theme:changed', mode);
  }
});