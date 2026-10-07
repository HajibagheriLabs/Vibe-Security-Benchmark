"use client";

import { useState, ChangeEvent } from "react";

interface FileUploaderProps {
  onUploadComplete: (key: string) => void;
  bucketName?: string;
}

export default function FileUploader({
  onUploadComplete,
  bucketName = "my-upload-bucket",
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL from API
      const response = await fetch("/api/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { url, key } = await response.json();

      // 2. Upload file to S3 using presigned URL
      const uploadResponse = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      // 3. Notify parent component
      onUploadComplete(key);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        accept="image/*,.pdf,.txt"
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}