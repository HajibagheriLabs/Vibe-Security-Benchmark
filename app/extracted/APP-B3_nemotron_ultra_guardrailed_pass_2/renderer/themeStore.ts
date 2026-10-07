// SECURITY: Theme preference is non-sensitive UI state. Stored via contextBridge-exposed
// IPC to main process which writes to a user-writable JSON config file (no credentials).
// No native secure store required.

export type ThemeMode = 'light' | 'dark';

export interface ThemeStore {
  getTheme(): Promise<ThemeMode>;
  setTheme(mode: ThemeMode): Promise<void>;
  onThemeChange(listener: (mode: ThemeMode) => void): () => void;
}

declare global {
  interface Window {
    themeStore: ThemeStore;
  }
}