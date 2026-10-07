import React, { useState } from 'react';
import { readDirectory, DirEntryInfo } from '../commands';

export function DirectoryBrowser() {
  const [path, setPath] = useState<string>('');
  const [entries, setEntries] = useState<DirEntryInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await readDirectory(path);
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Enter directory path (e.g. /home/user or C:\\Users)"
          style={{ flex: 1, padding: '8px', fontSize: '14px' }}
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{ padding: '8px 16px' }}
        >
          {loading ? 'Loading...' : 'Load Directory'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '16px' }}>Error: {error}</div>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {entries.map((entry) => (
          <li
            key={entry.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              borderBottom: '1px solid #eee',
            }}
          >
            <span style={{ width: '24px', textAlign: 'center' }}>
              {entry.is_dir ? '📁' : entry.is_symlink ? '🔗' : '📄'}
            </span>
            <span style={{ flex: 1 }}>{entry.name}</span>
            {entry.size !== undefined && (
              <span style={{ color: '#666', fontSize: '12px' }}>
                {(entry.size / 1024).toFixed(1)} KB
              </span>
            )}
            {entry.modified && (
              <span style={{ color: '#999', fontSize: '11px' }}>
                {new Date(entry.modified).toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>

      {entries.length === 0 && !loading && !error && (
        <p style={{ color: '#999' }}>No entries found or directory is empty.</p>
      )}
    </div>
  );
}