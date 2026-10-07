// lib/db/schema.ts
import { pgTable, uuid, timestamp, integer, bigint, text, index } from 'drizzle-orm/pg-core';

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: uuid('user_id'),
  eventType: text('event_type').notNull(),
  pagePath: text('page_path'),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  duration: integer('duration'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('analytics_events_session_idx').on(table.sessionId),
  userIdx: index('analytics_events_user_idx').on(table.userId),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
  eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  pageViews: integer('page_views').default(0).notNull(),
  bounce: integer('bounce').default(0).notNull(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  startedAtIdx: index('sessions_started_at_idx').on(table.startedAt),
}));

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type Session = typeof sessions.$inferSelect;