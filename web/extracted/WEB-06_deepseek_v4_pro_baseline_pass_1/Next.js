'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { SearchIndex } from 'algoliasearch/lite';

interface AutocompleteProps {
  appId: string;
  apiKey: string;
  indexName: string;
  placeholder?: string;
  onSelect?: (item: any) => void;
  className?: string;
  maxResults?: number;
}

interface SearchResult {
  objectID: string;
  [key: string]: any;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  appId,
  apiKey,
  indexName,
  placeholder = 'Search...',
  onSelect,
  className = '',
  maxResults = 5,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const searchClientRef = useRef<ReturnType<typeof algoliasearch> | null>(null);
  const searchIndexRef = useRef<SearchIndex | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Algolia client
  useEffect(() => {
    try {
      const client = algoliasearch(appId, apiKey);
      searchClientRef.current = client;
      searchIndexRef.current = client.initIndex(indexName);
    } catch (err) {
      setError('Failed to initialize search client');
      console.error('Algolia initialization error:', err);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [appId, apiKey, indexName]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchIndexRef.current) return;

      if (!searchQuery.trim()) {
        setResults([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { hits } = await searchIndexRef.current.search<SearchResult>(
          searchQuery,
          {
            hitsPerPage: maxResults,
          }
        );

        setResults(hits);
        setIsOpen(hits.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        setError('Search failed. Please try again.');
        console.error('Algolia search error:', err);
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [maxResults]
  );

  // Debounce input changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!e.target.value.trim()) {
      setIsOpen(false);
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const handleSelect = (item: SearchResult) => {
    setQuery(item.name || item.title || item.objectID);
    setIsOpen(false);
    setActiveIndex(-1);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleFocus = () => {
    if (results.length > 0) {
      setIsOpen(true);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="autocomplete-listbox"
          aria-label="Search"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
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
          id="autocomplete-listbox"
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {results.map((result, index) => (
            <li
              key={result.objectID}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === activeIndex
                  ? 'bg-blue-100 text-blue-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">
                {highlightMatch(
                  result.name || result.title || result.objectID,
                  query
                )}
              </div>
              {result.description && (
                <div className="text-sm text-gray-600 truncate">
                  {highlightMatch(result.description, query)}
                </div>
              )}
              {result.category && (
                <div className="text-xs text-gray-400 mt-1">
                  {result.category}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Autocomplete;