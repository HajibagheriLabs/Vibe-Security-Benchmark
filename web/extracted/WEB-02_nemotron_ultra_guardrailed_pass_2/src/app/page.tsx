src/app/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Chat } from '@/components/Chat';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  return (
    <main className="main">
      <header>
        <h1>Secure Chat</h1>
        <p>Welcome, {session.user.name || session.user.email}</p>
      </header>
      <Chat />
    </main>
  );
}