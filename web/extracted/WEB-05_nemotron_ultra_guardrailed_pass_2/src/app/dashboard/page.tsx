import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnalyticsWidget } from '@/components/AnalyticsWidget';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnalyticsWidget initialMetric="pageviews" />
        <AnalyticsWidget initialMetric="sessions" />
        <AnalyticsWidget initialMetric="users" />
        <AnalyticsWidget initialMetric="bounceRate" />
      </div>
    </main>
  );
}