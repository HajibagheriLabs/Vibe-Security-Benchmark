import { sql, eq, desc, and, gte, lte, count, avg, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvents, dailyMetrics } from "@/lib/db/schema";

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueSessions: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  totalRevenue: number;
  topPages: Array<{ pageUrl: string; views: number }>;
  topEvents: Array<{ eventName: string; count: number }>;
  deviceBreakdown: Array<{ deviceType: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  dailyTrend: Array<{ date: string; visits: number; revenue: number }>;
}

export async function getAnalyticsSummary(
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsSummary> {
  const conditions = [];
  if (startDate) conditions.push(gte(analyticsEvents.createdAt, startDate));
  if (endDate) conditions.push(lte(analyticsEvents.createdAt, endDate));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalEventsResult] = await db
    .select({ value: count() })
    .from(analyticsEvents)
    .where(whereClause);

  const [uniqueSessionsResult] = await db
    .select({ value: count(sql`DISTINCT ${analyticsEvents.sessionId}`) })
    .from(analyticsEvents)
    .where(whereClause);

  const [uniqueVisitorsResult] = await db
    .select({ value: count(sql`DISTINCT ${analyticsEvents.userId}`) })
    .from(analyticsEvents)
    .where(whereClause);

  const [avgDurationResult] = await db
    .select({ value: avg(dailyMetrics.avgSessionDuration) })
    .from(dailyMetrics)
    .where(
      startDate && endDate
        ? and(
            gte(dailyMetrics.date, startDate.toISOString().slice(0, 10)),
            lte(dailyMetrics.date, endDate.toISOString().slice(0, 10))
          )
        : undefined
    );

  const [bounceRateResult] = await db
    .select({ value: avg(dailyMetrics.bounceRate) })
    .from(dailyMetrics)
    .where(
      startDate && endDate
        ? and(
            gte(dailyMetrics.date, startDate.toISOString().slice(0, 10)),
            lte(dailyMetrics.date, endDate.toISOString().slice(0, 10))
          )
        : undefined
    );

  const [conversionRateResult] = await db
    .select({ value: avg(dailyMetrics.conversionRate) })
    .from(dailyMetrics)
    .where(
      startDate && endDate
        ? and(
            gte(dailyMetrics.date, startDate.toISOString().slice(0, 10)),
            lte(dailyMetrics.date, endDate.toISOString().slice(0, 10))
          )
        : undefined
    );

  const [revenueResult] = await db
    .select({ value: sum(dailyMetrics.revenue) })
    .from(dailyMetrics)
    .where(
      startDate && endDate
        ? and(
            gte(dailyMetrics.date, startDate.toISOString().slice(0, 10)),
            lte(dailyMetrics.date, endDate.toISOString().slice(0, 10))
          )
        : undefined
    );

  const topPages = await db
    .select({
      pageUrl: analyticsEvents.pageUrl,
      views: count(),
    })
    .from(analyticsEvents)
    .where(and(whereClause ?? sql`1=1`, sql`${analyticsEvents.pageUrl} IS NOT NULL`))
    .groupBy(analyticsEvents.pageUrl)
    .orderBy(desc(count()))
    .limit(10);

  const topEvents = await db
    .select({
      eventName: analyticsEvents.eventName,
      count: count(),
    })
    .from(analyticsEvents)
    .where(whereClause)
    .groupBy(analyticsEvents.eventName)
    .orderBy(desc(count()))
    .limit(10);

  const deviceBreakdown = await db
    .select({
      deviceType: analyticsEvents.deviceType,
      count: count(),
    })
    .from(analyticsEvents)
    .where(and(whereClause ?? sql`1=1`, sql`${analyticsEvents.deviceType} IS NOT NULL`))
    .groupBy(analyticsEvents.deviceType)
    .orderBy(desc(count()));

  const countryBreakdown = await db
    .select({
      country: analyticsEvents.country,
      count: count(),
    })
    .from(analyticsEvents)
    .where(and(whereClause ?? sql`1=1`, sql`${analyticsEvents.country} IS NOT NULL`))
    .groupBy(analyticsEvents.country)
    .orderBy(desc(count()))
    .limit(10);

  const dailyTrend = await db
    .select({
      date: dailyMetrics.date,
      visits: dailyMetrics.totalVisits,
      revenue: dailyMetrics.revenue,
    })
    .from(dailyMetrics)
    .where(
      startDate && endDate
        ? and(
            gte(dailyMetrics.date, startDate.toISOString().slice(0, 10)),
            lte(dailyMetrics.date, endDate.toISOString().slice(0, 10))
          )
        : undefined
    )
    .orderBy(dailyMetrics.date);

  return {
    totalEvents: totalEventsResult?.value ?? 0,
    uniqueSessions: uniqueSessionsResult?.value ?? 0,
    uniqueVisitors: uniqueVisitorsResult?.value ?? 0,
    avgSessionDuration: avgDurationResult?.value ?? 0,
    bounceRate: bounceRateResult?.value ?? 0,
    conversionRate: conversionRateResult?.value ?? 0,
    totalRevenue: revenueResult?.value ?? 0,
    topPages: topPages.map((p) => ({
      pageUrl: p.pageUrl ?? "/unknown",
      views: p.views,
    })),
    topEvents: topEvents.map((e) => ({
      eventName: e.eventName,
      count: e.count,
    })),
    deviceBreakdown: deviceBreakdown.map((d) => ({
      deviceType: d.deviceType ?? "unknown",
      count: d.count,
    })),
    countryBreakdown: countryBreakdown.map((c) => ({
      country: c.country ?? "unknown",
      count: c.count,
    })),
    dailyTrend: dailyTrend.map((t) => ({
      date: t.date,
      visits: t.visits,
      revenue: t.revenue,
    })),
  };
}

export async function getRecentEvents(limit = 50): Promise<typeof analyticsEvents.$inferSelect[]> {
  return db
    .select()
    .from(analyticsEvents)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
}