// components/algolia-autocomplete.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

// --- Configuration (server-provided via environment) ---
// These are safe to expose: they are public search-only API keys with
// restricted index permissions. Never use the admin API key here.
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const ALGOLIA_SEARCH_API_KEY =
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? "";
const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? "";

// --- Types ---
interface SearchHit {
  objectID: string;
  title: string;
  description?: string;
  url: string;
  _highlightResult?: {
    title?: { value: string };
    description?: { value: string };
  };
}

interface AlgoliaSearchResponse {
  hits: SearchHit[];
}

// --- Validation schemas ---
const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
});

const SearchResponseSchema = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      title: z.string(),
      description: z.string().optional(),
      url: z.string().url(),
      _highlightResult: z
        .object({
          title: z.object({ value: z.string() }).optional(),
          description: z.object({ value: z.string() }).optional(),
        })
        .optional(),
    })
  ),
});

// --- Sanitization for display (defense in depth) ---
function sanitizeHighlightedHtml(html: string): string {
  // Strip all tags except <em> and <mark> used by Algolia highlighting.
  // This is a conservative allowlist-based sanitizer.
  const allowedTags = /<\/?(em|mark)(\s[^>]*)?>/gi;
  const dangerousTags = /<\/?[a-z][^>]*>/gi;

  // First remove all tags, then re-add only allowed ones.
  const withoutTags = html.replace(dangerousTags, (match) => {
    return allowedTags.test(match) ? match : "";
  });

  // Escape any remaining HTML entities to prevent injection
  return withoutTags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/&lt;(\/?)(em|mark)&gt;/gi, "<$1$2>");
}

// --- Debounce hook ---
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback as T;
}

export default function AlgoliaAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Search function ---
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      // Validate query
      const validation = SearchRequestSchema.safeParse({ query: searchQuery });
      if (!validation.success) {
        setError("Invalid search query");
        return;
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);

      try {
        // Call our own API endpoint, which proxies to Algolia server-side.
        // This keeps the search API key out of the client bundle entirely.
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            indexName: ALGOLIA_INDEX_NAME,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const data = await response.json();
        const parsed = SearchResponseSchema.safeParse(data);

        if (!parsed.success) {
          throw new Error("Invalid search response");
        }

        setResults(parsed.data.hits);
        setIsOpen(parsed.data.hits.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Ignore aborted requests
        }
        console.error("Search error:", err);
        setError("Failed to fetch search results");
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const debouncedSearch = useDebouncedCallback(performSearch, 300);

  // --- Event handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectResult = (hit: SearchHit) => {
    // Validate URL before navigation
    try {
      const url = new URL(hit.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Invalid URL protocol");
      }
      setIsOpen(false);
      setQuery(hit.title);
      router.push(hit.url);
    } catch (err) {
      console.error("Invalid result URL:", err);
      setError("Invalid result URL");
    }
  };

  // --- Click outside handler ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search"
          aria-expanded={isOpen}
          aria-controls="search-results"
          role="combobox"
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0 ? `result-${selectedIndex}` : undefined
          }
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul
          id="search-results"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
        >
          {results.map((hit, index) => (
            <li
              key={hit.objectID}
              id={`result-${index}`}
              role="option"
              aria-selected={selectedIndex === index}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                selectedIndex === index ? "bg-blue-50" : ""
              }`}
              onClick={() => handleSelectResult(hit)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-gray-900">
                {hit._highlightResult?.title ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHighlightedHtml(
                        hit._highlightResult.title.value
                      ),
                    }}
                  />
                ) : (
                  hit.title
                )}
              </div>
              {hit.description && (
                <div className="text-sm text-gray-600 mt-1">
                  {hit._highlightResult?.description ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHighlightedHtml(
                          hit._highlightResult.description.value
                        ),
                      }}
                    />
                  ) : (
                    hit.description
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}