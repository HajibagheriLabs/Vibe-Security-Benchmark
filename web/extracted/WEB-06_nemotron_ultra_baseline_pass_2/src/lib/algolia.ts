import { algoliasearch, type SearchClient } from "algoliasearch";

let searchClient: SearchClient | null = null;

export function getSearchClient(): SearchClient {
  if (!searchClient) {
    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_SEARCH_API_KEY;

    if (!appId || !apiKey) {
      throw new Error("Algolia credentials not configured");
    }

    searchClient = algoliasearch(appId, apiKey);
  }

  return searchClient;
}

export async function searchIndex<T = Record<string, unknown>>(
  indexName: string,
  query: string,
  options: {
    hitsPerPage?: number;
    page?: number;
    filters?: string;
    facets?: string[];
    attributesToHighlight?: string[];
    attributesToSnippet?: string[];
  } = {}
) {
  const client = getSearchClient();
  const index = client.initIndex(indexName);

  const { hits, nbHits, page, nbPages, hitsPerPage, processingTimeMS } =
    await index.search<T>(query, {
      hitsPerPage: options.hitsPerPage ?? 10,
      page: options.page ?? 0,
      filters: options.filters,
      facets: options.facets,
      attributesToHighlight: options.attributesToHighlight ?? [
        "title",
        "description",
      ],
      attributesToSnippet: options.attributesToSnippet ?? ["description:50"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
    });

  return {
    hits,
    nbHits,
    page,
    nbPages,
    hitsPerPage,
    processingTimeMS,
  };
}

export async function getObject<T = Record<string, unknown>>(
  indexName: string,
  objectID: string
): Promise<T | null> {
  const client = getSearchClient();
  const index = client.initIndex(indexName);

  try {
    return await index.getObject<T>(objectID);
  } catch {
    return null;
  }
}

export async function saveObjects<T extends { objectID: string }>(
  indexName: string,
  objects: T[]
): Promise<{ objectIDs: string[]; taskID: number }> {
  const client = getSearchClient();
  const index = client.initIndex(indexName);

  return index.saveObjects(objects);
}

export async function deleteObject(
  indexName: string,
  objectID: string
): Promise<{ taskID: number }> {
  const client = getSearchClient();
  const index = client.initIndex(indexName);

  return index.deleteObject(objectID);
}