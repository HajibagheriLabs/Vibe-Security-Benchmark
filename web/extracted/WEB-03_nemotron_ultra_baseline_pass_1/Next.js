# Next.js S3 File Upload Utility

A production-ready file upload solution for Next.js applications using AWS S3.

## Features

- **Direct Server Upload**: Upload files through Next.js API routes
- **Presigned URLs**: Client-side direct upload to S3 (bypasses server bandwidth)
- **File Validation**: Type and size validation on both client and server
- **Progress Tracking**: Real-time upload progress with React component
- **Drag & Drop**: Accessible drag-and-drop interface
- **Unique Key Generation**: Automatic collision-resistant file naming
- **Metadata Support**: Stores original filename and upload timestamp

## Installation

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner