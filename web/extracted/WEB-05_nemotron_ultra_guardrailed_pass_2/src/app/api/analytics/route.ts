import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { analytics } from '@/lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metric: z.enum(['pageviews', 'sessions', 'users', 'bounceRate']).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    metric: searchParams.get('metric') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { startDate, endDate, metric } = parsed.data;
  const userId = session.user.id;

  const conditions = [eq(analytics.userId, userId)];
  if (startDate) conditions.push(gte(analytics.date, new Date(startDate)));
  if (endDate) conditions.push(lte(analytics.date, new Date(endDate)));

  const results = await db
    .select({
      date: analytics.date,
      pageviews: analytics.pageviews,
      sessions: analytics.sessions,
      users: analytics.users,
      bounceRate: analytics.bounceRate,
    })
    .from(analytics)
    .where(and(...conditions))
    .orderBy(desc(analytics.date))
    .limit(90);

  const data = metric
    ? results.map((r) => ({ date: r.date, value: r[metric] }))
    : results;

  return NextResponse.json({ data });
}