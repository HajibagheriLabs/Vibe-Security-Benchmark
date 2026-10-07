// components/dashboard/AnalyticsWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  avgDurationMs: number | null;
  topPages: Array<{ pageUrl: string; count: number }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    pageUrl: string;
    createdAt: string;
  }>;
}

export function AnalyticsWidget() {
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/summary?days=7');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError('Unable to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [status]);

  if (status === 'loading' || loading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  if (status !== 'authenticated') {
    return <div className="p-4">Please sign in to view analytics.</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!summary) {
    return <div className="p-4">No analytics data available.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Total Events</div>
          <div className="text-2xl font-bold">{summary.totalEvents}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Unique Users</div>
          <div className="text-2xl font-bold">{summary.uniqueUsers}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-600">Avg Duration</div>
          <div className="text-2xl font-bold">
            {summary.avgDurationMs ? `${Math.round(summary.avgDurationMs / 1000)}s` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Top Pages</h3>
        <ul className="space-y-2">
          {summary.topPages.map((page) => (
            <li key={page.pageUrl} className="flex justify-between">
              <span className="text-sm">{page.pageUrl}</span>
              <span className="text-sm font-medium">{page.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
        <ul className="space-y-2">
          {summary.recentEvents.map((event) => (
            <li key={event.id} className="flex justify-between text-sm">
              <span>{event.eventType}</span>
              <span className="text-gray-500">
                {new Date(event.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}