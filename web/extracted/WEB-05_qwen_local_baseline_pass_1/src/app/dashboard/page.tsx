'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  totalEvents: number;
  recentEvents: Array<{
    id: number;
    event: string;
    userId: string | null;
    value: number;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) {
          throw new Error('Failed to fetch data');
        }
        const result: AnalyticsData = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Total Events</h2>
        <p className="text-3xl font-bold">{data.totalEvents}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Recent Events</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.recentEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-2 whitespace-nowrap">{event.event}</td>
                <td className="px-4 py-2 whitespace-nowrap">{event.userId || 'N/A'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{event.value}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}