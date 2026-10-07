'use client';

import { useState, useCallback, useRef } from 'react';

export function FileUpload({ onUploadComplete, maxFiles = 1, accept }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const validateFile = useCallback((file) => {
    const allowedTypes = accept?.split(',').map(t => t.trim()) || [];
    const maxSize = 10 * 1024 * 1024;

    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type.match(type.replace('*', '.*')))) {
      return `File type ${file.type} is not allowed`;
    }

    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
    }

    return null;
  }, [accept]);

  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files);
    const newFiles = [];
    const newErrors = { ...errors };

    selectedFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors[file.name] = error;
      } else if (files.length + newFiles.length < maxFiles) {
        newFiles.push(file);
      } else {
        newErrors[file.name] = `Maximum ${maxFiles} file(s) allowed`;
      }
    });

    setFiles(prev => [...prev, ...newFiles]);
    setErrors(newErrors);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files.length, maxFiles, validateFile, errors]);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (files[key] === files[index]) delete newErrors[key];
      });
      return newErrors;
    });
  }, [files]);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(prev => ({ ...prev, [file.name]: 0 }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setProgress(prev => ({ ...prev, [file.name]: 100 }));
        results.push(data.file);

        if (onUploadComplete) {
          onUploadComplete(data.file);
        }
      } catch (error) {
        setErrors(prev => ({ ...prev, [file.name]: error.message }));
        setProgress(prev => ({ ...prev, [file.name]: -1 }));
      }
    }

    setUploading(false);
    setFiles(prev => prev.filter((_, i) => progress[files[i]?.name] !== 100));
    return results;
  }, [files, onUploadComplete, progress]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="file-upload">
      <div className="drop-zone" onClick={triggerFileSelect}>
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="upload-prompt">
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>Drag & drop files here or click to browse</p>
          <span className="hint">Max {maxFiles} file(s), 10MB each</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="file-item">
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="file-actions">
                {progress[file.name] !== undefined && progress[file.name] !== 100 && progress[file.name] !== -1 && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.max(0, progress[file.name])}%` }}
                    />
                  </div>
                )}
                {progress[file.name] === 100 && (
                  <span className="upload-success">✓ Uploaded</span>
                )}
                {progress[file.name] === -1 && (
                  <span className="upload-error">✗ Failed</span>
                )}
                {!uploading && progress[file.name] !== 100 && progress[file.name] !== -1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeFile(index)}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                )}
              </div>
              {errors[file.name] && (
                <div className="file-error">{errors[file.name]}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && !uploading && (
        <button
          className="upload-btn"
          onClick={uploadFiles}
          disabled={uploading}
        >
          Upload {files.length} File{files.length > 1 ? 's' : ''}
        </button>
      )}

      {uploading && <div className="uploading-indicator">Uploading...</div>}
    </div>
  );
}

/components/FileUpload.module.css
.file-upload {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 600px;
}

.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #6b7280;
  margin-bottom: 16px;
}

.upload-prompt p {
  margin: 0 0 8px;
  color: #374151;
  font-size: 16px;
}

.hint {
  color: #9ca3af;
  font-size: 14px;
}

.file-list {
  margin-top: 16px;
}

.file-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fafafa;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-weight: 500;
  color: #1f2937;
  word-break: break-all;
}

.file-size {
  color: #6b7280;
  font-size: 14px;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.upload-success {
  color: #10b981;
  font-size: 14px;
}

.upload-error {
  color: #ef4444;
  font-size: 14px;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.remove-btn:hover {
  color: #ef4444;
}

.file-error {
  color: #ef4444;
  font-size: 13px;
  padding-left: 4px;
}

.upload-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: #2563eb;
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.uploading-indicator {
  margin-top: 16px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 6px;
  color: #3b82f6;
  text-align: center;
}