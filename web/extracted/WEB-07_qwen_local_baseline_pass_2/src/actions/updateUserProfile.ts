// src/actions/updateUserProfile.ts
'use server'

import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const UserProfileSchema = z.object({
  userId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).max(255).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(500).optional(),
  }),
})

export async function updateUserProfile(userId: string, data: { name?: string; email?: string; bio?: string }) {
  const validatedData = UserProfileSchema.parse({ userId, data })
  
  const { name, email, bio } = validatedData.data
  
  try {
    await sql`
      UPDATE users
      SET 
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        bio = COALESCE(${bio}, bio),
        updated_at = NOW()
      WHERE id = ${validatedData.userId}
    `
    
    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}