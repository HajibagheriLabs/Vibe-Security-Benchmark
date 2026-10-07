// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { projects } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Security: Input validation with UUID format to prevent injection and enumeration
const deleteProjectSchema = z.object({
  projectId: z.string().uuid({
    message: "Invalid project identifier",
  }),
});

export const projectRouter = createTRPCRouter({
  deleteProject: protectedProcedure
    .input(deleteProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Security: Identity from verified session only, never from request body
      const userId = ctx.session.user.id;

      // Security: Ownership predicate inside WHERE clause - prevents unauthorized access
      // Returns 404 for non-owned projects to prevent resource enumeration
      const deletedProject = await ctx.db
        .delete(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.ownerId, userId)
          )
        )
        .returning({ id: projects.id })
        .then((rows) => rows[0]);

      // Security: 404 instead of 403 to prevent existence enumeration
      if (!deletedProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Security: Structured logging with no sensitive data
      ctx.logger.info({
        event: "project_deleted",
        projectId: deletedProject.id,
        userId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        projectId: deletedProject.id,
      };
    }),
});