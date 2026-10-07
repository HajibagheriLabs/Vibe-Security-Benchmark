// components/AutocompleteSearch.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createAutocomplete } from '@algolia/autocomplete-core';
import { getAlgoliaResults } from '@algolia/autocomplete-js';
import algoliasearch from 'algoliasearch/lite';
import type { AutocompleteState, AutocompleteSource } from '@algolia/autocomplete-core';
import type { SearchClient } from 'algoliasearch/lite';

// Define the Algolia hit type
export interface SearchHit {
  objectID: string;
  title?: string;
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  [key: string]: unknown;
}

interface AutocompleteSearchProps {
  indexName: string;
  placeholder?: string;
  className?: string;
  onSelect?: (hit: SearchHit) => void;
  searchClient?: SearchClient;
  maxResults?: number;
}

interface AutocompleteItemProps {
  hit: SearchHit;
  onSelect: (hit: SearchHit) => void;
}

// Individual result item component
const AutocompleteItem: React.FC<AutocompleteItemProps> = ({ hit, onSelect }) => {
  return (
    <li
      className="autocomplete-item"
      onClick={() => onSelect(hit)}
      role="option"
      aria-selected="false"
    >
      <div className="autocomplete-item-content">
        {hit.image && (
          <img
            src={hit.image}
            alt={hit.title || hit.name || 'Search result'}
            className="autocomplete-item-image"
            loading="lazy"
          />
        )}
        <div className="autocomplete-item-text">
          <h3 className="autocomplete-item-title">
            {hit.title || hit.name || 'Untitled'}
          </h3>
          {hit.description && (
            <p className="autocomplete-item-description">{hit.description}</p>
          )}
        </div>
      </div>
    </li>
  );
};

const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({
  indexName,
  placeholder = 'Search...',
  className = '',
  onSelect,
  searchClient,
  maxResults = 5,
}) => {
  const [autocompleteState, setAutocompleteState] = useState<
    AutocompleteState<SearchHit>
  >({
    collections: [],
    completion: null,
    context: {},
    isOpen: false,
    query: '',
    activeItemId: null,
    status: 'idle',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Create or use provided search client
  const clientRef = useRef<SearchClient | null>(null);
  if (!clientRef.current) {
    if (searchClient) {
      clientRef.current = searchClient;
    } else {
      const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
      const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || '';
      if (appId && apiKey) {
        clientRef.current = algoliasearch(appId, apiKey);
      }
    }
  }

  // Create autocomplete instance
  const autocompleteRef = useRef<ReturnType<typeof createAutocomplete<SearchHit>> | null>(null);

  useEffect(() => {
    if (!clientRef.current) return;

    const sources: AutocompleteSource<SearchHit>[] = [
      {
        sourceId: 'algolia',
        getItems({ query }) {
          if (!query || query.length < 2) return [];
          return getAlgoliaResults<SearchHit>({
            searchClient: clientRef.current!,
            queries: [
              {
                indexName,
                query,
                params: {
                  hitsPerPage: maxResults,
                  attributesToSnippet: ['description:50'],
                  snippetEllipsisText: '…',
                },
              },
            ],
          });
        },
        getItemUrl({ item }) {
          return item.url || `/item/${item.objectID}`;
        },
        templates: {
          item({ item }) {
            return item.title || item.name || item.objectID;
          },
        },
      },
    ];

    autocompleteRef.current = createAutocomplete<SearchHit>({
      id: 'algolia-autocomplete',
      placeholder,
      openOnFocus: true,
      shouldPanelOpen: ({ state }) => state.query.length >= 2,
      onStateChange: ({ state }) => {
        setAutocompleteState(state);
      },
      navigator: {
        navigate({ itemUrl }) {
          if (itemUrl) {
            window.location.href = itemUrl;
          }
        },
      },
      getSources: ({ query }) => {
        if (query.length < 2) return [];
        return sources;
      },
    });

    return () => {
      autocompleteRef.current = null;
    };
  }, [indexName, placeholder, maxResults]);

  // Handle input changes
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (autocompleteRef.current) {
        autocompleteRef.current.setQuery(event.target.value);
      }
    },
    []
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!autocompleteRef.current) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          autocompleteRef.current.setActiveItemId(
            getNextActiveItemId(autocompleteState, 1)
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          autocompleteRef.current.setActiveItemId(
            getNextActiveItemId(autocompleteState, -1)
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (autocompleteState.activeItemId !== null) {
            const activeItem = findActiveItem(autocompleteState);
            if (activeItem) {
              handleSelect(activeItem);
            }
          } else {
            // Submit search
            const query = autocompleteState.query;
            if (query) {
              window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
          }
          break;
        case 'Escape':
          event.preventDefault();
          autocompleteRef.current.setIsOpen(false);
          inputRef.current?.blur();
          break;
        case 'Tab':
          autocompleteRef.current.setIsOpen(false);
          break;
      }
    },
    [autocompleteState]
  );

  // Helper to get next active item ID
  const getNextActiveItemId = (
    state: AutocompleteState<SearchHit>,
    direction: 1 | -1
  ): number | null => {
    const allItems = state.collections.flatMap((collection) => collection.items);
    if (allItems.length === 0) return null;

    const currentIndex = state.activeItemId !== null ? state.activeItemId : -1;
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0) return allItems.length - 1;
    if (nextIndex >= allItems.length) return 0;
    return nextIndex;
  };

  // Find active item from state
  const findActiveItem = (state: AutocompleteState<SearchHit>): SearchHit | null => {
    if (state.activeItemId === null) return null;
    const allItems = state.collections.flatMap((collection) => collection.items);
    return allItems[state.activeItemId] || null;
  };

  // Handle item selection
  const handleSelect = useCallback(
    (hit: SearchHit) => {
      if (autocompleteRef.current) {
        autocompleteRef.current.setIsOpen(false);
        autocompleteRef.current.setQuery('');
        setAutocompleteState((prev) => ({ ...prev, query: '' }));
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
      if (onSelect) {
        onSelect(hit);
      } else if (hit.url) {
        window.location.href = hit.url;
      } else {
        window.location.href = `/item/${hit.objectID}`;
      }
    },
    [onSelect]
  );

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (autocompleteRef.current) {
          autocompleteRef.current.setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get all items from collections
  const allItems = autocompleteState.collections.flatMap(
    (collection) => collection.items
  );

  return (
    <div
      ref={containerRef}
      className={`autocomplete-search ${className}`}
      data-autocomplete="algolia-autocomplete"
    >
      <div className="autocomplete-input-wrapper">
        <svg
          className="autocomplete-search-icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zm0 0l4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={autocompleteState.query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (autocompleteRef.current && autocompleteState.query.length >= 2) {
              autocompleteRef.current.setIsOpen(true);
            }
          }}
          className="autocomplete-input"
          role="combobox"
          aria-expanded={autocompleteState.isOpen}
          aria-controls="autocomplete-panel"
          aria-autocomplete="list"
          aria-activedescendant={
            autocompleteState.activeItemId !== null
              ? `autocomplete-item-${autocompleteState.activeItemId}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
        />
        {autocompleteState.status === 'loading' && (
          <div className="autocomplete-loading-spinner" aria-label="Loading results">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="32"
                strokeDashoffset="8"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 8 8"
                  to="360 8 8"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          </div>
        )}
      </div>

      {autocompleteState.isOpen && allItems.length > 0 && (
        <div
          ref={panelRef}
          id="autocomplete-panel"
          className="autocomplete-panel"
          role="listbox"
        >
          <ul className="autocomplete-list">
            {allItems.map((hit, index) => (
              <div
                key={hit.objectID}
                id={`autocomplete-item-${index}`}
                className={`autocomplete-item-wrapper ${
                  autocompleteState.activeItemId === index ? 'active' : ''
                }`}
                onMouseEnter={() => {
                  if (autocompleteRef.current) {
                    autocompleteRef.current.setActiveItemId(index);
                  }
                }}
              >
                <AutocompleteItem hit={hit} onSelect={handleSelect} />
              </div>
            ))}
          </ul>
          <div className="autocomplete-footer">
            <span>Powered by Algolia</span>
            <button
              className="autocomplete-view-all"
              onClick={() => {
                const query = autocompleteState.query;
                if (query) {
                  window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
              }}
            >
              View all results
            </button>
          </div>
        </div>
      )}

      {autocompleteState.isOpen &&
        autocompleteState.query.length >= 2 &&
        allItems.length === 0 &&
        autocompleteState.status === 'idle' && (
          <div className="autocomplete-panel autocomplete-empty">
            <p>No results found for "{autocompleteState.query}"</p>
          </div>
        )}
    </div>
  );
};

export default AutocompleteSearch;