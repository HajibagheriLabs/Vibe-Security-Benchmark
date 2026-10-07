"use client";

import { useState, ChangeEvent } from "react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(
    null
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult({ url: data.url });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {result?.url && <p>File uploaded successfully: {result.url}</p>}
      {result?.error && <p style={{ color: "red" }}>Error: {result.error}</p>}
    </div>
  );
}