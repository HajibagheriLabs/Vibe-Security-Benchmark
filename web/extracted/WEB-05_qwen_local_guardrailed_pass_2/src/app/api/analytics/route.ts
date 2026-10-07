import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyticsTable } from '@/lib/schema';
import { AnalyticsQuerySchema } from '@/lib/validations';
import { eq, desc, like } from 'drizzle-orm';

// Flag: Server-side proxy. Client calls /api/analytics, endpoint calls DB.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    
    // Validate input schema
    const params = AnalyticsQuerySchema.parse(rawParams);

    // Flag: Injection defense. Drizzle uses bound parameters for values.
    // Identifiers (table/column) are literals in the schema definition.
    const query = db.select()
      .from(analyticsTable)
      .where(
        params.eventType 
          ? eq(analyticsTable.eventType, params.eventType) 
          : undefined
      )
      .orderBy(desc(analyticsTable.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    const data = await query;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        limit: params.limit,
        offset: params.offset,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
    console.error('Analytics query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}