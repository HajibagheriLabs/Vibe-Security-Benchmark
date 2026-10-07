import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { analytics } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';

export async function GET() {
  try {
    const totalEvents = await db.select({ count: count() }).from(analytics);
    const recentEvents = await db
      .select()
      .from(analytics)
      .orderBy(desc(analytics.createdAt))
      .limit(10);

    return NextResponse.json({
      totalEvents: totalEvents[0].count,
      recentEvents,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}