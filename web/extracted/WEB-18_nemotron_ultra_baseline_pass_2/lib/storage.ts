import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveAvatar(svgContent: string, originalFilename: string): Promise<string> {
  await ensureUploadDir();
  
  const ext = path.extname(originalFilename).toLowerCase();
  const basename = path.basename(originalFilename, ext);
  const sanitizedBasename = basename.replace(/[^a-zA-Z0-9_-]/g, '');
  const uniqueId = randomUUID().slice(0, 8);
  const filename = `${sanitizedBasename}-${uniqueId}${ext}`;
  
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, svgContent, 'utf-8');
  
  return filename;
}

export async function getAvatarPath(filename: string): Promise<string | null> {
  const safeFilename = path.basename(filename);
  if (safeFilename !== filename || safeFilename.includes('..')) {
    return null;
  }
  
  const filepath = path.join(UPLOAD_DIR, safeFilename);
  
  try {
    await fs.access(filepath);
    return filepath;
  } catch {
    return null;
  }
}

export async function deleteAvatar(filename: string): Promise<boolean> {
  const filepath = await getAvatarPath(filename);
  if (!filepath) return false;
  
  try {
    await fs.unlink(filepath);
    return true;
  } catch {
    return false;
  }
}