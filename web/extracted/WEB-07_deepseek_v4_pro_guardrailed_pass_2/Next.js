// app/actions/update-user-profile.ts
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createLogger } from "@/lib/logger";

const logger = createLogger("update-user-profile");

// Schema for profile updates - strict allowlist of updatable fields
const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be 100 characters or less")
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less")
    .trim()
    .optional(),
  avatarUrl: z
    .string()
    .url("Avatar must be a valid URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "Avatar URL must use http or https protocol" }
    )
    .optional(),
  timezone: z
    .string()
    .max(50, "Timezone must be 50 characters or less")
    .trim()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Authenticate - get verified session
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn({
        event: "unauthorized_profile_update",
        action: "updateUserProfile",
        reason: "no_session",
      });
      return { success: false, error: "Authentication required" };
    }

    // 2. Authorize - user can only update their own profile
    // Identity comes from verified session, not from client-supplied userId
    if (session.user.id !== userId) {
      logger.warn({
        event: "forbidden_profile_update",
        action: "updateUserProfile",
        sessionUserId: session.user.id,
        requestedUserId: userId,
      });
      // Return 404-equivalent to prevent user enumeration
      return { success: false, error: "Profile not found" };
    }

    // 3. Validate input schema
    const validationResult = updateProfileSchema.safeParse(data);
    if (!validationResult.success) {
      logger.warn({
        event: "invalid_profile_data",
        action: "updateUserProfile",
        userId: session.user.id,
        errors: validationResult.error.flatten().fieldErrors,
      });
      return {
        success: false,
        error: "Invalid profile data provided",
      };
    }

    const validatedData = validationResult.data;

    // Ensure at least one field is being updated
    if (Object.keys(validatedData).length === 0) {
      return { success: false, error: "No fields to update" };
    }

    // 4. Build dynamic query with bound parameters only
    // Field names come from a fixed allowlist, not from user input
    const allowedFields = ["displayName", "bio", "avatarUrl", "timezone"] as const;
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (validatedData[field] !== undefined) {
        // Map camelCase to snake_case for database columns
        const dbColumn = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        updates.push(`${dbColumn} = $${paramIndex}`);
        values.push(validatedData[field]);
        paramIndex++;
      }
    }

    // Add userId as the final parameter for the WHERE clause
    values.push(session.user.id);
    const userIdParam = `$${paramIndex}`;

    const query = `
      UPDATE user_profiles
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE user_id = ${userIdParam}
      RETURNING user_id
    `;

    // 5. Execute with bound parameters - no SQL injection possible
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      logger.warn({
        event: "profile_not_found",
        action: "updateUserProfile",
        userId: session.user.id,
      });
      return { success: false, error: "Profile not found" };
    }

    // 6. Log successful update (no sensitive data)
    logger.info({
      event: "profile_updated",
      action: "updateUserProfile",
      userId: session.user.id,
      fieldsUpdated: Object.keys(validatedData),
    });

    // 7. Revalidate relevant paths to reflect changes
    revalidatePath(`/profile/${session.user.id}`);
    revalidatePath("/settings/profile");

    return { success: true };
  } catch (error) {
    // Log error without exposing sensitive details
    logger.error({
      event: "profile_update_error",
      action: "updateUserProfile",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    };
  }
}