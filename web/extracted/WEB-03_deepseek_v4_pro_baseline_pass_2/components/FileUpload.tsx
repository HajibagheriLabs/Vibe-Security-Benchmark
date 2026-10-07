"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFileWithPresignedUrl } from "@/lib/s3Upload";

interface FileUploadProps {
  folder?: string;
  onUploadComplete?: (publicUrl: string, key: string) => void;
  onUploadError?: (error: Error) => void;
  maxFileSizeMB?: number;
  acceptedTypes?: string[];
}

export default function FileUpload({
  folder,
  onUploadComplete,
  onUploadError,
  maxFileSizeMB = 10,
  acceptedTypes = ["image/*", "application/pdf", "text/plain"],
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);
      setIsUploading(true);
      setProgress(0);

      try {
        // Validate file size client-side
        const maxBytes = maxFileSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error(
            `File exceeds maximum size of ${maxFileSizeMB}MB.`
          );
        }

        // Step 1: Request presigned URL from server
        const presignResponse = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folder,
          }),
        });

        if (!presignResponse.ok) {
          const errorData = await presignResponse.json();
          throw new Error(errorData.error || "Failed to get upload URL.");
        }

        const { uploadUrl, publicUrl, key } = await presignResponse.json();

        // Step 2: Upload directly to S3 with progress tracking
        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setProgress(percent);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload."));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setProgress(100);
        onUploadComplete?.(publicUrl, key);
      } catch (err) {
        const uploadError =
          err instanceof Error ? err : new Error("Upload failed.");
        setError(uploadError.message);
        onUploadError?.(uploadError);
      } finally {
        setIsUploading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [folder, maxFileSizeMB, onUploadComplete, onUploadError]
  );

  return (
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        disabled={isUploading}
        className="file-upload-input"
      />

      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {error && <p className="upload-error">{error}</p>}

      <style jsx>{`
        .file-upload {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .file-upload-input {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .file-upload-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .upload-progress {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .progress-bar {
          flex: 1;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s ease;
        }
        .progress-text {
          font-size: 0.875rem;
          color: #666;
          min-width: 3rem;
          text-align: right;
        }
        .upload-error {
          color: #d32f2f;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}