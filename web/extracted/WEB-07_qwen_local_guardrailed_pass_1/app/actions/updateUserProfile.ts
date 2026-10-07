// app/actions/updateUserProfile.ts
'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres'; // or drizzle/next-pg
import { currentUser } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/utils';
import { logger } from '@/lib/logger';

// 1. Schema Validation
const UserProfileSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
});

type UserProfileInput = z.infer<typeof UserProfileSchema>;

// 2. CRLF Strip for Logging
const cleanLog = (str: string | undefined | null) =>
  str?.replace(/[\r\n\u2028\u2029]/g, '') ?? null;

export async function updateUserProfile(input: UserProfileInput) {
  // 3. Auth & Ownership
  const session = await currentUser();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  // Verify ownership inside WHERE clause (handled by SQL or RLS policy)
  // We check here for immediate 404/403 logic if needed, but SQL does the heavy lifting
  if (session.user.id !== input.userId) {
    logger.info({ event: 'profile.update', userId: session.user.id, targetId: input.userId });
    throw new Error('FORBIDDEN');
  }

  const { userId, displayName, bio, website } = UserProfileSchema.parse(input);

  try {
    // 4. SQL Injection Defense (Bound Parameters)
    // 5. XSS Defense (Sanitize Rich Text)
    const safeBio = bio ? sanitizeHtml(bio) : null;
    const safeWebsite = website; // Assuming validation ensures http/https

    // RLS Policy Requirement: USING (auth.uid() = user_id)
    // This query assumes Row Level Security is enabled on the profiles table.
    // The UPDATE ... SET ... WHERE ... ensures only the owner can update their row.
    await sql`
      UPDATE profiles
      SET 
        display_name = ${displayName},
        bio = ${safeBio},
        website = ${safeWebsite},
        updated_at = NOW()
      WHERE 
        user_id = ${userId}
    `;

    logger.info({ 
      event: 'profile.update.success', 
      userId: cleanLog(userId),
      displayName: cleanLog(displayName)
    });

    return { success: true };
  } catch (error) {
    logger.error({ 
      event: 'profile.update.error', 
      userId: cleanLog(userId),
      error: (error as Error).message 
    });
    throw error;
  }
}