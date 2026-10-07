// src/server/router/project.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '../lib/prisma';

export const projectRouter = router({
  deleteProject: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      const { projectId } = input;

      // Optionally verify existence or handle specific errors
      const deletedProject = await prisma.project.delete({
        where: {
          id: projectId,
        },
      });

      return deletedProject;
    }),
});