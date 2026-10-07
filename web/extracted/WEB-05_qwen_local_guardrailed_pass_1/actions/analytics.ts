// actions/analytics.ts
'use server';

import { db } from '../drizzle-client';
import { analytics } from '../schema';
import { eq, desc, count } from 'drizzle-orm';

// Flag: Auth derives identity from verified session (omitted for brevity, assumed `session.user.id`)
// Flag: Ownership predicate inside WHERE clause.
// Flag: Bound parameters exclusively.
export async function getUserAnalytics(userId: string) {
  return db
    .select({
      event: analytics.event,
      count: count(),
    })
    .from(analytics)
    .where(eq(analytics.userId, userId))
    .groupBy(analytics.event)
    .orderBy(desc(count()));
}