// components/search/algolia-autocomplete.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createAutocomplete } from '@algolia/autocomplete-core';
import { getAlgoliaResults } from '@algolia/autocomplete-js';
import type { AutocompleteState, AutocompleteSource } from '@algolia/autocomplete-core';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

// Security: Search query is validated server-side; this schema mirrors the API contract
const searchRequestSchema = z.object({
  query: z.string().min(1).max(200),
});

interface SearchHit {
  objectID: string;
  title: string;
  description?: string;
  url: string;
  category?: string;
  [key: string]: unknown;
}

interface AutocompleteItemProps {
  hit: SearchHit;
  components: {
    Highlight: (props: { hit: SearchHit; attribute: string }) => React.ReactNode;
  };
}

// Security: URL validation - only allow http/https protocols
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Security: Sanitize display text - strip control characters and ANSI escapes
function sanitizeDisplayText(text: string): string {
  return text
    .replace(/[\r\n\u2028\u2029]/g, ' ')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .trim();
}

function AutocompleteItem({ hit, components }: AutocompleteItemProps) {
  const router = useRouter();
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Security: Validate URL before navigation
    if (!isValidUrl(hit.url)) {
      console.error('Invalid URL blocked', { objectID: hit.objectID });
      return;
    }
    router.push(hit.url);
  }, [hit.url, hit.objectID, router]);

  return (
    <a
      href={hit.url}
      onClick={handleClick}
      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
      // Security: No dangerouslySetInnerHTML - use text rendering
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {sanitizeDisplayText(hit.title)}
          </div>
          {hit.description && (
            <div className="mt-1 text-sm text-gray-500 line-clamp-2">
              {sanitizeDisplayText(hit.description)}
            </div>
          )}
        </div>
        {hit.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {sanitizeDisplayText(hit.category)}
          </span>
        )}
      </div>
    </a>
  );
}

export default function AlgoliaAutocomplete() {
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState<SearchHit> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Security: Algolia credentials are server-side only; client calls our proxy endpoint
  const autocomplete = useRef(
    createAutocomplete<SearchHit>({
      id: 'algolia-autocomplete',
      placeholder: 'Search...',
      openOnFocus: true,
      onStateChange({ state }) {
        setAutocompleteState(state);
        setIsOpen(state.isOpen);
      },
      getSources({ query }) {
        if (!query.trim()) return [];
        
        return [
          {
            sourceId: 'products',
            getItems() {
              // Security: Client calls our authenticated proxy, never Algolia directly
              return fetch('/api/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query.trim() }),
              })
                .then((res) => {
                  if (!res.ok) {
                    throw new Error('Search failed');
                  }
                  return res.json();
                })
                .then((data) => data.hits as SearchHit[])
                .catch((error) => {
                  console.error('Search error:', error);
                  return [];
                });
            },
            getItemUrl({ item }) {
              return item.url;
            },
            templates: {
              item({ item, components }) {
                return <AutocompleteItem hit={item} components={components} />;
              },
            },
          } as AutocompleteSource<SearchHit>,
        ];
      },
    })
  );

  // Security: Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        autocomplete.current.setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Security: Keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        autocomplete.current.setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setQuery(value);
      
      // Security: Validate query length client-side as first line of defense
      try {
        searchRequestSchema.parse({ query: value });
        autocomplete.current.setQuery(value);
      } catch {
        // Invalid query - don't trigger search
        autocomplete.current.setQuery('');
      }
    },
    []
  );

  const formProps = autocomplete.current.getFormProps({
    inputElement: inputRef.current,
  });

  const inputProps = autocomplete.current.getInputProps({
    inputElement: inputRef.current,
    value: query,
    onChange: handleInputChange,
    onKeyDown: handleKeyDown,
    placeholder: 'Search products, articles, and more...',
    className: 'w-full px-4 py-3 pl-11 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'aria-label': 'Search',
    'aria-expanded': isOpen,
    'aria-controls': 'algolia-autocomplete-panel',
  });

  const panelProps = autocomplete.current.getPanelProps({});

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form {...formProps} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input ref={inputRef} {...inputProps} />
      </form>

      {isOpen && autocompleteState && autocompleteState.collections.length > 0 && (
        <div
          {...panelProps}
          id="algolia-autocomplete-panel"
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {autocompleteState.collections.map((collection, index) => {
            const { source, items } = collection;
            return (
              <div key={`source-${index}`} className="py-2">
                {items.length > 0 ? (
                  <ul role="listbox" aria-label="Search results">
                    {items.map((item) => {
                      const itemProps = autocomplete.current.getItemProps({
                        item,
                        source,
                      });
                      return (
                        <li key={item.objectID} role="option" aria-selected={false}>
                          <div {...itemProps}>
                            <AutocompleteItem
                              hit={item}
                              components={{
                                Highlight: ({ hit, attribute }) => (
                                  <span>{sanitizeDisplayText(String(hit[attribute] || ''))}</span>
                                ),
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No results found for &quot;{sanitizeDisplayText(query)}&quot;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}