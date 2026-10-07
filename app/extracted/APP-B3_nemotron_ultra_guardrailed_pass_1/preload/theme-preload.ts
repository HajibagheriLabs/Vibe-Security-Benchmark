import { contextBridge, ipcRenderer } from 'electron';
import type { Theme } from '../renderer/theme-store';

const THEME_CHANNEL = 'theme:get';
const THEME_SET_CHANNEL = 'theme:set';

contextBridge.exposeInMainWorld('themeAPI', {
  getTheme: (): Promise<Theme> =>
    ipcRenderer.invoke(THEME_CHANNEL),

  setTheme: (theme: Theme): Promise<void> =>
    ipcRenderer.invoke(THEME_SET_CHANNEL, theme),
});