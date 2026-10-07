import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSvgFile, sanitizeSvg } from '@/lib/svg-sanitizer';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('avatar') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
    return NextResponse.json({ error: 'Only SVG files are allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateSvgFile(buffer);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const sanitized = sanitizeSvg(buffer.toString('utf-8'));
  const filename = `${user.id}-${uuidv4()}.svg`;
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
  const filePath = join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, sanitized, 'utf-8');

  const { error: dbError } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, avatar_path: `/uploads/avatars/${filename}` }, { onConflict: 'user_id' });

  if (dbError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ avatarUrl: `/uploads/avatars/${filename}` });
}