import { useState, useCallback } from 'react';
import { AutocompleteState } from '@algolia/autocomplete-core';

interface Product {
  objectID: string;
  name: string;
  description: string;
  price: number;
}

interface SearchState {
  query: string;
  results: Product[];
  isLoading: boolean;
  error: string | null;
}

export function useAlgoliaSearch() {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
  });

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, query, results: [], isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, query, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setState((prev) => ({
        ...prev,
        results: data.results || [],
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      query: '',
      results: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    state,
    search,
    reset,
  };
}