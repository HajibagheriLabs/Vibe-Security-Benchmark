'use client';

import { useState, useCallback } from 'react';
import { validateAvatarFile, getAvatarUrl } from '@/lib/avatar-utils';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onAvatarChange: (url: string) => void;
  disabled?: boolean;
}

export function AvatarUpload({ currentAvatar, onAvatarChange, disabled = false }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const avatarUrl = getAvatarUrl(data.filename);
      setPreview(avatarUrl);
      onAvatarChange(avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }, [onAvatarChange]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onAvatarChange('');
  }, [onAvatarChange]);

  return (
    <div className="avatar-upload">
      <div className="avatar-preview">
        {preview ? (
          <img 
            src={preview} 
            alt="Profile avatar" 
            width={100} 
            height={100}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div 
            className="avatar-placeholder"
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
        )}
      </div>

      <div className="avatar-controls" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <label className="file-input-label" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
          <input
            type="file"
            accept="image/svg+xml"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              opacity: disabled || uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'Uploading...' : preview ? 'Change Avatar' : 'Upload Avatar'}
          </button>
        </label>

        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              opacity: disabled || uploading ? 0.6 : 1,
            }}
          >
            Remove
          </button>
        )}
      </div>

      {error && (
        <p className="avatar-error" style={{ color: '#ef4444', marginTop: '8px', fontSize: '14px' }}>
          {error}
        </p>
      )}

      <p className="avatar-hint" style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
        SVG files only, max 1MB
      </p>
    </div>
  );
}