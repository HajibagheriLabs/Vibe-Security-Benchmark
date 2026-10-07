// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import algoliasearch from 'algoliasearch';
import { RateLimit } from '@/lib/rate-limit';

// Security: Server-side only - Algolia credentials never reach the client
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_SEARCH_API_KEY = process.env.ALGOLIA_SEARCH_API_KEY!; // Search-only key
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME!;

// Security: Validate environment variables at startup
if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_API_KEY || !ALGOLIA_INDEX_NAME) {
  throw new Error('Algolia environment variables are not configured');
}

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);
const index = searchClient.initIndex(ALGOLIA_INDEX_NAME);

// Security: Rate limiting - 30 requests per minute per user
const rateLimit = new RateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

const searchRequestSchema = z.object({
  query: z.string().min(1).max(200).transform((val) => val.trim()),
});

// Security: Sanitize query for logging - strip control characters
function sanitizeForLog(input: string): string {
  return input
    .replace(/[\r\n\u2028\u2029]/g, ' ')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .slice(0, 200);
}

export async function POST(request: NextRequest) {
  try {
    // Security: Authenticate user
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security: Rate limit
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const rateLimitKey = `${session.user.id}:${ip}`;
    const { success } = await rateLimit.check(rateLimitKey, 30);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Security: Validate request body
    const body = await request.json();
    const parsed = searchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { query } = parsed.data;

    // Security: Log sanitized query as structured data
    console.log({
      event: 'search',
      userId: session.user.id,
      query: sanitizeForLog(query),
      timestamp: new Date().toISOString(),
    });

    // Security: Query Algolia with search-only key
    const results = await index.search(query, {
      hitsPerPage: 10,
      attributesToRetrieve: ['objectID', 'title', 'description', 'url', 'category'],
      attributesToHighlight: ['title', 'description'],
    });

    // Security: Return minimal data - only what's needed for display
    return NextResponse.json({
      hits: results.hits.map((hit) => ({
        objectID: hit.objectID,
        title: hit.title,
        description: hit.description,
        url: hit.url,
        category: hit.category,
      })),
    });
  } catch (error) {
    // Security: Log error without sensitive data
    console.error({
      event: 'search_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}