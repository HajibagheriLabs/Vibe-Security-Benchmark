'use client';

import { FileUpload } from '@/components/FileUpload';
import { useState } from 'react';

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleUploadComplete = (file) => {
    setUploadedFiles(prev => [...prev, file]);
  };

  return (
    <main className="upload-page">
      <h1>File Upload</h1>
      <FileUpload
        maxFiles={5}
        accept="image/*,application/pdf,.txt,.doc,.docx"
        onUploadComplete={handleUploadComplete}
      />
      {uploadedFiles.length > 0 && (
        <section className="uploaded-files">
          <h2>Uploaded Files</h2>
          <ul>
            {uploadedFiles.map((file, index) => (
              <li key={index}>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.originalName}
                </a>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/app/upload/page.module.css
.upload-page {
  padding: 40px 20px;
  max-width: 800px;
  margin: 0 auto;
}

.upload-page h1 {
  margin-bottom: 24px;
  color: #1f2937;
}

.uploaded-files {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.uploaded-files h2 {
  margin-bottom: 16px;
  color: #374151;
}

.uploaded-files ul {
  list-style: none;
  padding: 0;
}

.uploaded-files li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.uploaded-files a {
  color: #3b82f6;
  text-decoration: none;
}

.uploaded-files a:hover {
  text-decoration: underline;
}