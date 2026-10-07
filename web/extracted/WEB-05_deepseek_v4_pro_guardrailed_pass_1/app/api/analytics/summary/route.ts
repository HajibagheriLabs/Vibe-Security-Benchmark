// app/api/analytics/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAnalyticsSummary } from '@/lib/analytics/queries';
import { z } from 'zod';

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export async function GET(request: NextRequest) {
  // Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const validation = querySchema.safeParse({
    days: searchParams.get('days') ?? undefined,
  });

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  try {
    // Identity from verified session only
    const summary = await getAnalyticsSummary(session.user.id, validation.data.days);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Analytics query failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}