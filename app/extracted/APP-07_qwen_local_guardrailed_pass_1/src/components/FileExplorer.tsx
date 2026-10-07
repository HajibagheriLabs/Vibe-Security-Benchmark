import React, { useState } from 'react';
import { listDirectory, FileInfo } from '../lib/fs';

export const FileExplorer: React.FC = () => {
  const [contents, setContents] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBrowse = async () => {
    setLoading(true);
    setError(null);
    try {
      // Example: List contents of "Documents"
      const data = await listDirectory('Documents');
      setContents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleBrowse} disabled={loading}>
        {loading ? 'Loading...' : 'Browse Documents'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {contents.map((item) => (
          <li key={item.name}>
            {item.is_dir ? '📁' : '📄'} {item.name} ({item.size} bytes)
          </li>
        ))}
      </ul>
    </div>
  );
};