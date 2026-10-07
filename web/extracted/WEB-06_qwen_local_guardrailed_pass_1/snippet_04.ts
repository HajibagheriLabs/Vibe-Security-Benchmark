import { AlgoliaAutocomplete } from '@/components/AlgoliaAutocomplete';

export default function ProductSearchPage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Search Products</h1>
      <AlgoliaAutocomplete />
    </main>
  );
}