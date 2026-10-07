// src/frontend/components/DirectoryViewer.js
import { invoke } from '@tauri-apps/api/core';

export async function listDirectoryContents(directoryPath) {
  try {
    const contents = await invoke('read_directory_contents', { path: directoryPath });
    return contents;
  } catch (error) {
    console.error('Failed to read directory:', error);
    throw error;
  }
}

// Example usage within a React component
export function DirectoryViewer({ path, onFileSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!path) return;
      setLoading(true);
      setError(null);
      try {
        const data = await listDirectoryContents(path);
        if (!cancelled) {
          setItems(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.path}>
          {item.is_dir ? '📁' : '📄'} {item.name}
          {!item.is_dir && (
            <button onClick={() => onFileSelect(item)}>Open</button>
          )}
        </li>
      ))}
    </ul>
  );
}