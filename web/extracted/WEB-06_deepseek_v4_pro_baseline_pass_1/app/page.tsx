'use client';

import Autocomplete from '@/components/Autocomplete';

export default function Home() {
  const handleSelect = (item: any) => {
    console.log('Selected item:', item);
    // Handle navigation or other actions here
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Search Products</h1>
        
        <Autocomplete
          appId={process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || ''}
          apiKey={process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || ''}
          indexName={process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'products'}
          placeholder="Search for products..."
          onSelect={handleSelect}
          maxResults={8}
        />
        
        <div className="mt-8 text-sm text-gray-600">
          <p>Try searching for products, categories, or brands</p>
        </div>
      </div>
    </main>
  );
}