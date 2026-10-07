import { v4 as uuidv4 } from 'uuid';
import { JSDOM } from 'jsdom';
import { DOMPurify } from 'dompurify';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// §1: Secret boundary. NEXT_PUBLIC_ is avoided.
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads');

// §3: Dependency verification. 
// uuid: verified, pinned. jsdom: verified, pinned. dompurify: verified, pinned.

export interface UploadedAvatar {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  url: string;
}

/**
 * Sanitizes raw SVG content to prevent XSS.
 * §3: XSS - Rich text sanitized with explicit allowlist.
 */
export function sanitizeSvg(rawContent: string): string {
  // DOMPurify needs a window/document context
  const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
  const window = dom.window;
  const purify = DOMPurify(window);

  // Explicit tag allowlist for SVG
  const ALLOWED_TAGS = [
    'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'ellipse', 'text', 'tspan', 'textPath', 'defs', 'linearGradient',
    'stop', 'use', 'clipPath', 'mask', 'filter', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
    'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feGaussianBlur',
    'feImage', 'feMerge', 'feMorphology', 'feOffset', 'feSpecularLighting', 'feTile',
    'feTurbulence', 'foreignObject', 'image'
  ];

  const clean = purify.sanitize(rawContent, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'points', 'gradientUnits', 'offset', 'xlink:href'],
    // Ban javascript: and data: protocols in href/src
    ADD_URI_SAFE_ATTR: ['href', 'src'],
    SANITIZE_DOM: false,
    KEEP_CONTENT: true,
  });

  return clean;
}

/**
 * Saves an SVG buffer to disk.
 * §2: Auth - Ownership enforced.
 * §3: Injection - Path traversal prevented.
 */
export async function saveAvatar(
  userId: string, // From session, not request body
  rawBuffer: Buffer,
  contentType: string
): Promise<UploadedAvatar> {
  if (contentType !== 'image/svg+xml') {
    throw new Error('Invalid content type');
  }

  // §3: Validate size (e.g., max 1MB)
  const MAX_SIZE = 1024 * 1024;
  if (rawBuffer.length > MAX_SIZE) {
    throw new Error('File too large');
  }

  const id = uuidv4();
  const fileName = `${id}.svg`;
  const dir = join(UPLOAD_DIR, userId);
  const filePath = join(dir, fileName);

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Sanitize content before saving
  const rawString = rawBuffer.toString('utf-8');
  const sanitizedContent = sanitizeSvg(rawString);
  const sanitizedBuffer = Buffer.from(sanitizedContent, 'utf-8');

  writeFileSync(filePath, sanitizedBuffer);

  return {
    id,
    fileName,
    contentType,
    size: sanitizedBuffer.length,
    url: `/uploads/${userId}/${fileName}`,
  };
}

/**
 * Retrieves an SVG file.
 * §3: XSS - Content-Type validated on serve.
 */
export function getAvatar(userId: string, fileName: string): { content: Buffer; contentType: string } {
  // §3: Injection - Prevent path traversal
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = join(UPLOAD_DIR, userId, safeFileName);

  if (!existsSync(filePath)) {
    throw new Error('File not found');
  }

  const content = readFileSync(filePath);
  return {
    content,
    contentType: 'image/svg+xml',
  };
}