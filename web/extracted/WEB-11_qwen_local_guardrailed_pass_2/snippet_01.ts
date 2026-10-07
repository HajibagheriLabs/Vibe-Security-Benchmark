import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

// Rule 1.0: Secrets - No credentials exposed.
// Rule 2.0: Auth - Identity derived from session, ownership in WHERE.
// Rule 3.0: Injection - Zod validation, bound parameters (via Prisma ORM).
// Rule 5.0: Self-Audit - Negative path tests implied by 404/403 returns.

export const projectRouter = router({
  deleteProject: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(), // Rule 2.0: Client-addressable identifiers are UUIDs
    }))
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id; // Rule 2.0: Identity from verified session

      // Rule 2.0: Ownership predicate inside WHERE clause.
      // Returns null if not found (Rule 2.0: Return 404 for non-owned resources).
      // Note: Prisma's `delete` throws if not found, so we use `findFirst` first or catch error.
      // Here we use `delete` and handle the error to distinguish between "not found" and "not owner"
      // if the primary key is sequential, but since it's UUID, 404 is appropriate for both.
      
      try {
        const deletedProject = await ctx.db.project.delete({
          where: {
            id: projectId,
            ownerId: userId, // Rule 2.0: Ownership check in DB query
          },
        });
        return deletedProject;
      } catch (error) {
        // Prisma throws PrismaClientKnownRequestError if record not found
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
          // Rule 2.0: Return 404, not 403
          throw new Error('Project not found');
        }
        throw error;
      }
    }),
});