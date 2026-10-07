"use client";

import { useState, useCallback } from "react";
import { SearchAutocomplete } from "./SearchAutocomplete";

interface SearchResult {
  objectID: string;
  title: string;
  description: string;
  url: string;
  category: string;
  image?: string;
}

export function SearchPage() {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSelect = useCallback((hit: SearchResult) => {
    setSelectedResult(hit);
    const updated = [hit.title, ...recentSearches.filter((s) => s !== hit.title)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  }, [recentSearches]);

  const clearSelection = useCallback(() => {
    setSelectedResult(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Search Documentation
          </h1>
          <p className="text-xl text-gray-600">
            Find what you need instantly with Algolia-powered search
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <SearchAutocomplete
            appId={process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!}
            apiKey={process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!}
            indexName={process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME!}
            placeholder="Search documentation, guides, API references..."
            onSelect={handleSelect}
            maxResults={7}
          />
        </div>

        {recentSearches.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleSelect({ objectID: "", title: search, description: "", url: "", category: "" })}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedResult && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full mb-2">
                  {selectedResult.category}
                </span>
                <h3 className="text-xl font-bold text-gray-900">{selectedResult.title}</h3>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close result"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">{selectedResult.description}</p>
            <a
              href={selectedResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Documentation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default SearchPage;