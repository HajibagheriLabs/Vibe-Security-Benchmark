// components/search/AlgoliaAutocomplete.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AutocompleteOptions } from '@algolia/autocomplete-js';
import { autocomplete } from '@algolia/autocomplete-js';
import algoliasearch, { SearchClient } from 'algoliasearch/lite';

// Types
interface SearchHit {
  objectID: string;
  title: string;
  description?: string;
  url: string;
  category?: string;
  image?: string;
  _highlightResult?: {
    title: { value: string };
    description?: { value: string };
  };
}

interface AutocompleteProps {
  appId: string;
  searchApiKey: string; // PUBLIC search-only key only
  indexName: string;
  placeholder?: string;
  className?: string;
  onSelect?: (hit: SearchHit) => void;
  maxResults?: number;
  debounceMs?: number;
}

// Sanitize user input to prevent injection
function sanitizeQuery(query: string): string {
  return query
    .replace(/[<>\"'&]/g, '') // Strip potential XSS chars
    .trim()
    .slice(0, 200); // Limit length
}

// Validate Algolia credentials format (defense in depth)
function validateCredentials(appId: string, apiKey: string): boolean {
  const appIdRegex = /^[a-z0-9]{1,30}$/i;
  const apiKeyRegex = /^[a-f0-9]{32}$/i;
  return appIdRegex.test(appId) && apiKeyRegex.test(apiKey);
}

export function AlgoliaAutocomplete({
  appId,
  searchApiKey,
  indexName,
  placeholder = 'Search...',
  className = '',
  onSelect,
  maxResults = 5,
  debounceMs = 150,
}: AutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<ReturnType<typeof autocomplete> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate credentials on mount (fail fast if misconfigured)
  useEffect(() => {
    if (!validateCredentials(appId, searchApiKey)) {
      setError('Invalid Algolia credentials format');
      return;
    }
    setIsReady(true);
  }, [appId, searchApiKey]);

  // Initialize autocomplete
  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    // Create search client with public search-only key
    const searchClient: SearchClient = algoliasearch(appId, searchApiKey);

    // Destroy previous instance if exists
    if (autocompleteRef.current) {
      autocompleteRef.current.destroy();
    }

    // Create new autocomplete instance
    autocompleteRef.current = autocomplete({
      container: containerRef.current,
      placeholder,
      openOnFocus: true,
      autoFocus: true,
      stallThreshold: debounceMs,
      getSources: () => [
        {
          sourceId: 'search-index',
          getItems: async ({ query }) => {
            const sanitizedQuery = sanitizeQuery(query);
            if (!sanitizedQuery) return [];

            try {
              const { hits } = await searchClient.searchSingleIndex({
                indexName,
                searchParams: {
                  query: sanitizedQuery,
                  hitsPerPage: maxResults,
                  attributesToHighlight: ['title', 'description'],
                  attributesToSnippet: ['description:20'],
                },
              });
              return hits as SearchHit[];
            } catch (err) {
              console.error('[AlgoliaAutocomplete] Search error:', err);
              return [];
            }
          },
          templates: {
            item({ item, components }) {
              const highlightedTitle = item._highlightResult?.title?.value ?? item.title;
              const highlightedDescription = item._highlightResult?.description?.value ?? item.description;

              return (
                <a
                  href={item.url}
                  className="aa-ItemLink"
                  onClick={(e) => {
                    if (onSelect) {
                      e.preventDefault();
                      onSelect(item);
                    }
                  }}
                >
                  <div className="aa-ItemContent">
                    <div className="aa-ItemTitle" dangerouslySetInnerHTML={{ __html: highlightedTitle }} />
                    {highlightedDescription && (
                      <div className="aa-ItemDescription" dangerouslySetInnerHTML={{ __html: highlightedDescription }} />
                    )}
                    {item.category && (
                      <span className="aa-ItemCategory">{item.category}</span>
                    )}
                  </div>
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      className="aa-ItemImage"
                      loading="lazy"
                    />
                  )}
                </a>
              );
            },
            noResults() {
              return <div className="aa-NoResults">No results found</div>;
            },
            header() {
              return <div className="aa-SourceHeader">Results</div>;
            },
          },
        },
      ],
      navigator: {
        navigate({ item, event }) {
          if (event.key === 'Enter' && item.url) {
            if (onSelect) {
              event.preventDefault();
              onSelect(item);
            } else {
              window.location.href = item.url;
            }
          }
        },
      },
    });

    setIsReady(true);

    return () => {
      autocompleteRef.current?.destroy();
      autocompleteRef.current = null;
    };
  }, [isReady, appId, searchApiKey, indexName, placeholder, maxResults, debounceMs, onSelect]);

  if (error) {
    return (
      <div className={`aa-Container ${className}`} role="search" aria-label="Search">
        <div className="aa-InputWrapper">
          <input
            type="search"
            placeholder={placeholder}
            disabled
            aria-invalid="true"
            aria-describedby="search-error"
          />
        </div>
        <div id="search-error" className="aa-Error" role="alert">
          Search unavailable
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`aa-Container ${className}`}
      role="search"
      aria-label="Search"
    />
  );
}

// Server-side search proxy (for privileged operations)
// app/api/search/route.ts
/*
import { NextRequest, NextResponse } from 'next/server';
import algoliasearch from 'algoliasearch';

const ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY; // NEVER exposed to client
const APP_ID = process.env.ALGOLIA_APP_ID;

export async function POST(request: NextRequest) {
  // 1. Authenticate & authorize
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate schema
  const body = await request.json();
  const { query, filters, page = 0, hitsPerPage = 10 } = searchSchema.parse(body);

  // 3. Rate limit (implement with your rate limiter)
  // await rateLimit.check(session.user.id, 'search');

  // 4. Execute search with admin client (server-side only)
  const client = algoliasearch(APP_ID, ADMIN_API_KEY);
  const { hits, nbHits, page: currentPage, nbPages } = await client.searchSingleIndex({
    indexName: 'your_index',
    searchParams: {
      query,
      filters, // Server-controlled filters only
      page: currentPage,
      hitsPerPage,
    },
  });

  // 5. Return minimal result
  return NextResponse.json({ hits, nbHits, page: currentPage, nbPages });
}
*/

// CSS Module - components/search/AlgoliaAutocomplete.module.css
/*
.aa-Container {
  width: 100%;
  max-width: 560px;
}

.aa-InputWrapper {
  position: relative;
  width: 100%;
}

.aa-Input {
  width: 100%;
  padding: 0.625rem 1rem;
  padding-right: 2.5rem;
  font-size: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.aa-Input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.aa-Input::placeholder {
  color: #9ca3af;
}

.aa-SubmitButton {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aa-Panel {
  position: absolute;
  top: calc(100% + 0.375rem);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 50;
  overflow: hidden;
}

.aa-SourceHeader {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
}

.aa-ItemLink {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.1s ease;
}

.aa-ItemLink:last-child {
  border-bottom: none;
}

.aa-ItemLink:hover,
.aa-ItemLink[aria-selected="true"] {
  background-color: #f9fafb;
}

.aa-ItemContent {
  flex: 1;
  min-width: 0;
}

.aa-ItemTitle {
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #111827;
}

.aa-ItemDescription {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: #6b7280;
}

.aa-ItemCategory {
  display: inline-block;
  margin-top: 0.375rem;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background-color: #eff6ff;
  color: #3b82f6;
  border-radius: 9999px;
}

.aa-ItemImage {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.375rem;
  flex-shrink: 0;
}

.aa-NoResults {
  padding: 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.aa-Error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
}
*/

// Usage example - app/search/page.tsx
/*
import { AlgoliaAutocomplete } from '@/components/search/AlgoliaAutocomplete';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <AlgoliaAutocomplete
        appId={process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!}
        searchApiKey={process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!}
        indexName="products"
        placeholder="Search products..."
        maxResults={8}
        onSelect={(hit) => {
          // Handle selection (e.g., navigate via router)
          console.log('Selected:', hit);
        }}
      />
    </div>
  );
}
*/

// Environment file template - .env.example
/*
# Algolia (PUBLIC - safe for client bundle)
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_search_only_api_key

# Algolia Admin (SERVER ONLY - never in client bundle)
ALGOLIA_ADMIN_API_KEY=your_admin_api_key
*/

// .gitignore additions
/*
# Environment files
.env
.env.local
.env.*.local
!.env.example

# Algolia keys
*.algolia.key
*/