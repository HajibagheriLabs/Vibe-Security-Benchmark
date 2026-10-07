// components/FileUpload.tsx
'use client';

import { useState, useCallback } from 'react';

interface FileUploadProps {
  onUploadComplete?: (fileKey: string) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Client-side validation
      if (file.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
        return;
      }

      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        // 1. Get presigned URL from our server
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const { uploadUrl, fileKey } = await response.json();

        // 2. Upload directly to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage');
        }

        setProgress(100);
        onUploadComplete?.(fileKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        // Reset file input
        event.target.value = '';
      }
    },
    [onUploadComplete]
  );

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Choose file</span>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </label>

      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}