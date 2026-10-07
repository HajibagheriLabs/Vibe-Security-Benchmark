'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { instantsearch } from 'instantsearch.js';
import { connectAutocomplete } from 'instantsearch.js/es/connectors';
import { searchClient } from '@/lib/algolia'; // Assume this exports a configured algoliasearch client
import { Hit } from 'algoliasearch';

// Define the shape of your Algolia hits
interface ProductHit extends Hit {
  objectID: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
}

// Custom connector for Autocomplete
const customAutocompleteConnector = connectAutocomplete<{
  query: string;
  hits: ProductHit[];
  isLoading: boolean;
  refine: (query: string) => void;
}>((renderFn, isFirst) => {
  let searchClient: any;
  let searchParameters: any;
  let currentRefinement: string = '';
  let unsubscribe: (() => void) | null = null;

  return {
    init(initOptions) {
      const { results } = initOptions;
      searchClient = initOptions.searchClient;
      searchParameters = initOptions.searchParameters;

      renderFn({
        ...this.getWidgetState(initOptions),
        refine: this.refine.bind(this),
      });

      unsubscribe = searchClient.on('result', () => {
        renderFn({
          ...this.getWidgetState(initOptions),
          refine: this.refine.bind(this),
        });
      });
    },

    render(renderOptions) {
      const { results } = renderOptions;
      renderFn({
        ...this.getWidgetState(renderOptions),
        refine: this.refine.bind(this),
      });
    },

    dispose() {
      if (unsubscribe) {
        unsubscribe();
      }
    },

    getWidgetState(renderOptions) {
      const { results } = renderOptions;
      const hits = results?.hits || [];
      
      return {
        query: currentRefinement,
        hits: hits as ProductHit[],
        isLoading: !results,
        refine: this.refine.bind(this),
      };
    },

    refine(query: string) {
      currentRefinement = query;
      searchClient.search([
        {
          indexName: searchParameters.indexName,
          params: {
            query: query,
            ...searchParameters.queryParameters,
          },
        },
      ]);
    },
  };
});

interface AutocompleteProps {
  indexName: string;
  onHitSelect?: (hit: ProductHit) => void;
  placeholder?: string;
}

export default function AutocompleteClient({
  indexName,
  onHitSelect,
  placeholder = 'Search products...',
}: AutocompleteProps) {
  const [state, setState] = useState<{
    query: string;
    hits: ProductHit[];
    isLoading: boolean;
  }>({
    query: '',
    hits: [],
    isLoading: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize InstantSearch instance
  useEffect(() => {
    if (!containerRef.current) return;

    const search = instantsearch({
      indexName,
      searchClient,
    });

    // Use our custom connector
    search.addWidgets([
      customAutocompleteConnector({
        render: (renderOptions, isFirstRender) => {
          if (isFirstRender) {
            return;
          }
          setState({
            query: renderOptions.query,
            hits: renderOptions.hits,
            isLoading: renderOptions.isLoading,
          });
        },
        dispose: () => {},
      }),
    ]);

    search.start();

    return () => {
      search.dispose();
    };
  }, [indexName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setState((prev) => ({ ...prev, query: value }));
    
    // Trigger search immediately on input change
    // Note: In a real app, you might want debouncing here
    const searchWidget = containerRef.current?.querySelector('[data-widget-id="autocomplete"]');
    // Simple approach: we rely on the custom connector's refine method being exposed or 
    // we can access the search instance. For this example, we'll assume the custom connector
    // updates state directly. However, to trigger search, we need to call refine.
    // Since our custom connector exposes 'refine' in the state, we can't easily call it 
    // from here without storing the search instance or using a ref.
    // Let's simplify: The custom connector listens to 'results' events. 
    // We need a way to trigger search. 
    // Alternative: Use the standard instantsearch 'searchBox' widget and connect it.
  };

  // Refined approach: Use standard InstantSearch searchBox widget and connect it
  useEffect(() => {
    if (!containerRef.current) return;

    const search = instantsearch({
      indexName,
      searchClient,
    });

    search.addWidgets([
      instantsearch.widgets.searchBox({
        container: containerRef.current,
        placeholder,
        autofocus: false,
        showReset: false,
        showSubmit: false,
        searchAsYouEnter: true,
        cssClasses: {
          form: 'relative',
          input: 'w-full p-2 border rounded',
        },
        // Hook into the search process to update our local state
        onChange(query) {
          setState(prev => ({ ...prev, query }));
        },
        onSubmit(params) {
          // Optional: Handle explicit submit
        },
        onReset() {
          setState(prev => ({ ...prev, query: '' }));
        }
      }),
      instantsearch.widgets.hits({
        container: '#hits-container',
        hitComponent: ({ hit }: { hit: ProductHit }) => {
          return (
            <div 
              className="p-2 hover:bg-gray-100 cursor-pointer border-b"
              onClick={() => {
                if (onHitSelect) {
                  onHitSelect(hit as ProductHit);
                }
              }}
            >
              <div className="font-bold">{hit.name}</div>
              <div className="text-sm text-gray-600">{hit.category}</div>
              <div className="text-sm text-blue-600">${hit.price}</div>
            </div>
          );
        },
        cssClasses: {
          list: 'absolute top-full left-0 right-0 bg-white border shadow-lg z-50 max-h-60 overflow-y-auto',
        }
      })
    ]);

    search.start();

    return () => {
      search.dispose();
    };
  }, [indexName, onHitSelect, placeholder]);

  return (
    <div className="relative w-full max-w-md">
      {/* Search Box Container */}
      <div id="search-box-container"></div>
      
      {/* Hits Container */}
      <div id="hits-container"></div>
    </div>
  );
}