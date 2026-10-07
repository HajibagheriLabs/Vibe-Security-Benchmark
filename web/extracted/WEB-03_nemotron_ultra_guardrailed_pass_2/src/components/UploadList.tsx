src/components/UploadList.tsx
'use client';

import { useEffect, useState } from 'react';
import { getServerSession } from '@/lib/auth';

interface UploadedFile {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
}

export function UploadList() {
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const res = await fetch('/api/upload/list');
      if (res.ok) {
        const { uploads } = await res.json();
        setUploads(uploads);
      }
    } catch (error) {
      console.error('Failed to load uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/upload/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUploads(prev => prev.filter(u => u.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete upload:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="upload-list">
      <h2>Your Uploads</h2>
      {uploads.length === 0 ? (
        <p>No uploads yet.</p>
      ) : (
        <ul>
          {uploads.map(upload => (
            <li key={upload.id}>
              <span>{upload.fileName} ({(upload.fileSize / 1024).toFixed(1)} KB)</span>
              <button onClick={() => handleDelete(upload.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}