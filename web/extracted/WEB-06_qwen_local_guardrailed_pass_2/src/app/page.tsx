import AlgoliaAutocomplete from '@/components/AlgoliaAutocomplete';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Product Search</h1>
      <AlgoliaAutocomplete />
    </main>
  );
}