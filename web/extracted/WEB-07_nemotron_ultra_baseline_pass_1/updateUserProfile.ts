'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof profileSchema>;

export type UpdateProfileResult =
  | { success: true; data: UserProfile }
  | { success: false; error: string; code: string };

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UpdateProfileResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required', code: 'MISSING_USER_ID' };
  }

  const validation = profileSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors.map(e => e.message).join(', '),
      code: 'VALIDATION_ERROR',
    };
  }

  const supabase = await createServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      full_name: validation.data.fullName ?? null,
      avatar_url: validation.data.avatarUrl ?? null,
      bio: validation.data.bio ?? null,
      website: validation.data.website ?? null,
      location: validation.data.location ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Profile not found', code: 'NOT_FOUND' };
    }
    console.error('Profile update error:', error);
    return { success: false, error: 'Failed to update profile', code: 'DATABASE_ERROR' };
  }

  revalidatePath(`/profile/${userId}`);
  revalidatePath('/settings/profile');

  return { success: true, data: profile as UserProfile };
}