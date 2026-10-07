// schema.ts
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const analytics = pgTable('analytics', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  event: text('event').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});