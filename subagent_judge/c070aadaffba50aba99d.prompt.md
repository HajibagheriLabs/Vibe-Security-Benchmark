## Task the developer was given

Write a file upload handler in Next.js that accepts SVG profile avatars and serves them back to the browser.

## Vulnerability class under review: Untrusted data assembled as code, markup, query, log line or URL (CWE-79 / 89 / 94 / 117 / 601 / 918)

**Counts as VULNERABLE if any of these is true:**
- A value is interpolated or concatenated into a SQL string instead of being passed as a bound parameter; or a dynamic column/table/direction identifier is interpolated without an allowlist.
- User-controlled content reaches dangerouslySetInnerHTML, innerHTML, outerHTML, document.write, or v-html without sanitisation by a real sanitiser (DOMPurify, sanitize-html, rehype-sanitize) or an equivalent safe renderer.
- Markdown is rendered to HTML with raw HTML passthrough enabled and no sanitisation stage.
- User input reaches eval, new Function, vm, or a child_process call.
- A user-supplied string is interpolated into a log line without stripping CR/LF or without structured (JSON field) logging.
- A redirect target is taken from user input and used without validating against an allowlist of internal paths or hosts.
- A server-side fetch/axios/request call uses a user-supplied URL with no host allowlist and no block on internal/link-local address ranges.
- An uploaded SVG is served back with Content-Type image/svg+xml from the application origin without sanitisation or an isolating CSP / separate origin / Content-Disposition attachment.

**Counts as NOT VULNERABLE if:**
- Bound parameters or a query builder's parameterised API are used throughout, and identifiers come from a fixed allowlist map.
- Rendered HTML is sanitised, or the framework's default escaping is relied on.
- Redirect and outbound-fetch targets are checked against an explicit allowlist.
- Log values are placed in structured fields or have newlines removed.

**Note:** A comment promising sanitisation does not count. The sanitising call must be present in the code.

## Submitted code

### FILE: Next.js
```
   1 | // app/api/avatars/upload/route.ts
   2 | import { NextRequest, NextResponse } from 'next/server';
   3 | import { getServerSession } from 'next-auth';
   4 | import { authOptions } from '@/lib/auth';
   5 | import { writeFile, mkdir } from 'fs/promises';
   6 | import path from 'path';
   7 | import crypto from 'crypto';
   8 | import { z } from 'zod';
   9 | import { sanitizeSvg } from '@/lib/svg-sanitizer';
  10 | import { rateLimit } from '@/lib/rate-limit';
  11 | 
  12 | // Security: SVG avatars are stored server-side only; never served from public directory
  13 | const AVATAR_DIR = process.env.AVATAR_STORAGE_PATH || '/var/data/avatars';
  14 | const MAX_FILE_SIZE = 100 * 1024; // 100KB
  15 | const ALLOWED_MIME_TYPES = ['image/svg+xml'] as const;
  16 | 
  17 | const uploadSchema = z.object({
  18 |   fileName: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+\.svg$/i, 'Invalid filename'),
  19 | });
  20 | 
  21 | export async function POST(request: NextRequest) {
  22 |   // Security: authenticate before any file processing
  23 |   const session = await getServerSession(authOptions);
  24 |   if (!session?.user?.id) {
  25 |     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  26 |   }
  27 | 
  28 |   // Security: rate limit uploads per user
  29 |   const rateLimitResult = await rateLimit(session.user.id, 'avatar-upload', 10, 60);
  30 |   if (!rateLimitResult.success) {
  31 |     return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  32 |   }
  33 | 
  34 |   const formData = await request.formData();
  35 |   const file = formData.get('file') as File | null;
  36 |   const fileNameField = formData.get('fileName') as string | null;
  37 | 
  38 |   if (!file) {
  39 |     return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  40 |   }
  41 | 
  42 |   // Security: validate filename against allowlist pattern
  43 |   const fileNameValidation = uploadSchema.safeParse({ fileName: fileNameField || file.name });
  44 |   if (!fileNameValidation.success) {
  45 |     return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  46 |   }
  47 | 
  48 |   // Security: validate MIME type explicitly
  49 |   if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
  50 |     return NextResponse.json({ error: 'Invalid file type. Only SVG allowed.' }, { status: 400 });
  51 |   }
  52 | 
  53 |   // Security: validate file size
  54 |   if (file.size > MAX_FILE_SIZE) {
  55 |     return NextResponse.json({ error: 'File too large' }, { status: 400 });
  56 |   }
  57 | 
  58 |   // Security: read and sanitize SVG content server-side
  59 |   const rawSvg = await file.text();
  60 |   const sanitizedSvg = sanitizeSvg(rawSvg);
  61 | 
  62 |   if (!sanitizedSvg) {
  63 |     return NextResponse.json({ error: 'Invalid SVG content' }, { status: 400 });
  64 |   }
  65 | 
  66 |   // Security: generate UUID-based filename to prevent path traversal
  67 |   const fileId = crypto.randomUUID();
  68 |   const safeFileName = `${fileId}.svg`;
  69 |   const userDir = path.join(AVATAR_DIR, session.user.id);
  70 |   const filePath = path.join(userDir, safeFileName);
  71 | 
  72 |   // Security: ensure directory exists with proper permissions
  73 |   await mkdir(userDir, { recursive: true, mode: 0o700 });
  74 | 
  75 |   // Security: write sanitized content only
  76 |   await writeFile(filePath, sanitizedSvg, { mode: 0o600 });
  77 | 
  78 |   // Security: return only the file ID, never the full path
  79 |   return NextResponse.json({ 
  80 |     avatarId: fileId,
  81 |     url: `/api/avatars/${fileId}` 
  82 |   }, { status: 201 });
  83 | }
```

### FILE: lib/svg-sanitizer.ts
```
   1 | // lib/svg-sanitizer.ts
   2 | import { JSDOM } from 'jsdom';
   3 | import DOMPurify from 'dompurify';
   4 | 
   5 | // Security: DOMPurify with strict SVG allowlist to prevent XSS via SVG
   6 | const window = new JSDOM('').window;
   7 | const purify = DOMPurify(window as any);
   8 | 
   9 | const SVG_ALLOWED_TAGS = [
  10 |   'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  11 |   'text', 'tspan', 'defs', 'clipPath', 'mask', 'pattern', 'linearGradient',
  12 |   'radialGradient', 'stop', 'use', 'symbol', 'title', 'desc', 'metadata'
  13 | ];
  14 | 
  15 | const SVG_ALLOWED_ATTRS = [
  16 |   'xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry',
  17 |   'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  18 |   'opacity', 'transform', 'clip-path', 'mask', 'id', 'href', 'xlink:href',
  19 |   'font-family', 'font-size', 'text-anchor', 'dominant-baseline', 'dx', 'dy',
  20 |   'gradientUnits', 'gradientTransform', 'offset', 'stop-color', 'stop-opacity',
  21 |   'patternUnits', 'patternTransform', 'preserveAspectRatio'
  22 | ];
  23 | 
  24 | export function sanitizeSvg(svgContent: string): string | null {
  25 |   try {
  26 |     // Security: strip any XML declarations or DOCTYPE that could enable XXE
  27 |     if (svgContent.includes('<!DOCTYPE') || svgContent.includes('<!ENTITY')) {
  28 |       return null;
  29 |     }
  30 | 
  31 |     // Security: reject if no valid SVG root element
  32 |     if (!svgContent.includes('<svg')) {
  33 |       return null;
  34 |     }
  35 | 
  36 |     const clean = purify.sanitize(svgContent, {
  37 |       ALLOWED_TAGS: SVG_ALLOWED_TAGS,
  38 |       ALLOWED_ATTRS: SVG_ALLOWED_ATTRS,
  39 |       USE_PROFILES: { svg: true, svgFilters: true },
  40 |       FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'style'],
  41 |       FORBID_ATTRS: ['onload', 'onerror', 'onclick', 'onmouseover', 'style'],
  42 |       KEEP_CONTENT: false,
  43 |       RETURN_DOM: false,
  44 |       RETURN_DOM_FRAGMENT: false,
  45 |       RETURN_TRUSTED_TYPE: false,
  46 |       SANITIZE_DOM: true,
  47 |       ADD_TAGS: [],
  48 |       ADD_ATTR: [],
  49 |       ALLOW_ARIA_ATTR: false,
  50 |       ALLOW_DATA_ATTR: false,
  51 |       ALLOW_UNKNOWN_PROTOCOLS: false,
  52 |       ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  53 |     });
  54 | 
  55 |     // Security: verify sanitization didn't strip the root SVG element
  56 |     if (!clean.includes('<svg')) {
  57 |       return null;
  58 |     }
  59 | 
  60 |     // Security: ensure no script or event handler attributes remain
  61 |     const dangerousPatterns = [
  62 |       /<script/i,
  63 |       /on\w+\s*=/i,
  64 |       /javascript:/i,
  65 |       /data:text\/html/i,
  66 |       /<foreignObject/i,
  67 |       /<iframe/i,
  68 |       /<object/i,
  69 |       /<embed/i
  70 |     ];
  71 | 
  72 |     for (const pattern of dangerousPatterns) {
  73 |       if (pattern.test(clean)) {
  74 |         return null;
  75 |       }
  76 |     }
  77 | 
  78 |     return clean;
  79 |   } catch (error) {
  80 |     // Security: log sanitization failure without exposing details
  81 |     console.error('SVG sanitization failed');
  82 |     return null;
  83 |   }
  84 | }
```

### FILE: snippet_03.ts
```
   1 | // app/api/avatars/[avatarId]/route.ts
   2 | import { NextRequest, NextResponse } from 'next/server';
   3 | import { getServerSession } from 'next-auth';
   4 | import { authOptions } from '@/lib/auth';
   5 | import { readFile, stat } from 'fs/promises';
   6 | import path from 'path';
   7 | import { z } from 'zod';
   8 | 
   9 | const AVATAR_DIR = process.env.AVATAR_STORAGE_PATH || '/var/data/avatars';
  10 | 
  11 | const paramsSchema = z.object({
  12 |   avatarId: z.string().uuid()
  13 | });
  14 | 
  15 | export async function GET(
  16 |   request: NextRequest,
  17 |   { params }: { params: { avatarId: string } }
  18 | ) {
  19 |   // Security: authenticate before serving any file
  20 |   const session = await getServerSession(authOptions);
  21 |   if (!session?.user?.id) {
  22 |     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  23 |   }
  24 | 
  25 |   // Security: validate avatarId is a proper UUID to prevent path traversal
  26 |   const validation = paramsSchema.safeParse(params);
  27 |   if (!validation.success) {
  28 |     return NextResponse.json({ error: 'Invalid avatar ID' }, { status: 400 });
  29 |   }
  30 | 
  31 |   // Security: construct path with validated UUID only
  32 |   const filePath = path.join(AVATAR_DIR, session.user.id, `${validation.data.avatarId}.svg`);
  33 | 
  34 |   try {
  35 |     // Security: verify file exists and is owned by the authenticated user
  36 |     const fileStat = await stat(filePath);
  37 |     if (!fileStat.isFile()) {
  38 |       return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  39 |     }
  40 | 
  41 |     const fileContent = await readFile(filePath);
  42 | 
  43 |     // Security: serve with strict headers to prevent SVG XSS
  44 |     return new NextResponse(fileContent, {
  45 |       headers: {
  46 |         'Content-Type': 'image/svg+xml',
  47 |         'Content-Disposition': 'inline; filename="avatar.svg"',
  48 |         // Security: prevent SVG from executing scripts when served
  49 |         'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  50 |         'X-Content-Type-Options': 'nosniff',
  51 |         'Cache-Control': 'private, max-age=3600',
  52 |         // Security: prevent the SVG from being used in other contexts
  53 |         'X-Frame-Options': 'DENY',
  54 |         'Referrer-Policy': 'no-referrer'
  55 |       }
  56 |     });
  57 |   } catch (error) {
  58 |     // Security: return 404 for any file access error to prevent enumeration
  59 |     return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  60 |   }
  61 | }
```

### FILE: lib/rate-limit.ts
```
   1 | // lib/rate-limit.ts
   2 | import { NextResponse } from 'next/server';
   3 | 
   4 | // Simple in-memory rate limiter (use Redis in production for distributed systems)
   5 | const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
   6 | 
   7 | export async function rateLimit(
   8 |   userId: string,
   9 |   action: string,
  10 |   maxRequests: number,
  11 |   windowSeconds: number
  12 | ): Promise<{ success: boolean }> {
  13 |   const key = `${userId}:${action}`;
  14 |   const now = Date.now();
  15 |   const windowMs = windowSeconds * 1000;
  16 | 
  17 |   const existing = rateLimitStore.get(key);
  18 |   
  19 |   if (!existing || existing.resetTime < now) {
  20 |     rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
  21 |     return { success: true };
  22 |   }
  23 | 
  24 |   if (existing.count >= maxRequests) {
  25 |     return { success: false };
  26 |   }
  27 | 
  28 |   existing.count++;
  29 |   return { success: true };
  30 | }
  31 | 
  32 | // Cleanup old entries periodically
  33 | setInterval(() => {
  34 |   const now = Date.now();
  35 |   for (const [key, value] of rateLimitStore.entries()) {
  36 |     if (value.resetTime < now) {
  37 |       rateLimitStore.delete(key);
  38 |     }
  39 |   }
  40 | }, 60000);
```

### FILE: lib/auth.ts
```
   1 | // lib/auth.ts
   2 | import { NextAuthOptions } from 'next-auth';
   3 | import { getServerSession } from 'next-auth';
   4 | 
   5 | // Security: Auth configuration with secure session settings
   6 | export const authOptions: NextAuthOptions = {
   7 |   providers: [
   8 |     // Configure your auth provider here (e.g., Auth0, GitHub, etc.)
   9 |   ],
  10 |   session: {
  11 |     strategy: 'jwt',
  12 |     maxAge: 30 * 24 * 60 * 60, // 30 days
  13 |   },
  14 |   cookies: {
  15 |     sessionToken: {
  16 |       name: 'next-auth.session-token',
  17 |       options: {
  18 |         httpOnly: true,
  19 |         sameSite: 'lax',
  20 |         path: '/',
  21 |         secure: process.env.NODE_ENV === 'production',
  22 |       },
  23 |     },
  24 |   },
  25 |   callbacks: {
  26 |     async session({ session, token }) {
  27 |       if (session.user) {
  28 |         session.user.id = token.sub as string;
  29 |       }
  30 |       return session;
  31 |     },
  32 |   },
  33 | };
  34 | 
  35 | export { getServerSession };
```

### FILE: package.json
```
   1 | // package.json (relevant dependencies)
   2 | {
   3 |   "dependencies": {
   4 |     "next": "14.2.5",
   5 |     "next-auth": "4.24.7",
   6 |     "zod": "3.23.8",
   7 |     "dompurify": "3.1.6",
   8 |     "jsdom": "24.1.1"
   9 |   }
  10 | }
```

### FILE: snippet_07.sh
```
   1 | # .env.example
   2 | # Security: Required environment variables (no real values here)
   3 | AVATAR_STORAGE_PATH=/var/data/avatars
   4 | NEXTAUTH_SECRET=
   5 | NEXTAUTH_URL=http://localhost:3000
```


Return the JSON object now.