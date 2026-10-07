"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFileToS3, FileUploadError } from "@/lib/s3-upload";

interface FileUploadProps {
  userId?: string;
  onUploadComplete?: (result: { url: string; key: string }) => void;
  onUploadError?: (error: FileUploadError) => void;
  maxFileSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export default function FileUpload({
  userId,
  onUploadComplete,
  onUploadError,
  maxFileSizeMB = 10,
  acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
  ],
  className = "",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Client-side validation
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        const error = new FileUploadError(
          `File size exceeds ${maxFileSizeMB}MB limit`,
          "FILE_TOO_LARGE",
        );
        setError(error.message);
        onUploadError?.(error);
        return;
      }

      if (!acceptedTypes.includes(file.type)) {
        const error = new FileUploadError(
          `File type "${file.type}" is not allowed`,
          "INVALID_FILE_TYPE",
        );
        setError(error.message);
        onUploadError?.(error);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      setUploadedUrl(null);

      try {
        // Simulate progress for better UX (pre-signed URL uploads
        // don't provide native progress events)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        const result = await uploadFileToS3(file, { userId });

        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadedUrl(result.url);
        onUploadComplete?.(result);

        // Reset input to allow re-uploading the same file
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      } catch (err) {
        if (err instanceof FileUploadError) {
          setError(err.message);
          onUploadError?.(err);
        } else {
          const genericError = new FileUploadError(
            "An unexpected error occurred during upload",
            "UPLOAD_FAILED",
          );
          setError(genericError.message);
          onUploadError?.(genericError);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [userId, maxFileSizeMB, acceptedTypes, onUploadComplete, onUploadError],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file || !inputRef.current) return;

      // Create a synthetic change event
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputRef.current.files = dataTransfer.files;

      const changeEvent = new Event("change", { bubbles: true });
      inputRef.current.dispatchEvent(changeEvent);
    },
    [],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className={`file-upload ${className}`}>
      <div
        className={`upload-dropzone ${isUploading ? "uploading" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden-input"
          aria-label="File upload"
        />

        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p>Uploading... {uploadProgress}%</p>
          </div>
        ) : uploadedUrl ? (
          <div className="upload-success">
            <p>✓ Upload complete!</p>
            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
              View uploaded file
            </a>
          </div>
        ) : (
          <div className="upload-prompt">
            <p>Click to upload or drag and drop</p>
            <p className="upload-hint">
              Max size: {maxFileSizeMB}MB. Accepted types:{" "}
              {acceptedTypes.map((t) => t.split("/")[1]).join(", ")}
            </p>
          </div>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}

      <style jsx>{`
        .file-upload {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .upload-dropzone {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .upload-dropzone:hover,
        .upload-dropzone:focus {
          border-color: #0070f3;
          background: #f0f7ff;
        }

        .upload-dropzone.uploading {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .hidden-input {
          display: none;
        }

        .upload-progress {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: #0070f3;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .upload-success {
          color: #0070f3;
        }

        .upload-success a {
          color: #0070f3;
          text-decoration: underline;
        }

        .upload-prompt {
          color: #666;
        }

        .upload-hint {
          font-size: 0.85rem;
          color: #999;
          margin-top: 0.5rem;
        }

        .upload-error {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c00;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}