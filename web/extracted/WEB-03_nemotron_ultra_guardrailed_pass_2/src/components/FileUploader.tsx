src/components/FileUploader.tsx
'use client';

import { useState, useCallback } from 'react';

interface FileUploaderProps {
  onUploadComplete?: (file: UploadedFile) => void;
  maxFiles?: number;
}

interface UploadedFile {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function FileUploader({ onUploadComplete, maxFiles = 5 }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    setFiles(prev => [...prev, ...filesToAdd]);
    setProgress(prev => [
      ...prev,
      ...filesToAdd.map(f => ({ fileName: f.name, progress: 0, status: 'pending' as const })),
    ]);
    if (event.target) event.target.value = '';
  }, [files.length, maxFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setProgress(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'uploading' as const } : p));

      try {
        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!presignRes.ok) {
          const error = await presignRes.json();
          throw new Error(error.error || 'Failed to get upload URL');
        }

        const { uploadUrl, objectKey } = await presignRes.json();

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        const confirmRes = await fetch('/api/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectKey, fileName: file.name, contentType: file.type, fileSize: file.size }),
        });

        if (!confirmRes.ok) {
          const error = await confirmRes.json();
          throw new Error(error.error || 'Failed to confirm upload');
        }

        const { uploadId } = await confirmRes.json();
        setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, progress: 100, status: 'completed' as const } : p));
        
        const listRes = await fetch('/api/upload/list');
        const { uploads } = await listRes.json();
        const uploadedFile = uploads.find((u: UploadedFile) => u.id === uploadId);
        if (uploadedFile && onUploadComplete) onUploadComplete(uploadedFile);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' as const, error: message } : p));
      }
    }

    setIsUploading(false);
    setFiles([]);
  }, [files, isUploading, onUploadComplete]);

  return (
    <div className="file-uploader">
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={isUploading || files.length >= maxFiles}
        accept="image/jpeg,image/png,application/pdf"
      />
      
      {files.length > 0 && (
        <div className="file-list">
          {progress.map((p, idx) => (
            <div key={idx} className="file-item">
              <span>{p.fileName}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${p.progress}%` }} 
                />
              </div>
              <span className={`status ${p.status}`}>
                {p.status === 'error' ? `Error: ${p.error}` : p.status}
              </span>
              {p.status !== 'uploading' && p.status !== 'completed' && (
                <button type="button" onClick={() => removeFile(idx)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && !isUploading && (
        <button onClick={uploadFiles} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </button>
      )}
    </div>
  );
}