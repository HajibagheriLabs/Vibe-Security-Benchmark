import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  
  const parsed = updateUserSchema.safeParse(body);
  if (! parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { name, email, role } = parsed.data;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isSelf = session.user.id === id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (role && !isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (email) {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && isAdmin && { role }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}