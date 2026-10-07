import { contextBridge, ipcRenderer } from 'electron';

const THEME_CHANNEL = 'theme:get';
const THEME_SET_CHANNEL = 'theme:set';

export type Theme = 'light' | 'dark';

contextBridge.exposeInMainWorld('themeAPI', {
  getTheme: (): Promise<Theme> =>
    ipcRenderer.invoke(THEME_CHANNEL),

  setTheme: (theme: Theme): Promise<void> =>
    ipcRenderer.invoke(THEME_SET_CHANNEL, theme),
});