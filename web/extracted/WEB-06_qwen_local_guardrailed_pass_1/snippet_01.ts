import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth'; // Assumed auth utility
import { z } from 'zod';
import { createAlgolia } from '@algolia/client-search';

// Rule 1: No credential in client bundle. API Key is server-side only.
// Rule 4: Pin exact versions (managed in package.json).
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY;

// Rule 3: Validate schema before use.
const QuerySchema = z.object({
  query: z.string().min(1).max(100),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');

  // Validate input
  const parsed = QuerySchema.safeParse({ query: rawQuery });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  // Rule 1: Authenticate session
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rule 1: Authorize (narrowest scope)
  // Assuming the index is specific to the user's tenant or public if configured
  const indexName = 'products'; 

  if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
    return NextResponse.json({ error: 'Algolia configuration missing' }, { status: 500 });
  }

  const client = createAlgolia(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  const index = client.initIndex(indexName);

  try {
    // Rule 3: Bound parameters (handled by client library method)
    const { hits } = await index.search<{
      objectID: string;
      name: string;
      description: string;
      price: number;
    }>({
      query: parsed.data.query,
      hitsPerPage: 10,
    });

    // Rule 3: Return minimal result (strip internal Algolia metadata if necessary)
    const results = hits.map((hit) => ({
      objectID: hit.objectID,
      name: hit.name,
      description: hit.description,
      price: hit.price,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Algolia search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}