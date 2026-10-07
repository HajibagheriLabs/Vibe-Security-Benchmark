import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

export const projectRouter = router({
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const { db, user } = ctx;

      const project = await db.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (project.ownerId !== user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this project',
        });
      }

      await db.project.delete({
        where: { id: projectId },
      });

      return { success: true };
    }),
});