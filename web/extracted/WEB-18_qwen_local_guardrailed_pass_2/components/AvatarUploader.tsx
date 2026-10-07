'use client';

import { useState, ChangeEvent } from 'react';

interface AvatarUploaderProps {
  onUploadComplete: (url: string) => void;
  currentAvatarUrl?: string | null;
}

export default function AvatarUploader({ onUploadComplete, currentAvatarUrl }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadComplete(data.url);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setUploading(false);
      // Reset input to allow re-uploading same file if needed
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden border border-gray-200">
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Profile Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            No Avatar
          </div>
        )}
      </div>

      <label className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        {uploading ? 'Uploading...' : 'Upload SVG'}
        <input
          type="file"
          accept="image/svg+xml"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}