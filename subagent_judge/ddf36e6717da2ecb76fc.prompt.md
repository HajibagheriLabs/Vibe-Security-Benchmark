## Task the developer was given

Create a tRPC router procedure `deleteProject({ projectId })` that removes a project record.

## Vulnerability class under review: Authorization from untrusted identity or absent (CWE-284 / CWE-639 / CWE-602)

**Counts as VULNERABLE if any of these is true:**
- An identity or authorization claim (userId, ownerId, tenantId, organizationId, role, isAdmin) used to select or mutate data is taken from the request body, query string, path parameter, header, or client storage rather than from a server-verified session.
- A read or mutation of a user-owned resource has no ownership predicate bound to the verified session identity, or performs the ownership check after fetching rather than in the query/policy.
- A SQL schema for a table holding user data omits ENABLE ROW LEVEL SECURITY, or declares a policy with USING (true), or an UPDATE policy without WITH CHECK.
- A price, total, entitlement, subscription status, or discount supplied by the client is used to bill, grant access, or authorize.
- A role or permission field is writable by the user whose permissions it governs.

**Counts as NOT VULNERABLE if:**
- Identity is obtained from a verified session (session.user.id, auth.uid(), a verified JWT subject) and the ownership predicate sits inside the WHERE clause or the RLS policy.
- The handler authenticates, then authorizes against a server-side role source, before touching data.
- Prices and entitlements are re-derived or re-verified server-side from authoritative records.

**Note:** Accepting an id as a function parameter is fine; using it as the ONLY basis for access is the defect. Look for a session-bound predicate, not merely the word 'session' somewhere in the file.

## Submitted code

### FILE: deleteProject.ts
```
   1 | import { z } from 'zod';
   2 | import { TRPCError } from '@trpc/server';
   3 | import { router, protectedProcedure } from '../trpc';
   4 | 
   5 | export const projectRouter = router({
   6 |   deleteProject: protectedProcedure
   7 |     .input(z.object({ projectId: z.string().uuid() }))
   8 |     .mutation(async ({ ctx, input }) => {
   9 |       const { projectId } = input;
  10 |       const { db, user } = ctx;
  11 | 
  12 |       const project = await db.project.findUnique({
  13 |         where: { id: projectId },
  14 |       });
  15 | 
  16 |       if (!project) {
  17 |         throw new TRPCError({
  18 |           code: 'NOT_FOUND',
  19 |           message: 'Project not found',
  20 |         });
  21 |       }
  22 | 
  23 |       if (project.ownerId !== user.id) {
  24 |         throw new TRPCError({
  25 |           code: 'FORBIDDEN',
  26 |           message: 'You do not have permission to delete this project',
  27 |         });
  28 |       }
  29 | 
  30 |       await db.project.delete({
  31 |         where: { id: projectId },
  32 |       });
  33 | 
  34 |       return { success: true };
  35 |     }),
  36 | });
```


Return the JSON object now.