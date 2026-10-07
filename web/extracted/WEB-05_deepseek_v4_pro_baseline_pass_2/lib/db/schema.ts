// lib/db/schema.ts
import { pgTable, serial, integer, decimal, date, timestamp } from 'drizzle-orm/pg-core';

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  pageViews: integer('page_views').notNull().default(0),
  uniqueVisitors: integer('unique_visitors').notNull().default(0),
  bounceRate: decimal('bounce_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
  avgSessionDuration: integer('avg_session_duration').notNull().default(0),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});