"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof profileSchema>;

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileInput
): Promise<{ success: true } | { success: false; error: string }> {
  // Validate input
  const parsed = profileSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const updates = parsed.data;

  // Build dynamic SET clause from provided fields only
  const entries = Object.entries(updates).filter(
    ([, value]) => value !== undefined
  );

  if (entries.length === 0) {
    return { success: false, error: "No fields to update" };
  }

  const setClauses = entries.map(
    ([key], index) => `${key} = $${index + 2}`
  );
  const values = entries.map(([, value]) => value);

  try {
    await sql.query(
      `UPDATE users SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $1`,
      [userId, ...values]
    );

    revalidatePath(`/profile/${userId}`);
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return {
      success: false,
      error: "Database error while updating profile",
    };
  }
}