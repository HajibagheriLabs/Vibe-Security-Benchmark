import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Mock database types and functions for the sake of the implementation
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  metadata: Record<string, any>;
  updatedAt: Date;
}

// Mock DB Service
const db = {
  findUserById: async (id: string): Promise<User | null> => {
    // Simulate DB lookup
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      metadata: { department: 'Engineering' },
      updatedAt: new Date(),
    };
  },
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    // Simulate DB update
    return {
      ...{
        id,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        metadata: { department: 'Engineering' },
        updatedAt: new Date(),
      },
      ...data,
      updatedAt: new Date(),
    };
  },
};

// Validation Schema for the request body
const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'moderator']).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Check if user exists
    const existingUser = await db.findUserById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. Parse and Validate Body
    const body = await request.json();
    const validatedData = UserUpdateSchema.parse(body);

    // 3. Prepare Update Data
    // We only update fields that are present in the validated data
    const updateData: Partial<User> = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email;
    }
    if (validatedData.role !== undefined) {
      updateData.role = validatedData.role;
    }
    if (validatedData.metadata !== undefined) {
      // Merge metadata: new values override existing keys
      updateData.metadata = {
        ...existingUser.metadata,
        ...validatedData.metadata,
      };
    }

    // 4. Perform Update
    const updatedUser = await db.updateUser(id, updateData);

    // 5. Return Response
    return NextResponse.json(
      {
        message: 'User updated successfully',
        user: updatedUser,
      },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}