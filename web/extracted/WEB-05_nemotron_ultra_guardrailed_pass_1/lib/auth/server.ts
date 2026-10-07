// lib/auth/server.ts
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getDb } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'development-secret-change-in-production'
);

export interface SessionUser {
  id: string;
  email: string;
  roles: string[];
}

export async function getServerSession(): Promise<{ user: SessionUser } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.sub as string;

    // Verify user still exists and get current roles from server-side store
    const db = getDb();
    const user = await db.select({
      id: users.id,
      email: users.email,
      roles: users.roles,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) return null;

    return {
      user: {
        id: user[0].id,
        email: user[0].email,
        roles: user[0].roles ?? [],
      },
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, email: string, roles: string[]): Promise<string> {
  const token = await new SignJWT({ sub: userId, email, roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);

  return token;
}