import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const projectRouter = createTRPCRouter({
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;

      const project = await ctx.db.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.ownerId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      await ctx.db.project.delete({
        where: { id: projectId },
      });

      return { success: true };
    }),
});