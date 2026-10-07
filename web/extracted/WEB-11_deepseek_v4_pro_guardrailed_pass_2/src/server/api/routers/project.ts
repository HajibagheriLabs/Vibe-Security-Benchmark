// src/server/api/routers/project.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const projectRouter = createTRPCRouter({
  deleteProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Identity comes from the verified session only
      const userId = ctx.session.user.id;

      // Ownership predicate inside the WHERE clause - prevents unauthorized deletion
      // Returns 404 for non-owned resources to prevent enumeration
      const deletedProject = await ctx.db
        .delete(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.ownerId, userId)
          )
        )
        .returning({
          id: projects.id,
        })
        .execute();

      if (!deletedProject || deletedProject.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Structured logging with no user-controlled values interpolated
      ctx.logger.info({
        event: "project_deleted",
        projectId: input.projectId,
        userId,
      });

      return {
        success: true,
        projectId: input.projectId,
      };
    }),
});