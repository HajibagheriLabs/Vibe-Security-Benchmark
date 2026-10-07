// src/App.jsx (example usage)
import React, { useState } from 'react';
import { readDirectory } from './lib/readDirectory';

function DirectoryBrowser() {
  const [directoryPath, setDirectoryPath] = useState('');
  const [contents, setContents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleReadDirectory = async () => {
    if (!directoryPath.trim()) {
      setError('Please enter a directory path');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await readDirectory(directoryPath);
    
    if (result.success) {
      setContents(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Directory Browser</h2>
      <div>
        <input
          type="text"
          value={directoryPath}
          onChange={(e) => setDirectoryPath(e.target.value)}
          placeholder="Enter directory path (e.g., /home/user/documents)"
          style={{ width: '400px', marginRight: '10px' }}
        />
        <button onClick={handleReadDirectory} disabled={loading}>
          {loading ? 'Reading...' : 'Read Directory'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}

      {contents && (
        <div style={{ marginTop: '20px' }}>
          <h3>Contents ({contents.total_entries} entries, {contents.total_size} bytes total)</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Size</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Path</th>
              </tr>
            </thead>
            <tbody>
              {contents.entries.map((entry, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {entry.is_dir ? '📁 ' : '📄 '}{entry.name}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {entry.is_dir ? 'Directory' : 'File'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {entry.is_file ? `${entry.size} bytes` : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '12px' }}>
                    {entry.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DirectoryBrowser;