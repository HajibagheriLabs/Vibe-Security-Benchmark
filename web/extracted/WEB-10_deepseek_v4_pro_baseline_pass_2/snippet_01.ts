// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Role, Prisma } from '@prisma/client';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  roles: z.array(z.nativeEnum(Role)).optional(),
});

type UpdateUserInput = z.infer<typeof updateUserSchema>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can update user metadata and roles
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: UpdateUserInput;
    try {
      const json = await request.json();
      body = updateUserSchema.parse(json);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent self-demotion if user is the only admin
    if (
      body.roles &&
      !body.roles.includes(Role.ADMIN) &&
      existingUser.id === session.user.id
    ) {
      const adminCount = await prisma.user.count({
        where: {
          roles: {
            some: { role: Role.ADMIN },
          },
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin role' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata as Prisma.InputJsonValue;
    }

    // Handle role updates in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update basic user fields
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Update roles if provided
      if (body.roles !== undefined) {
        // Delete existing roles
        await tx.userRole.deleteMany({
          where: { userId },
        });

        // Create new role assignments
        if (body.roles.length > 0) {
          await tx.userRole.createMany({
            data: body.roles.map((role) => ({
              userId,
              role,
            })),
          });
        }
      }

      // Return user with roles
      return tx.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            select: {
              role: true,
              assignedAt: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}