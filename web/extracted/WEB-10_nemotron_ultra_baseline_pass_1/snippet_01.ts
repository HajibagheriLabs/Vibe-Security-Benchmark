import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
  roles: z.array(z.enum(['USER', 'ADMIN', 'MODERATOR', 'EDITOR'])).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSelf = session.user.id === id;
    const isAdmin = session.user.roles?.some(r => r.name === 'ADMIN') ?? false;

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (validatedData.roles && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can modify roles' }, { status: 403 });
    }

    if (validatedData.email && validatedData.email !== targetUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          name: validatedData.name,
          email: validatedData.email,
          image: validatedData.image,
          metadata: validatedData.metadata,
        },
      });

      if (validatedData.roles && isAdmin) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: validatedData.roles.map(roleName => ({
            userId: id,
            role: { connect: { name: roleName } },
          })),
        });
      }

      return tx.user.findUnique({
        where: { id },
        include: { roles: { include: { role: true } } },
      });
    });

    return NextResponse.json({
      user: {
        id: updatedUser!.id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        image: updatedUser!.image,
        roles: updatedUser!.roles.map(ur => ur.role.name),
        metadata: updatedUser!.metadata,
        createdAt: updatedUser!.createdAt,
        updatedAt: updatedUser!.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}