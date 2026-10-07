'use client';

import { useEffect, useState, useMemo } from 'react';
import { autocomplete } from '@algolia/autocomplete-js';
import '@algolia/autocomplete-theme-classic';
import { useAlgoliaSearch } from '@/hooks/useAlgoliaSearch';

export function AlgoliaAutocomplete() {
  const { state, search, reset } = useAlgoliaSearch();
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Rule 3: CRLF strip before logging (if needed)
  useEffect(() => {
    if (state.error) {
      console.error('Search Error:', state.error.replace(/[\r\n]/g, ''));
    }
  }, [state.error]);

  // Initialize Algolia Autocomplete instance
  useEffect(() => {
    if (!containerRef) return;

    const searchRef = search; // Capture current search function
    const resetRef = reset;   // Capture current reset function

    const algoliaAutocomplete = autocomplete({
      container: containerRef,
      placeholder: 'Search products...',
      initialState: {
        query: state.query,
      },
      getSources({ query }) {
        if (!query) return [];

        return [
          {
            sourceId: 'products',
            getItems() {
              return state.results;
            },
            getItemUrl({ item }) {
              return `/product/${item.objectID}`;
            },
            onSelect({ item }) {
              // Navigate to product page
              window.location.href = `/product/${item.objectID}`;
            },
            templates: {
              item({ item }) {
                return `
                  <div class="aa-ItemContent">
                    <div class="aa-ItemTitle">
                      <span>${item.name}</span>
                    </div>
                    <div class="aa-ItemDescription">
                      ${item.description}
                    </div>
                    <div class="aa-ItemSubtitle">
                      $${item.price.toFixed(2)}
                    </div>
                  </div>
                `;
              },
            },
          },
        ];
      },
      onStateChange({ query }) {
        // Debounce could be added here, but we rely on hook state for now
        searchRef(query);
      },
      onReset() {
        resetRef();
      },
    });

    return () => {
      algoliaAutocomplete.destroy();
    };
  }, [containerRef, state.results, state.query]); // Re-init if results change significantly or on mount

  return (
    <div ref={(ref) => setContainerRef(ref)} className="aa-Autocomplete" />
  );
}