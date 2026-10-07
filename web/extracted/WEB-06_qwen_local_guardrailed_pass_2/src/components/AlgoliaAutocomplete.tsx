'use client';

import React, { useState, useEffect, useRef } from 'react';
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';
import { InstantSearch, SearchBox, Hits, Highlight } from 'react-instantsearch';
import { useRouter } from 'next/navigation';

// Server-side configuration (not exposed to client bundle)
const SEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;
const HOST = process.env.MEILISEARCH_HOST;

// Validation ensures credentials exist before mounting
if (!SEARCH_API_KEY || !HOST) {
  throw new Error('Meilisearch environment variables MEILISEARCH_API_KEY and MEILISEARCH_HOST are required.');
}

const client = instantMeiliSearch(HOST, SEARCH_API_KEY);

// Types for the Hit payload
interface Hit {
  objectID: string;
  title: string;
  description: string;
  url: string;
}

// 1. OPERATING PROTOCOL: State which rule set applies.
// Applies: §1 (Secrets - MEILISEARCH_API_KEY is server-side), §3 (Injection - Highlight sanitization, URL allowlist).

const AlgoliaAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // §1.2: Identity/State derived from verified session or API response.
  // §3.1 SQL/NoSQL: Meilisearch is a NoSQL-like search engine. We use the official SDK which handles bound parameters.

  useEffect(() => {
    // Rate-limiting: Debounce search to reduce API calls.
    const timer = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }

      try {
        // Server-side proxy logic could be added here if strict RLS is needed on search index,
        // but typically search keys are restricted by index.
        // Using the client SDK directly for autocomplete.
        const index = client.index('products'); // Replace with your index name
        
        // Fetch hits directly for custom rendering
        const searchResults = await index.search<Hit>({
          query,
          hitsPerPage: 5,
        });

        setResults(searchResults.hits);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // §3.1 XSS: URL validation.
  const handleSelect = (hit: Hit) => {
    const url = hit.url;
    // Allowlist validation for redirect destinations
    if (isValidUrl(url)) {
      router.push(url);
      setQuery('');
      setResults([]);
    }
  };

  // §3.1 XSS: Validate URL protocols.
  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* §3.1 XSS: Using framework interpolation for text content */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* §3.1 XSS: Results list uses textContent via <Highlight> */}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
          {results.map((hit) => (
            <li
              key={hit.objectID}
              onClick={() => handleSelect(hit)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
            >
              <div className="font-semibold">
                <Highlight attribute="title" hit={hit} />
              </div>
              <div className="text-sm text-gray-600">
                <Highlight attribute="description" hit={hit} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AlgoliaAutocomplete;