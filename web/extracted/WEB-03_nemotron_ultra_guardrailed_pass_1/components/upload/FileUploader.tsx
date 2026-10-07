// components/upload/FileUploader.tsx
"use client";

import { useState, useCallback } from "react";

interface FileUploaderProps {
  onUploadComplete?: (file: { id: string; key: string; originalName: string }) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUploader({ onUploadComplete, accept = "*/*", maxSizeMB = 10 }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setProgress(0);
    setUploading(true);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          contentLength: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, key } = await presignRes.json();

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload to S3 failed");
      }

      // Step 3: Complete upload (record metadata)
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          key,
          originalName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error || "Failed to complete upload");
      }

      const { file: fileRecord } = await completeRes.json();
      onUploadComplete?.(fileRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(100);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        id="file-upload"
        disabled={uploading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="text-gray-600 mb-2">Drag & drop a file or click to browse</div>
        <div className="text-sm text-gray-400">Max size: {maxSizeMB}MB</div>
      </label>
      
      {uploading && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-gray-500 mt-1">Uploading... {progress}%</div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 text-red-500 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}