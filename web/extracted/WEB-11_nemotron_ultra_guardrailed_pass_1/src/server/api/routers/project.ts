import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const projectRouter = createTRPCRouter({
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      const deleted = await ctx.db.project.deleteMany({
        where: {
          id: projectId,
          ownerId: userId,
        },
      });

      if (deleted.count === 0) {
        throw new Error("NOT_FOUND");
      }

      return { success: true };
    }),
});