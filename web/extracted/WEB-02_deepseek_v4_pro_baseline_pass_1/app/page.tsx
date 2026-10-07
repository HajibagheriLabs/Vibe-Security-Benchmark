import ChatContainer from '@/components/ChatContainer';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 h-[calc(100vh-4rem)]">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          AI Chat Assistant
        </h1>
        <div className="h-[calc(100%-4rem)]">
          <ChatContainer />
        </div>
      </div>
    </main>
  );
}