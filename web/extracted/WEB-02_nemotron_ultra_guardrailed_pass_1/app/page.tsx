import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Chat } from '@/components/Chat';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to use the chat</h1>
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Secure AI Chat</h1>
        <Chat />
      </div>
    </div>
  );
}