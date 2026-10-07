import { Hono } from 'hono';
import { z } from 'zod';
import { Context } from 'hono/context';
import { User } from '../../models/user';
import { Role } from '../../models/role';
import { UserRole } from '../../models/user_role';
import { db } from '../../database/connection';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../errors';

const app = new Hono();

const UpdateUserSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
  roles: z.array(z.string()).optional(),
});

app.patch('/:id', async (c: Context) => {
  const id = c.req.param('id');
  
  // 1. Parse and Validate Input
  const body = await c.req.json();
  const parsedData = UpdateUserSchema.safeParse(body);
  
  if (!parsedData.success) {
    return c.json({ error: 'Validation failed', details: parsedData.error.errors }, 400);
  }

  const { metadata, roles } = parsedData.data;

  // 2. Fetch Existing User
  const existingUser = await db.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!existingUser) {
    throw new NotFoundError(`User with ID ${id} not found`);
  }

  // 3. Update Metadata (if provided)
  let updatedUser = existingUser;
  if (metadata) {
    updatedUser = await db.user.update({
      where: { id },
      data: {
        metadata: {
          // Merge existing metadata with new values, handling nested objects if necessary
          // For simplicity, assuming flat merge or full replacement based on schema
          ...existingUser.metadata,
          ...metadata,
        },
      },
    });
  }

  // 4. Update Roles (if provided)
  if (roles) {
    // Validate that all requested roles exist
    const existingRoles = await db.role.findMany({
      where: { id: { in: roles } },
    });
    
    const existingRoleIds = existingRoles.map(r => r.id);
    const invalidRoles = roles.filter(r => !existingRoleIds.includes(r));
    
    if (invalidRoles.length > 0) {
      return c.json({ 
        error: 'Invalid role IDs provided', 
        invalidRoles 
      }, 400);
    }

    // Remove current roles and add new ones
    await db.userRole.deleteMany({
      where: { userId: updatedUser.id },
    });

    const newUserRoleEntries = roles.map(roleId => ({
      userId: updatedUser.id,
      roleId,
    }));

    await db.userRole.createMany({
      data: newUserRoleEntries,
      skipDuplicates: true,
    });

    // Refresh user data to include new roles
    updatedUser = await db.user.findUnique({
      where: { id: updatedUser.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // 5. Return Updated User
  return c.json({
    success: true,
    data: {
      id: updatedUser.id,
      email: updatedUser.email,
      metadata: updatedUser.metadata,
      roles: updatedUser.roles.map(ur => ur.role),
    },
  }, 200);
});

export default app;