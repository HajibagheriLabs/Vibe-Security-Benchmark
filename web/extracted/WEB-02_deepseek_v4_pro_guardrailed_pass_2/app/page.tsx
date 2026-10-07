// app/page.tsx
import ChatComponent from '@/components/ChatComponent';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Security: Protect the page - redirect to login if not authenticated
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">AI Chat Assistant</h1>
      </header>
      <ChatComponent />
    </main>
  );
}