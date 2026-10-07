import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit';

const updateUserSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
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
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { metadata, roleIds, isActive } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = currentUser?.roles.some(
      (ur) => ur.role.name === 'ADMIN' || ur.role.name === 'SUPER_ADMIN'
    );

    if (!isAdmin && existingUser.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (roleIds && !isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can modify role assignments' },
        { status: 403 }
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          metadata: metadata ? { ...existingUser.metadata, ...metadata } : undefined,
          isActive: isActive ?? undefined,
        },
        include: { roles: { include: { role: true } } },
      });

      if (roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });

        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: id, roleId })),
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        include: { roles: { include: { role: true } } },
      });
    });

    await auditLog({
      action: 'USER_UPDATED',
      actorId: session.user.id,
      targetId: id,
      metadata: {
        changes: {
          metadata: metadata ? Object.keys(metadata) : undefined,
          roleIds,
          isActive,
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}