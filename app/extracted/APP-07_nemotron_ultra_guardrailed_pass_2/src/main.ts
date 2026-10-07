import { invoke } from '@tauri-apps/api/core';

interface DirEntry {
  name: string;
  is_dir: boolean;
  is_file: boolean;
  is_symlink: boolean;
}

interface ReadDirRequest {
  path: string;
}

export async function readDirectory(path: string): Promise<DirEntry[]> {
  // Input validation on the client side (defense in depth)
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }

  // Prevent path traversal attempts in the request
  if (path.includes('..') || path.includes('~')) {
    throw new Error('Path traversal not allowed');
  }

  try {
    const result = await invoke<DirEntry[]>('read_directory', { path } as ReadDirRequest);
    return result;
  } catch (error) {
    // Sanitize error messages for the UI
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to read directory: ${message}`);
  }
}

// Example usage in a React component
// import { useState } from 'react';
// import { readDirectory } from './main';
//
// export function DirectoryBrowser() {
//   const [path, setPath] = useState('');
//   const [entries, setEntries] = useState<DirEntry[]>([]);
//   const [error, setError] = useState<string | null>(null);
//
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     try {
//       const data = await readDirectory(path);
//       setEntries(data);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Unknown error');
//     }
//   };
//
//   return (
//     <form onSubmit={handleSubmit}>
//       <input
//         type="text"
//         value={path}
//         onChange={(e) => setPath(e.target.value)}
//         placeholder="Enter directory path"
//       />
//       <button type="submit">Read Directory</button>
//       {error && <p style={{color: 'red'}}>{error}</p>}
//       <ul>
//         {entries.map((entry, i) => (
//           <li key={i}>
//             {entry.name} {entry.is_dir ? '📁' : entry.is_file ? '📄' : '🔗'}
//           </li>
//         ))}
//       </ul>
//     </form>
//   );
// }