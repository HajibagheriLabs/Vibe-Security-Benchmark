// lib/analytics/queries.ts
import { and, eq, gte, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { analyticsEvents } from '@/lib/db/schema';

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  avgDurationMs: number | null;
  topPages: Array<{ pageUrl: string; count: number }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    pageUrl: string;
    createdAt: Date;
  }>;
}

export async function getAnalyticsSummary(
  userId: string,
  daysBack: number = 7
): Promise<AnalyticsSummary> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  const [totalResult, uniqueUsersResult, avgDurationResult, topPagesResult, recentEvents] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userId, userId),
            gte(analyticsEvents.createdAt, sinceDate)
          )
        ),
      db
        .select({ count: sql<number>`count(distinct ${analyticsEvents.userId})::int` })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userId, userId),
            gte(analyticsEvents.createdAt, sinceDate)
          )
        ),
      db
        .select({ avg: sql<number | null>`avg(${analyticsEvents.durationMs})` })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userId, userId),
            gte(analyticsEvents.createdAt, sinceDate),
            sql`${analyticsEvents.durationMs} is not null`
          )
        ),
      db
        .select({
          pageUrl: analyticsEvents.pageUrl,
          count: sql<number>`count(*)::int`,
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userId, userId),
            gte(analyticsEvents.createdAt, sinceDate)
          )
        )
        .groupBy(analyticsEvents.pageUrl)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
      db
        .select({
          id: analyticsEvents.id,
          eventType: analyticsEvents.eventType,
          pageUrl: analyticsEvents.pageUrl,
          createdAt: analyticsEvents.createdAt,
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.userId, userId),
            gte(analyticsEvents.createdAt, sinceDate)
          )
        )
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(20),
    ]);

  return {
    totalEvents: totalResult[0]?.count ?? 0,
    uniqueUsers: uniqueUsersResult[0]?.count ?? 0,
    avgDurationMs: avgDurationResult[0]?.avg ?? null,
    topPages: topPagesResult,
    recentEvents,
  };
}