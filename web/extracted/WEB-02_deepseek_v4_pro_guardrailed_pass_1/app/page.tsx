import ChatComponent from './components/ChatComponent';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">AI Chat</h1>
      <ChatComponent />
    </main>
  );
}