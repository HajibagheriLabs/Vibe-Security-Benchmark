import { db } from '@/lib/db';
import { analytics } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export default async function DashboardPage() {
  const recentEvents = await db
    .select()
    .from(analytics)
    .orderBy(desc(analytics.createdAt))
    .limit(10);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">Event Type</th>
              <th className="px-4 py-2 border-b">User ID</th>
              <th className="px-4 py-2 border-b">Created At</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-2 border-b">{event.eventType}</td>
                <td className="px-4 py-2 border-b">{event.userId || 'N/A'}</td>
                <td className="px-4 py-2 border-b">{event.createdAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {recentEvents.length === 0 && (
        <p className="text-gray-500 mt-4">No analytics data found.</p>
      )}
    </div>
  );
}