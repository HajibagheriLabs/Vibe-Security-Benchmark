import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const analyticsTable = pgTable('analytics', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userId: text('user_id').notNull(),
  metadata: text('metadata'), // JSON string stored as text for simplicity
  createdAt: timestamp('created_at').defaultNow().notNull(),
});