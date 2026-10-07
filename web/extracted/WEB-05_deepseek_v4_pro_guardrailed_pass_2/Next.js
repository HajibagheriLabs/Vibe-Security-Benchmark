// src/lib/db/schema.ts
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    eventType: text('event_type').notNull(),
    pagePath: text('page_path').notNull(),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
    eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
    createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
  })
);

export const dailyMetrics = pgTable(
  'daily_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    pageViews: integer('page_views').notNull().default(0),
    uniqueVisitors: integer('unique_visitors').notNull().default(0),
    avgSessionDurationMs: integer('avg_session_duration_ms').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdDateIdx: index('daily_metrics_user_id_date_idx').on(table.userId, table.date),
  })
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type NewDailyMetric = typeof dailyMetrics.$inferInsert;