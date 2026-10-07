// trpc/routers/project.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { eq } from 'drizzle-orm';
import { projects } from '../../db/schema';
import { db } from '../../db';

export const projectRouter = router({
  deleteProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const userId = ctx.user.id;

      // Verify the project exists and belongs to the current user
      const project = await db.query.projects.findFirst({
        where: (projects, { eq, and }) =>
          and(eq(projects.id, projectId), eq(projects.userId, userId)),
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or you do not have permission to delete it',
        });
      }

      // Delete the project
      await db.delete(projects).where(eq(projects.id, projectId));

      return {
        success: true,
        deletedProjectId: projectId,
      };
    }),
});