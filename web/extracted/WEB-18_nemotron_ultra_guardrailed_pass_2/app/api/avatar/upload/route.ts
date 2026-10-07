import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'crypto';

// Server-only Supabase client with service role for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Validation schema for upload request
const uploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.type === 'image/svg+xml',
    'Only SVG files are allowed'
  ).refine(
    (file) => file.size <= 1024 * 1024, // 1MB limit
    'File size must be less than 1MB'
  ),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse and validate form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = uploadSchema.safeParse({ file });
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    // Read and sanitize SVG content
    const svgText = await file.text();
    const sanitizedSvg = sanitizeSvg(svgText);
    
    if (!sanitizedSvg) {
      return NextResponse.json({ error: 'Invalid SVG content' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = '.svg';
    const fileName = `${crypto.randomUUID()}${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload to Supabase Storage (private bucket)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, new Blob([sanitizedSvg], { type: 'image/svg+xml' }), {
        contentType: 'image/svg+xml',
        upsert: false,
      });

    if (uploadError) {
      console.error({ event: 'avatar_upload_failed', userId: user.id, error: uploadError.message });
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Update user profile with avatar path (RLS ensures ownership)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_path: filePath })
      .eq('id', user.id);

    if (profileError) {
      // Cleanup orphaned file
      await supabaseAdmin.storage.from('avatars').remove([filePath]);
      console.error({ event: 'avatar_profile_update_failed', userId: user.id, error: profileError.message });
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    console.info({ event: 'avatar_uploaded', userId: user.id, fileName });
    return NextResponse.json({ success: true, path: filePath });

  } catch (error) {
    console.error({ event: 'avatar_upload_error', error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Strict SVG sanitization - removes scripts, event handlers, external refs
function sanitizeSvg(svg: string): string | null {
  // Reject if contains dangerous patterns
  const dangerousPatterns = [
    /<script\b/i,
    /on\w+\s*=/i,           // Event handlers
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /expression\s*\(/i,     // CSS expressions
    /xlink:href/i,          // External references
    /href\s*=\s*["']?\s*(?!#)/i, // External links (allow fragment-only)
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<link\b/i,
    /<style\b/i,            // Style blocks (allow inline style attr)
    /@import/i,
    /behavior\s*:/i,
    /-moz-binding/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(svg)) {
      return null;
    }
  }

  // Parse and validate SVG structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return null;
  }

  const svgElement = doc.documentElement;
  if (svgElement.tagName !== 'svg') {
    return null;
  }

  // Remove any remaining dangerous attributes from all elements
  const allElements = doc.querySelectorAll('*');
  const allowedAttributes = new Set([
    'id', 'class', 'style', 'transform', 'd', 'fill', 'stroke', 'stroke-width',
    'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity',
    'fill-opacity', 'stroke-opacity', 'width', 'height', 'viewBox', 'x', 'y',
    'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points', 'pathLength',
    'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
    'vector-effect', 'marker-start', 'marker-mid', 'marker-end', 'clip-path',
    'mask', 'filter', 'opacity', 'visibility', 'display', 'overflow',
    'enable-background', 'color', 'color-interpolation', 'color-rendering',
    'solid-color', 'solid-opacity', 'stop-color', 'stop-opacity', 'offset',
    'gradientTransform', 'gradientUnits', 'spreadMethod', 'xlink:href' // Only for internal gradients/patterns
  ]);

  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (!allowedAttributes.has(name) && !name.startsWith('data-')) {
        el.removeAttribute(attr.name);
      }
      // Sanitize xlink:href to only allow internal references
      if (name === 'xlink:href' || name === 'href') {
        const value = attr.value.trim();
        if (!value.startsWith('#')) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });

  // Ensure SVG has required attributes
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!svgElement.hasAttribute('viewBox') && (svgElement.hasAttribute('width') || svgElement.hasAttribute('height'))) {
    const width = svgElement.getAttribute('width') || '100';
    const height = svgElement.getAttribute('height') || '100';
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  return new XMLSerializer().serializeToString(doc);
}