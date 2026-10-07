import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  event: text('event').notNull(),
  userId: text('user_id'),
  value: integer('value').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});