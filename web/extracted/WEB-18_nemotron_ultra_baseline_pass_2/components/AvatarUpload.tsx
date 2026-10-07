'use client';

import { useState, FormEvent, ChangeEvent } from 'react';

interface AvatarUploadProps {
  onUpload?: (url: string, filename: string) => void;
  currentAvatarUrl?: string;
}

export function AvatarUpload({ onUpload, currentAvatarUrl }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    if (!file.name.toLowerCase().endsWith('.svg')) {
      setError('Please select an SVG file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content.startsWith('<svg') || content.includes('<svg')) {
        setPreview(content);
      } else {
        setError('Invalid SVG file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const fileInput = event.currentTarget.elements.namedItem('avatar') as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/avatars', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess('Avatar uploaded successfully!');
      onUpload?.(data.url, data.filename);
      
      setFileInputKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload" style={{ maxWidth: '400px' }}>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="avatar-upload" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Upload SVG Avatar
          </label>
          <input
            type="file"
            id="avatar-upload"
            name="avatar"
            accept="image/svg+xml, .svg"
            onChange={handleFileChange}
            key={fileInputKey}
            disabled={uploading}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>

        {preview && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Preview
            </label>
            <div 
              style={{ 
                width: '120px', 
                height: '120px', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: preview }}
                style={{ width: '100px', height: '100px' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#dc2626', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: '#16a34a', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !preview}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: uploading || !preview ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading || !preview ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Avatar'}
        </button>
      </form>
    </div>
  );
}