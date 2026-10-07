// lib/s3-client.ts
import { S3Client } from '@aws-sdk/client-s3';

// Server-side only S3 client
// Credentials are loaded from environment variables on the server
// Never exposed to the client bundle
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export { s3Client };