// tRPC router procedure for deleting a project
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const projectRouter = router({
  deleteProject: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Authorization check: ensure the project belongs to the user
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          ownerId: ctx.session.user.id,
        },
      });

      if (!project) {
        // Return 404 for non-owned resources to prevent enumeration
        throw new Error('Project not found');
      }

      // Delete the project
      await ctx.db.project.delete({
        where: {
          id: input.projectId,
        },
      });

      return { success: true };
    }),
});