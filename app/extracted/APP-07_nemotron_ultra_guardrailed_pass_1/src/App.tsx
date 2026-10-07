import React, { useState } from 'react';
import { readDirectory, DirectoryEntry } from './commands';

function App() {
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await readDirectory(path);
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui' }}>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <label htmlFor="path" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Directory Path:
        </label>
        <input
          id="path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/home/user/documents"
          style={{ width: '100%', maxWidth: '500px', padding: '0.5rem' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
        >
          {loading ? 'Loading...' : 'Read Directory'}
        </button>
      </form>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {entries.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Type</th>
              <th style={{ padding: '0.5rem' }}>Size</th>
              <th style={{ padding: '0.5rem' }}>Modified</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.path} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{entry.name}</td>
                <td style={{ padding: '0.5rem' }}>
                  {entry.is_dir ? 'Directory' : 'File'}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {entry.is_file ? `${entry.size} bytes` : '—'}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {entry.modified
                    ? new Date(entry.modified * 1000).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;