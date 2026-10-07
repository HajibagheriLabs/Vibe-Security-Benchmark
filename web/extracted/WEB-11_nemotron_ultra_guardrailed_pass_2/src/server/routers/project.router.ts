import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const projectRouter = createTRPCRouter({
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      const project = await ctx.db.project.findFirst({
        where: { id: projectId, ownerId: userId },
        select: { id: true },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.project.delete({ where: { id: projectId } });

      return { success: true };
    }),
});