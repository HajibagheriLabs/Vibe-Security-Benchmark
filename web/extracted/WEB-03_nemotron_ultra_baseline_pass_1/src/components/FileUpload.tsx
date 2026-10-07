'use client';

import { useState, useCallback, useRef } from 'react';

export interface FileUploadProps {
  onUploadComplete?: (result: { key: string; url: string; name: string; size: number; type: string }) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
  usePresignedUrl?: boolean;
  prefix?: string;
  className?: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],
  maxFileSize = 10 * 1024 * 1024,
  multiple = false,
  usePresignedUrl = false,
  prefix = 'uploads',
  className = '',
}: FileUploadProps) {
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed`;
    }
    if (file.size > maxFileSize) {
      return `File size exceeds maximum allowed size of ${Math.round(maxFileSize / 1024 / 1024)}MB`;
    }
    return null;
  }, [allowedTypes, maxFileSize]);

  const uploadFile = useCallback(async (file: File, index: number) => {
    const error = validateFile(file);
    if (error) {
      setProgress(prev => prev.map((p, i) => i === index ? { ...p, status: 'error', error } : p));
      onUploadError?.(error);
      return;
    }

    setProgress(prev => prev.map((p, i) => i === index ? { ...p, status: 'uploading', progress: 0 } : p));

    try {
      let result: { key: string; url: string; name: string; size: number; type: string };

      if (usePresignedUrl) {
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, prefix }),
        });

        if (!presignedResponse.ok) {
          throw new Error('Failed to get presigned URL');
        }

        const { uploadUrl, key } = await presignedResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload to S3 failed');
        }

        result = {
          key,
          url: uploadUrl.split('?')[0],
          name: file.name,
          size: file.size,
          type: file.type,
        };
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prefix', prefix);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await uploadResponse.json();
        result = data.file;
      }

      setProgress(prev => prev.map((p, i) => i === index ? { ...p, status: 'complete', progress: 100 } : p));
      onUploadComplete?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setProgress(prev => prev.map((p, i) => i === index ? { ...p, status: 'error', error: errorMessage } : p));
      onUploadError?.(errorMessage);
    }
  }, [validateFile, onUploadComplete, onUploadError, usePresignedUrl, prefix]);

  const handleFiles = useCallback((files: FileList) => {
    const newProgress: UploadProgress[] = Array.from(files).map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending' as const,
    }));

    setProgress(prev => [...prev, ...newProgress]);

    Array.from(files).forEach((file, index) => {
      uploadFile(file, progress.length + index);
    });
  }, [uploadFile, progress.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setProgress(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setProgress([]);
  }, []);

  return (
    <div className={`file-upload ${className}`}>
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Upload files"
        />
        <div className="drop-zone-content">
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>Drag and drop files here, or click to browse</p>
          <span className="hint">
            {allowedTypes.map(t => t.split('/')[1]).join(', ')} · Max {Math.round(maxFileSize / 1024 / 1024)}MB
          </span>
        </div>
      </div>

      {progress.length > 0 && (
        <div className="upload-list">
          {progress.map((item, index) => (
            <div key={index} className={`upload-item ${item.status}`}>
              <div className="file-info">
                <span className="file-name">{item.fileName}</span>
                {item.status === 'uploading' && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === 'error' && (
                  <span className="error-message">{item.error}</span>
                )}
              </div>
              <div className="file-actions">
                {item.status === 'pending' || item.status === 'uploading' ? (
                  <button onClick={() => removeFile(index)} className="btn-remove" aria-label="Cancel upload">
                    ✕
                  </button>
                ) : item.status === 'error' ? (
                  <button onClick={() => removeFile(index)} className="btn-remove" aria-label="Remove failed upload">
                    ✕
                  </button>
                ) : (
                  <span className="success-icon" aria-label="Upload complete">✓</span>
                )}
              </div>
            </div>
          ))}
          {progress.length > 0 && (
            <button onClick={clearAll} className="btn-clear" type="button">
              Clear all
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .file-upload {
          width: 100%;
        }
        .drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f9fafb;
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .drop-zone:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
        }
        .drop-zone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .upload-icon {
          width: 48px;
          height: 48px;
          color: #9ca3af;
        }
        .drop-zone.dragging .upload-icon {
          color: #3b82f6;
        }
        .drop-zone p {
          margin: 0;
          color: #374151;
          font-size: 16px;
        }
        .hint {
          font-size: 12px;
          color: #9ca3af;
        }
        .upload-list {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .upload-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          gap: 12px;
        }
        .upload-item.uploading {
          border-color: #3b82f6;
        }
        .upload-item.error {
          border-color: #ef4444;
        }
        .file-info {
          flex: 1;
          min-width: 0;
        }
        .file-name {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .progress-bar {
          margin-top: 6px;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }
        .error-message {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #ef4444;
        }
        .success-icon {
          color: #22c55e;
          font-weight: bold;
        }
        .btn-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          font-size: 18px;
          line-height: 1;
          padding: 4px;
          border-radius: 4px;
        }
        .btn-remove:hover {
          color: #ef4444;
          background: #fef2f2;
        }
        .btn-clear {
          align-self: flex-start;
          margin-top: 8px;
          padding: 8px 16px;
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-clear:hover {
          background: #f9fafb;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}