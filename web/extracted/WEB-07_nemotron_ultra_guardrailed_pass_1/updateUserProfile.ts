'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (user.id !== userId) {
    return { success: false, error: 'Forbidden' };
  }

  const parsed = UpdateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio,
      avatar_url: parsed.data.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return { success: false, error: 'Failed to update profile' };
  }

  revalidatePath('/profile');
  return { success: true };
}