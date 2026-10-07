// src/App.tsx
import React, { useState, useEffect } from 'react';
import { listDirectoryContents, DirectoryEntry } from './lib/directory';

function App() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDirectoryContents(path);
      setEntries(result);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = (entry: DirectoryEntry) => {
    if (entry.is_dir) {
      loadDirectory(entry.path);
    }
  };

  return (
    <div className="app">
      <h1>Directory Browser</h1>
      
      <div className="path-bar">
        <input
          type="text"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          placeholder="Enter directory path"
        />
        <button onClick={() => loadDirectory(currentPath)} disabled={loading}>
          Browse
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="directory-list">
          {entries.map((entry, index) => (
            <li
              key={index}
              onClick={() => handleEntryClick(entry)}
              className={entry.is_dir ? 'directory' : 'file'}
            >
              <span className="icon">{entry.is_dir ? '📁' : '📄'}</span>
              <span className="name">{entry.name}</span>
              {!entry.is_dir && entry.size !== null && (
                <span className="size">
                  {formatFileSize(entry.size)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default App;