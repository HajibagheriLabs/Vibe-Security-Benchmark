import { NextRequest, NextResponse } from "next/server";
import { algoliasearch } from "algoliasearch";

const appId = process.env.ALGOLIA_APP_ID;
const apiKey = process.env.ALGOLIA_SEARCH_API_KEY;
const indexName = process.env.ALGOLIA_INDEX_NAME;

export async function GET(request: NextRequest) {
  if (!appId || !apiKey || !indexName) {
    return NextResponse.json(
      { error: "Algolia configuration missing" },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "0", 10);
  const hitsPerPage = parseInt(searchParams.get("hitsPerPage") || "10", 10);

  try {
    const client = algoliasearch(appId, apiKey);
    const { results } = await client.search([
      {
        indexName,
        query,
        page,
        hitsPerPage,
        attributesToHighlight: ["title", "description"],
        attributesToSnippet: ["description:50"],
      },
    ]);

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Algolia search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}