// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// --- Server-side Algolia client ---
// The admin API key is NEVER used here. We use a search-only API key
// with restricted index permissions, stored server-side only.
import algoliasearch from "algoliasearch";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_SEARCH_API_KEY = process.env.ALGOLIA_SEARCH_API_KEY!;

// --- Validation schema ---
const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  indexName: z.string().min(1).max(100),
});

// --- Rate limiter ---
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limit
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    try {
      await limiter.check(10, `SEARCH_${clientIp}`); // 10 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // 3. Validate schema
    const body = await request.json();
    const validation = SearchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { query, indexName } = validation.data;

    // 4. Validate index name against allowlist
    const allowedIndexes = new Set(["products", "articles", "pages"]);
    if (!allowedIndexes.has(indexName)) {
      return NextResponse.json(
        { error: "Invalid index name" },
        { status: 400 }
      );
    }

    // 5. Call Algolia server-side
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);
    const index = client.initIndex(indexName);

    const searchResults = await index.search(query, {
      hitsPerPage: 10,
      attributesToRetrieve: ["objectID", "title", "description", "url"],
      attributesToHighlight: ["title", "description"],
      highlightPreTag: "<em>",
      highlightPostTag: "</em>",
    });

    // 6. Return minimal result
    return NextResponse.json({
      hits: searchResults.hits.map((hit) => ({
        objectID: hit.objectID,
        title: hit.title,
        description: hit.description,
        url: hit.url,
        _highlightResult: hit._highlightResult,
      })),
    });
  } catch (error) {
    // Log structured error without sensitive data
    console.error("Search API error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}