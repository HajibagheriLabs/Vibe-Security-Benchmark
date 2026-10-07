// project.router.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";

export const projectRouter = router({
  deleteProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      // Verify the project exists and belongs to the current user
      const existingProject = await ctx.db.query.projects.findFirst({
        where: (project, { eq, and }) =>
          and(eq(project.id, projectId), eq(project.userId, userId)),
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you do not have permission to delete it.",
        });
      }

      // Delete the project
      await ctx.db.delete(projects).where(eq(projects.id, projectId));

      return {
        success: true,
        deletedProjectId: projectId,
      };
    }),
});