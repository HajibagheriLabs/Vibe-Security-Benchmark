import { FileUpload } from '@/components/FileUpload';

export default function UploadPage() {
  return (
    <FileUpload
      onUploadComplete={(file) => console.log('Uploaded:', file.url)}
      onUploadError={(error) => console.error('Error:', error)}
      allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
      maxFileSize={5 * 1024 * 1024} // 5MB
    />
  );
}