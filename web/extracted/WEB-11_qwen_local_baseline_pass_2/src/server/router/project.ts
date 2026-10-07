// src/server/router/project.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '../db'; // Assuming a Prisma or similar ORM instance

export const projectRouter = router({
  deleteProject: publicProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const { projectId } = input;

      const deletedProject = await db.project.delete({
        where: {
          id: projectId,
        },
      });

      return deletedProject;
    }),
});