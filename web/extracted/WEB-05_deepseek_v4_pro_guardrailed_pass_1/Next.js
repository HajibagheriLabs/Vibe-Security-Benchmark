// lib/db/schema.ts
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    eventType: text('event_type').notNull(),
    pageUrl: text('page_url').notNull(),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
    eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
    createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
  })
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;