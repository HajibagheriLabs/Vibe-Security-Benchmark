'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  id: string;
  event_type: string;
  user_id: string;
  metadata: string | null;
  created_at: string;
}

export default function DashboardWidget() {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics?limit=5');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const json = await response.json();
        if (json.success) {
          setData(json.data);
        } else {
          throw new Error(json.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-4">Loading analytics...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Recent Analytics</h2>
      <ul className="space-y-2">
        {data.map((item) => (
          <li key={item.id} className="p-2 bg-gray-50 rounded">
            <div className="flex justify-between">
              <span className="font-medium">{item.event_type}</span>
              <span className="text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              User: {item.user_id}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}