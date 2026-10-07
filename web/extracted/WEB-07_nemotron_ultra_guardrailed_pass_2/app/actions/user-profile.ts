"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateUserProfile(
  userId: string,
  data: unknown
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.id !== userId) {
    return { success: false, error: "Not found" };
  }

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  const { displayName, bio, avatarUrl } = parsed.data;

  await db
    .updateTable("users")
    .set({
      display_name: displayName,
      bio,
      avatar_url: avatarUrl || null,
      updated_at: new Date(),
    })
    .where("id", "=", userId)
    .executeTakeFirstOrThrow();

  return { success: true };
}