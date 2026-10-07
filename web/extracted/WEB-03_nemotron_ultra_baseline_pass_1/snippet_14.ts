import { generateUniqueKey } from '@/lib/s3';

const key = generateUniqueKey('document.pdf', 'documents/invoices');
// Result: documents/invoices/1704067200000-abc123def-document.pdf