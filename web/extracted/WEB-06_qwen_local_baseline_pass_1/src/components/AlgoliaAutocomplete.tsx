'use client';

import { useEffect, useRef, useState } from 'react';
import algoliasearch from 'algoliasearch';
import {
  Autocomplete,
  getAlgoliaResults,
  getAlgoliaSuggestionQuery,
  useAutocomplete,
} from '@algolia/autocomplete-js';
import { createFetchPlugin } from '@algolia/autocomplete-plugin-fetch';
import '@algolia/autocomplete-theme-classic';

// Replace with your actual Algolia credentials
const APP_ID = 'YOUR_APP_ID';
const API_KEY = 'YOUR_SEARCH_ONLY_API_KEY';
const INDEX_NAME = 'YOUR_INDEX_NAME';

const searchClient = algoliasearch(APP_ID, API_KEY);

interface Hit {
  objectID: string;
  title: string;
  description?: string;
  url?: string;
  [key: string]: any;
}

interface AutocompleteState {
  collections: any[];
  context: any;
  isOpen: boolean;
  query: string;
  activeItemId: number | null;
  status: string;
}

export default function AlgoliaAutocomplete() {
  const [state, setState] = useState<AutocompleteState>({
    collections: [],
    context: {},
    isOpen: false,
    query: '',
    activeItemId: null,
    status: 'idle',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<any>(null);

  useEffect(() => {
    contextRef.current = {
      searchClient,
      indexName: INDEX_NAME,
    };
  }, []);

  const autocomplete = useAutocomplete({
    id: 'algolia-search',
    getSources: ({ query }) => {
      if (!query) {
        return [];
      }

      return [
        {
          sourceId: 'algolia',
          getItems: async () => {
            const results = await getAlgoliaResults({
              searchClient,
              queries: [
                {
                  indexName: INDEX_NAME,
                  query,
                  params: {
                    hitsPerPage: 5,
                  },
                },
              ],
            });

            return results[0].hits as Hit[];
          },
          getItemUrl: ({ item }) => {
            return (item as Hit).url || '#';
          },
          onSelect: ({ item }) => {
            const hit = item as Hit;
            if (hit.url) {
              window.location.href = hit.url;
            }
          },
          templates: {
            item: ({ item, components }) => {
              return (
                <div className="aa-ItemContent">
                  <div className="aa-ItemTitle">
                    <components.Highlight hit={item} attribute="title" />
                  </div>
                  {item.description && (
                    <div className="aa-ItemDescription">
                      <components.Snippet hit={item} attribute="description" />
                    </div>
                  )}
                </div>
              );
            },
          },
        },
      ];
    },
    onStateChange: (props) => {
      setState({
        collections: props.collections,
        context: props.context,
        isOpen: props.isOpen,
        query: props.query,
        activeItemId: props.activeItemId,
        status: props.status,
      });
    },
  });

  return (
    <div className="aa-Autocomplete" ref={containerRef}>
      <Autocomplete
        {...autocomplete}
        className="aa-Autocomplete"
        title=""
        openOnFocus={false}
        placeholder="Search..."
      />
    </div>
  );
}