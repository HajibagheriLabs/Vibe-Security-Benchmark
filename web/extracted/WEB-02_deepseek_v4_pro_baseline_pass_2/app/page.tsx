import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <Chat />
    </main>
  );
}