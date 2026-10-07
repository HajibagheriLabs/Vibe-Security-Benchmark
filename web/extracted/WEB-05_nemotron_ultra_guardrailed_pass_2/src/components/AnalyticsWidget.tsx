'use client';

import { useState, useEffect } from 'react';

interface AnalyticsPoint {
  date: string;
  pageviews: number;
  sessions: number;
  users: number;
  bounceRate: number;
}

interface AnalyticsWidgetProps {
  initialMetric?: 'pageviews' | 'sessions' | 'users' | 'bounceRate';
}

export function AnalyticsWidget({ initialMetric = 'pageviews' }: AnalyticsWidgetProps) {
  const [data, setData] = useState<AnalyticsPoint[]>([]);
  const [metric, setMetric] = useState(initialMetric);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ metric });
    fetch(`/api/analytics?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
      })
      .then(({ data }) => setData(data))
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded" />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  const maxValue = Math.max(...data.map((d) => d[metric]), 1);

  return (
    <div className="p-4 bg-white rounded-lg shadow border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="pageviews">Pageviews</option>
          <option value="sessions">Sessions</option>
          <option value="users">Users</option>
          <option value="bounceRate">Bounce Rate</option>
        </select>
      </div>
      <div className="h-64 flex items-end justify-around px-2">
        {data.slice(-30).map((point, i) => (
          <div key={i} className="flex flex-col items-center flex-1 max-w-[30px]">
            <div
              className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
              style={{ height: `${(point[metric] / maxValue) * 100}%`, minHeight: '4px' }}
              title={`${point.date}: ${point[metric]}`}
            />
            <span className="text-xs text-gray-500 mt-1">{point.date.split('T')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}