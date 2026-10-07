// app/actions/userProfile.ts

'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

export async function updateUserProfile(userId: string, data: {
  name?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
}) {
  try {
    // Construct dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${paramIndex}`);
      values.push(data.bio);
      paramIndex++;
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex}`);
      values.push(data.avatar_url);
      paramIndex++;
    }

    // If no fields to update, return early
    if (fields.length === 0) {
      return { success: true, message: 'No changes made.' };
    }

    // Add the WHERE clause condition
    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await sql.query(query, values);

    // Revalidate the user profile page to reflect changes
    revalidatePath('/profile');

    return { success: true, message: 'Profile updated successfully.' };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return { success: false, message: 'Failed to update user profile.' };
  }
}