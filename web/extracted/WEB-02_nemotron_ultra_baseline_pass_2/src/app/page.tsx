import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Chat</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Streaming responses with OpenAI</p>
        </header>
        <Chat />
      </div>
    </main>
  );
}