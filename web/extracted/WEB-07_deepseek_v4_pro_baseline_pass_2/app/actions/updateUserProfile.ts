"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().nullable(),
});

export type UpdateUserProfileData = z.infer<typeof profileSchema>;

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const parsed = profileSchema.parse(data);

    // Build dynamic SET clause from provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return { success: false, error: "No fields to update" };
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id
    `;

    const result = await sql.query(query, values);

    if (result.rowCount === 0) {
      return { success: false, error: "User not found" };
    }

    revalidatePath(`/profile/${userId}`);
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    console.error("Error updating user profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}