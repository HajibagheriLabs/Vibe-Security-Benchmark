import { NextResponse } from 'next/server';
import { saveAvatar } from '@/lib/uploads';
import { z } from 'zod';

// §2: Auth - Middleware should verify session and attach user to context.
// For this example, we assume a helper to get session user.
async function getSessionUser() {
  // Placeholder for actual session logic (e.g., next-auth, custom JWT)
  // Identity comes from verified session only.
  const sessionUser = { id: 'session-user-uuid' }; 
  if (!sessionUser) throw new Error('Unauthorized');
  return sessionUser;
}

// §3: Injection - Validate schema before use.
const AvatarSchema = z.object({
  file: z.instanceof(File).refine(f => f.type === 'image/svg+xml', {
    message: 'File must be an SVG',
  }),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    const parsed = AvatarSchema.safeParse({ file });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatar = await saveAvatar(user.id, buffer, file.type);

    // §2: Auth - Return 404 if resource doesn't exist (though here we just created it)
    // §3: Logging - Structured logging
    console.log({ event: 'avatar.upload', userId: user.id, avatarId: avatar.id });

    return NextResponse.json(avatar, { status: 201 });
  } catch (error) {
    console.error({ event: 'avatar.upload.error', error });
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}