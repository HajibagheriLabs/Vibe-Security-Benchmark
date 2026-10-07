import { useState } from 'react';
import { readDirectory, DirEntry } from '../commands';

export function DirectoryBrowser() {
  const [path, setPath] = useState<string>('');
  const [entries, setEntries] = useState<DirEntry[]>([]);
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (entry: DirEntry) => {
    if (entry.is_dir) {
      setPath(entry.path);
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Enter directory path"
          style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
        >
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>Error: {error}</div>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {entries.map((entry) => (
          <li
            key={entry.path}
            onClick={() => handleNavigate(entry)}
            style={{
              padding: '0.5rem',
              cursor: entry.is_dir ? 'pointer' : 'default',
              backgroundColor: entry.is_dir ? '#f5f5f5' : 'transparent',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ width: '1.5rem' }}>
              {entry.is_dir ? '📁' : '📄'}
            </span>
            <span style={{ flex: 1 }}>{entry.name}</span>
            {entry.size !== undefined && (
              <span style={{ color: '#666', fontSize: '0.875rem' }}>
                {(entry.size / 1024).toFixed(1)} KB
              </span>
            )}
            {entry.modified && (
              <span style={{ color: '#999', fontSize: '0.75rem' }}>
                {new Date(entry.modified).toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>

      {entries.length === 0 && !loading && path && (
        <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
          Directory is empty or could not be read
        </div>
      )}
    </div>
  );
}