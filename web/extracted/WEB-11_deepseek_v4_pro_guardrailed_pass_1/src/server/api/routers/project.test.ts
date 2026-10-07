// src/server/api/routers/project.test.ts
import { describe, it, expect, vi } from "vitest";
import { projectRouter } from "./project";
import { TRPCError } from "@trpc/server";

// Security: Negative-path tests for authorization
describe("deleteProject", () => {
  const mockDb = {
    delete: vi.fn(),
  };

  const mockLogger = {
    info: vi.fn(),
  };

  const createCaller = (session: any) => {
    const caller = projectRouter.createCaller({
      db: mockDb as any,
      session,
      logger: mockLogger as any,
    });
    return caller;
  };

  it("should return 401 for unauthenticated users", async () => {
    const caller = createCaller({ user: null });
    
    await expect(
      caller.deleteProject({ projectId: "123e4567-e89b-12d3-a456-426614174000" })
    ).rejects.toThrow(TRPCError);
  });

  it("should return 404 for non-owned projects", async () => {
    const userId = "123e4567-e89b-12d3-a456-426614174001";
    const otherUserId = "123e4567-e89b-12d3-a456-426614174002";
    const projectId = "123e4567-e89b-12d3-a456-426614174003";

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    const caller = createCaller({ user: { id: userId } });

    await expect(
      caller.deleteProject({ projectId })
    ).rejects.toThrowError(
      new TRPCError({ code: "NOT_FOUND", message: "Project not found" })
    );
  });

  it("should successfully delete owned project", async () => {
    const userId = "123e4567-e89b-12d3-a456-426614174001";
    const projectId = "123e4567-e89b-12d3-a456-426614174003";

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: projectId }]),
      }),
    });

    const caller = createCaller({ user: { id: userId } });

    const result = await caller.deleteProject({ projectId });

    expect(result).toEqual({
      success: true,
      projectId,
    });
  });

  it("should reject invalid project IDs", async () => {
    const caller = createCaller({ user: { id: "valid-user-id" } });

    await expect(
      caller.deleteProject({ projectId: "not-a-uuid" })
    ).rejects.toThrow();
  });
});