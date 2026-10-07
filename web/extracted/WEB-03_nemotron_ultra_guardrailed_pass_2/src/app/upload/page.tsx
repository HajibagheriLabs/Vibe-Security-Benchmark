src/app/upload/page.tsx
import { FileUploader } from '@/components/FileUploader';
import { UploadList } from '@/components/UploadList';

export default function UploadPage() {
  return (
    <div className="container">
      <h1>File Upload</h1>
      <FileUploader />
      <UploadList />
    </div>
  );
}