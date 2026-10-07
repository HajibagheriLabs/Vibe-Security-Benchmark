import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userId: text('user_id'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});