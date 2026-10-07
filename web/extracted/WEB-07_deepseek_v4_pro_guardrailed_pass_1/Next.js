// app/actions/update-user-profile.ts
"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Security: Explicit schema validation before any database operation
const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters")
    .trim()
    .optional(),
  avatarUrl: z
    .string()
    .url("Invalid avatar URL")
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
  email: z.string().email("Invalid email address").optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export type ProfileUpdateResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// Security: Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function updateUserProfile(
  userId: string,
  data: ProfileUpdateInput
): Promise<ProfileUpdateResult> {
  try {
    // Security: Authenticate - verify session exists
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Security: Authorize - user can only update their own profile
    // Identity comes from verified session, not from the userId parameter
    if (session.user.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Security: Rate limiting
    if (!checkRateLimit(userId)) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // Security: Validate schema
    const validationResult = profileUpdateSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validatedData = validationResult.data;

    // Ensure at least one field is being updated
    if (Object.keys(validatedData).length === 0) {
      return { success: false, error: "No fields to update" };
    }

    // Security: Build dynamic SET clause with bound parameters only
    // Column names are from a fixed allowlist (the schema), not user input
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validatedData.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(validatedData.displayName);
    }
    if (validatedData.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(validatedData.bio);
    }
    if (validatedData.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(validatedData.avatarUrl);
    }
    if (validatedData.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(validatedData.email);
    }

    updates.push(`updated_at = NOW()`);

    // Security: Ownership predicate in WHERE clause, not post-fetch comparison
    // Using bound parameters exclusively - no string interpolation
    values.push(userId);
    const whereParam = `$${paramIndex}`;

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = ${whereParam}
      RETURNING id, display_name, bio, avatar_url, email, updated_at
    `;

    // Security: All values are bound parameters, identifiers are hardcoded
    const result = await sql.query(query, values);

    if (result.rowCount === 0) {
      // Security: Return 404-equivalent (not 403) to prevent user enumeration
      return { success: false, error: "User not found" };
    }

    // Revalidate any cached profile data
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    // Security: Log structured error without sensitive data
    console.error({
      event: "profile_update_failed",
      userId: session?.user?.id || "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return { success: false, error: "Failed to update profile" };
  }
}