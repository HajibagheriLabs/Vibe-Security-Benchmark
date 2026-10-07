import AutocompleteClient from '@/components/AutocompleteClient';

export default function Home() {
  const handleHitSelect = (hit: any) => {
    console.log('Selected hit:', hit);
    // Navigate to product page or handle selection
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-8">Product Search</h1>
      <AutocompleteClient 
        indexName="products" 
        onHitSelect={handleHitSelect}
        placeholder="Search for products..."
      />
    </main>
  );
}