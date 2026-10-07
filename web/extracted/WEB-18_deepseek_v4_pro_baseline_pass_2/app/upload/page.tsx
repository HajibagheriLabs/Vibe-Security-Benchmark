// app/upload/page.tsx
'use client';

import { useState, useRef } from 'react';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.type !== 'image/svg+xml') {
      setError('Please select an SVG file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File must be less than 2MB.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadedUrl(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      setUploadedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload SVG Avatar</h1>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/svg+xml"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={uploading}
        />

        {uploading && (
          <div className="text-blue-600">Uploading...</div>
        )}

        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
        )}

        {uploadedUrl && (
          <div className="space-y-2">
            <div className="text-green-600">Upload successful!</div>
            <div className="border rounded p-4 bg-gray-50">
              <img
                src={uploadedUrl}
                alt="Uploaded avatar"
                className="w-32 h-32 object-contain mx-auto"
              />
            </div>
            <div className="text-sm text-gray-600 break-all">
              URL: {uploadedUrl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}