import { SearchAutocomplete } from "@/components/SearchAutocomplete";

export default function SearchPage() {
  return (
    <SearchAutocomplete
      appId={process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!}
      apiKey={process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!}
      indexName={process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME!}
      placeholder="Search docs..."
      maxResults={5}
      onSelect={(hit) => router.push(hit.url)}
    />
  );
}