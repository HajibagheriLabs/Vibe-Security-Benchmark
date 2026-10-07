import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  country: text("country"),
  deviceType: text("device_type"),
  value: real("value"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dailyMetrics = sqliteTable("daily_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  totalVisits: integer("total_visits").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  bounceRate: real("bounce_rate").notNull().default(0),
  avgSessionDuration: real("avg_session_duration").notNull().default(0),
  conversionRate: real("conversion_rate").notNull().default(0),
  revenue: real("revenue").notNull().default(0),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type NewDailyMetric = typeof dailyMetrics.$inferInsert;