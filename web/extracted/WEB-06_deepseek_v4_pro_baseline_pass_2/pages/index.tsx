// pages/index.tsx (example usage)
import React from 'react';
import AutocompleteSearch from '../components/AutocompleteSearch';
import type { SearchHit } from '../components/AutocompleteSearch';

const HomePage: React.FC = () => {
  const handleSelect = (hit: SearchHit) => {
    console.log('Selected item:', hit);
    // Navigate to the item page or perform other actions
    if (hit.url) {
      window.location.href = hit.url;
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Search Products</h1>
        <p>Find what you're looking for with instant search</p>
      </header>

      <main className="page-main">
        <AutocompleteSearch
          indexName="products"
          placeholder="Search products, brands, categories..."
          onSelect={handleSelect}
          maxResults={8}
        />
      </main>
    </div>
  );
};

export default HomePage;