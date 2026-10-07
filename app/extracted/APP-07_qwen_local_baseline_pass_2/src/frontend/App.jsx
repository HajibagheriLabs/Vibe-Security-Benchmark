import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

function App() {
  const [path, setPath] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReadDirectory = async () => {
    if (!path) {
      setError('Please enter a directory path.');
      return;
    }

    setLoading(true);
    setError('');
    setFiles([]);

    try {
      const result = await invoke('read_directory', { path });
      setFiles(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Directory Reader</h1>
      <div>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Enter directory path"
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        <button onClick={handleReadDirectory} disabled={loading}>
          {loading ? 'Reading...' : 'Read Directory'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {files.length > 0 && (
        <ul style={{ marginTop: '20px' }}>
          {files.map((file, index) => (
            <li key={index}>
              {file.is_dir ? '📁' : '📄'} {file.name} 
              <span style={{ marginLeft: '10px', color: '#888', fontSize: '0.9em' }}>
                ({file.size} bytes)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;