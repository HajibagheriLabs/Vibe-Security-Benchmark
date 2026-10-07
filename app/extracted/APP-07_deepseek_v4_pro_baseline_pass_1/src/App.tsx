import { useState } from 'react';
import { readDirectory, DirectoryContents } from './lib/directory';

function App() {
  const [contents, setContents] = useState<DirectoryContents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await readDirectory(path);
      setContents(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleReadDirectory('/home/user/Documents')}>
        Read Documents
      </button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {contents && (
        <div>
          <p>Files: {contents.total_files} | Directories: {contents.total_dirs}</p>
          <ul>
            {contents.entries.map((entry) => (
              <li key={entry.path}>
                {entry.is_dir ? '📁' : '📄'} {entry.name}
                {!entry.is_dir && ` (${entry.size} bytes)`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;