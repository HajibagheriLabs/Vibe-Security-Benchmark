// src/lib/db/queries/analytics.ts
import { and, eq, gte, lte, sql, desc, count, avg } from 'drizzle-orm';
import { db } from '../index';
import { analyticsEvents, dailyMetrics } from '../schema';
import type { AnalyticsEvent, DailyMetric } from '../schema';

// Security: All queries derive identity from the verified session (userId passed from server component),
// with ownership predicates inside WHERE clauses. No client-supplied identifiers are trusted.

export async function getAnalyticsSummary(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalPageViews: number;
  uniqueVisitors: number;
  avgSessionDurationMs: number;
  topPages: Array<{ pagePath: string; views: number }>;
}> {
  // Validate date format to prevent injection
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Invalid date format');
  }

  const summaryResult = await db
    .select({
      totalPageViews: sql<number>`sum(${dailyMetrics.pageViews})`,
      uniqueVisitors: sql<number>`sum(${dailyMetrics.uniqueVisitors})`,
      avgSessionDurationMs: sql<number>`avg(${dailyMetrics.avgSessionDurationMs})`,
    })
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.userId, userId),
        gte(dailyMetrics.date, startDate),
        lte(dailyMetrics.date, endDate)
      )
    );

  const topPagesResult = await db
    .select({
      pagePath: analyticsEvents.pagePath,
      views: count(analyticsEvents.id),
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.userId, userId),
        gte(analyticsEvents.createdAt, new Date(startDate)),
        lte(analyticsEvents.createdAt, new Date(endDate + 'T23:59:59Z'))
      )
    )
    .groupBy(analyticsEvents.pagePath)
    .orderBy(desc(count(analyticsEvents.id)))
    .limit(10);

  return {
    totalPageViews: summaryResult[0]?.totalPageViews ?? 0,
    uniqueVisitors: summaryResult[0]?.uniqueVisitors ?? 0,
    avgSessionDurationMs: Math.round(summaryResult[0]?.avgSessionDurationMs ?? 0),
    topPages: topPagesResult.map((row) => ({
      pagePath: row.pagePath,
      views: Number(row.views),
    })),
  };
}

export async function getRecentEvents(
  userId: string,
  limit: number = 20
): Promise<AnalyticsEvent[]> {
  // Enforce reasonable limits to prevent resource exhaustion
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  return db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, userId))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(safeLimit);
}

export async function getDailyMetrics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyMetric[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Invalid date format');
  }

  return db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.userId, userId),
        gte(dailyMetrics.date, startDate),
        lte(dailyMetrics.date, endDate)
      )
    )
    .orderBy(dailyMetrics.date);
}