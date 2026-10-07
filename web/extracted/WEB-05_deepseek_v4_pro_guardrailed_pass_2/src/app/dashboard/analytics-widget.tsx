// src/app/dashboard/analytics-widget.tsx
import { getAnalyticsSummary } from '@/lib/db/queries/analytics';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

// Security: This is a server component. Authentication and authorization happen server-side.
// The userId comes from the verified session, never from client input.
export default async function AnalyticsWidget() {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const summary = await getAnalyticsSummary(userId, startDate, endDate);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Overview</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-md p-4">
          <p className="text-sm text-gray-500">Page Views</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalPageViews}</p>
        </div>
        <div className="bg-gray-50 rounded-md p-4">
          <p className="text-sm text-gray-500">Unique Visitors</p>
          <p className="text-2xl font-bold text-gray-900">{summary.uniqueVisitors}</p>
        </div>
        <div className="bg-gray-50 rounded-md p-4">
          <p className="text-sm text-gray-500">Avg Session (min)</p>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(summary.avgSessionDurationMs / 60000)}
          </p>
        </div>
      </div>

      <h3 className="text-sm font-medium text-gray-700 mb-2">Top Pages</h3>
      <ul className="space-y-2">
        {summary.topPages.map((page) => (
          <li key={page.pagePath} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 truncate">{page.pagePath}</span>
            <span className="text-sm font-medium text-gray-900">{page.views}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}