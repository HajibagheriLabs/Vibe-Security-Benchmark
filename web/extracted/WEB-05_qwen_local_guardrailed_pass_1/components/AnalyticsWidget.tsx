// components/AnalyticsWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { getUserAnalytics } from '../actions/analytics';

interface AnalyticsData {
  event: string;
  count: number;
}

export default function AnalyticsWidget({ userId }: { userId: string }) {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUserAnalytics(userId).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="animate-pulse h-32 bg-gray-200 rounded" />;

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-lg font-bold mb-2">User Activity</h2>
      <ul>
        {data.map((item) => (
          <li key={item.event} className="flex justify-between">
            <span>{item.event}</span>
            <span className="font-mono">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}