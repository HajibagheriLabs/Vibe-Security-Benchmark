import { pgTable, uuid, integer, real, date, timestamp } from 'drizzle-orm/pg-core';

export const analytics = pgTable('analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  date: date('date').notNull(),
  pageviews: integer('pageviews').notNull().default(0),
  sessions: integer('sessions').notNull().default(0),
  users: integer('users').notNull().default(0),
  bounceRate: real('bounce_rate').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});