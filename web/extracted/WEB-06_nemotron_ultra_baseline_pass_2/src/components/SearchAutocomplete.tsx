"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@algolia/autocomplete-core";
import { algoliasearch } from "algoliasearch/lite";
import type { AutocompleteOptions } from "@algolia/autocomplete-js";
import type { Hit } from "@algolia/autocomplete-preset-algolia";

interface SearchHit extends Hit {
  objectID: string;
  title: string;
  description?: string;
  url: string;
  category?: string;
  image?: string;
  _highlightResult?: {
    title?: { value: string };
    description?: { value: string };
  };
}

interface SearchAutocompleteProps {
  appId: string;
  apiKey: string;
  indexName: string;
  placeholder?: string;
  onSelect?: (hit: SearchHit) => void;
  className?: string;
  maxResults?: number;
}

export function SearchAutocomplete({
  appId,
  apiKey,
  indexName,
  placeholder = "Search...",
  onSelect,
  className = "",
  maxResults = 5,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchClientRef = useRef<ReturnType<typeof algoliasearch> | null>(null);

  useEffect(() => {
    searchClientRef.current = algoliasearch(appId, apiKey);
  }, [appId, apiKey]);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchClientRef.current || !searchQuery.trim()) {
        setHits([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { results } = await searchClientRef.current.search([
          {
            indexName,
            query: searchQuery,
            hitsPerPage: maxResults,
            attributesToHighlight: ["title", "description"],
            attributesToSnippet: ["description:20"],
          },
        ]);

        setHits(results[0].hits as SearchHit[]);
        setActiveIndex(-1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setHits([]);
      } finally {
        setIsLoading(false);
      }
    },
    [indexName, maxResults]
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query);
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [query, search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, hits.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, -1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && hits[activeIndex]) {
            onSelect?.(hits[activeIndex]);
            setQuery("");
            setHits([]);
            setIsOpen(false);
            inputRef.current?.blur();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHits([]);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
        case "Tab":
          if (activeIndex >= 0 && hits[activeIndex]) {
            e.preventDefault();
            onSelect?.(hits[activeIndex]);
            setQuery("");
            setHits([]);
            setIsOpen(false);
            inputRef.current?.blur();
          }
          break;
      }
    },
    [hits, activeIndex, onSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setIsOpen(value.length > 0);
    },
    []
  );

  const handleFocus = useCallback(() => {
    if (query.trim()) {
      setIsOpen(true);
    }
  }, [query]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  const handleItemClick = useCallback(
    (hit: SearchHit) => {
      onSelect?.(hit);
      setQuery("");
      setHits([]);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  const getHighlightedTitle = (hit: SearchHit) => {
    return hit._highlightResult?.title?.value || hit.title;
  };

  const getHighlightedDescription = (hit: SearchHit) => {
    return hit._highlightResult?.description?.value || hit.description || "";
  };

  return (
    <div
      className={`relative w-full ${className}`}
      role="search"
      aria-label="Search"
    >
      <label htmlFor="search-autocomplete" className="sr-only">
        Search
      </label>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          id="search-autocomplete"
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen && hits.length > 0}
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          className="w-full pl-10 pr-4 py-2.5 text-base bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 placeholder-gray-400"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {isOpen && hits.length > 0 && (
        <ul
          ref={listRef}
          id="search-results"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          {hits.map((hit, index) => (
            <li
              key={hit.objectID}
              id={`search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleItemClick(hit)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                index === activeIndex
                  ? "bg-blue-50 text-blue-900"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {hit.image && (
                  <img
                    src={hit.image}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm truncate"
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedTitle(hit),
                    }}
                  />
                  {hit.description && (
                    <p
                      className="text-sm text-gray-600 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html: getHighlightedDescription(hit),
                      }}
                    />
                  )}
                  {hit.category && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {hit.category}
                    </span>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && hits.length === 0 && query.trim() && !isLoading && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-gray-500">No results found for "{query}"</p>
        </div>
      )}

      {error && (
        <div
          className="absolute z-50 w-full mt-1 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 text-center"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

export default SearchAutocomplete;