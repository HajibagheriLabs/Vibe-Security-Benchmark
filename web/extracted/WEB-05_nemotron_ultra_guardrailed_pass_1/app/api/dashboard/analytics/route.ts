// app/api/dashboard/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/server';
import { analyticsEvents, sessions } from '@/lib/db/schema';
import { eq, gte, lt, count, avg, sql, desc } from 'drizzle-orm';
import { getServerSession } from '@/lib/auth/server';
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate - identity from verified session only
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorize - check if user has analytics access
    if (!session.user.roles?.includes('analytics:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { startDate, endDate } = parsed.data;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;

    const db = getDb();

    // All queries use bound parameters, ownership predicate in WHERE clause
    const userId = session.user.id;

    // Parallel queries for performance
    const [
      pageViewsResult,
      uniqueVisitorsResult,
      bounceRateResult,
      avgSessionResult,
      topPagesResult,
      trafficSourcesResult,
    ] = await Promise.all([
      // Total page views
      db.select({ count: count() })
        .from(analyticsEvents)
        .where(
          sql`${analyticsEvents.userId} = ${userId} 
              AND ${analyticsEvents.eventType} = 'pageview'
              AND ${analyticsEvents.createdAt} >= ${start}
              AND ${analyticsEvents.createdAt} < ${end}`
        ),

      // Unique visitors (distinct sessions)
      db.select({ count: count(sql`distinct ${analyticsEvents.sessionId}`) })
        .from(analyticsEvents)
        .where(
          sql`${analyticsEvents.userId} = ${userId}
              AND ${analyticsEvents.createdAt} >= ${start}
              AND ${analyticsEvents.createdAt} < ${end}`
        ),

      // Bounce rate
      db.select({ 
        bounced: count(sql`case when ${sessions.bounce} = 1 then 1 end`),
        total: count()
      })
        .from(sessions)
        .where(
          sql`${sessions.userId} = ${userId}
              AND ${sessions.startedAt} >= ${start}
              AND ${sessions.startedAt} < ${end}`
        ),

      // Average session duration
      db.select({ avgDuration: avg(sessions.endedAt ? sql`extract(epoch from (${sessions.endedAt} - ${sessions.startedAt}))` : sql`0`) })
        .from(sessions)
        .where(
          sql`${sessions.userId} = ${userId}
              AND ${sessions.startedAt} >= ${start}
              AND ${sessions.startedAt} < ${end}
              AND ${sessions.endedAt} is not null`
        ),

      // Top pages
      db.select({
        path: analyticsEvents.pagePath,
        views: count(),
      })
        .from(analyticsEvents)
        .where(
          sql`${analyticsEvents.userId} = ${userId}
              AND ${analyticsEvents.eventType} = 'pageview'
              AND ${analyticsEvents.pagePath} is not null
              AND ${analyticsEvents.createdAt} >= ${start}
              AND ${analyticsEvents.createdAt} < ${end}`
        )
        .groupBy(analyticsEvents.pagePath)
        .orderBy(desc(count()))
        .limit(10),

      // Traffic sources
      db.select({
        source: analyticsEvents.referrer,
        visits: count(),
      })
        .from(analyticsEvents)
        .where(
          sql`${analyticsEvents.userId} = ${userId}
              AND ${analyticsEvents.eventType} = 'pageview'
              AND ${analyticsEvents.referrer} is not null
              AND ${analyticsEvents.createdAt} >= ${start}
              AND ${analyticsEvents.createdAt} < ${end}`
        )
        .groupBy(analyticsEvents.referrer)
        .orderBy(desc(count()))
        .limit(10),
    ]);

    const bounced = Number(bounceRateResult[0]?.bounced ?? 0);
    const totalSessions = Number(bounceRateResult[0]?.total ?? 0);

    return NextResponse.json({
      pageViews: Number(pageViewsResult[0]?.count ?? 0),
      uniqueVisitors: Number(uniqueVisitorsResult[0]?.count ?? 0),
      bounceRate: totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0,
      avgSessionDuration: Math.round(Number(avgSessionResult[0]?.avgDuration ?? 0)),
      topPages: topPagesResult.map(row => ({
        path: row.path ?? '/',
        views: Number(row.views),
      })),
      trafficSources: trafficSourcesResult.map(row => ({
        source: row.source ?? 'Direct',
        visits: Number(row.visits),
      })),
    });
  } catch (error) {
    // Structured logging with redaction - no raw error payloads
    console.error({ 
      event: 'analytics_fetch_failed', 
      userId: (await getServerSession())?.user?.id ?? 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}