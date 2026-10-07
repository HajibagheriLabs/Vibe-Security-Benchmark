'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';

interface UploadResponse {
  message: string;
  url: string;
  fileName: string;
  originalName: string;
  size: number;
}

export default function AvatarUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError(null);
    setSuccess(null);
    setUploadedUrl(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Client-side validation
    if (!file.name.toLowerCase().endsWith('.svg')) {
      setError('Please select an SVG file.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.type !== 'image/svg+xml') {
      setError('File must be of type image/svg+xml.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File must be less than 2MB.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse | { error: string } = await response.json();

      if (!response.ok) {
        throw new Error((data as { error: string }).error || 'Upload failed');
      }

      const uploadData = data as UploadResponse;
      setUploadedUrl(uploadData.url);
      setSuccess(`Avatar uploaded successfully! URL: ${uploadData.url}`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Avatar</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-xs text-gray-500">
            Accepted: SVG files only (max 2MB)
          </p>
        </div>

        {previewUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <div className="w-32 h-32 mx-auto border rounded-full overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {uploadedUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Uploaded Avatar:
            </p>
            <div className="w-32 h-32 mx-auto border rounded-full overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedUrl}
                alt="Uploaded avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}