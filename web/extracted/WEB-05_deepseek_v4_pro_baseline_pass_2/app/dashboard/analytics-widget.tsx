// app/dashboard/analytics-widget.tsx
import { useEffect, useState } from 'react';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { analytics } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

// Initialize Drizzle ORM client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema: { analytics } });

interface AnalyticsData {
  id: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function AnalyticsWidget() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await db
          .select()
          .from(analytics)
          .orderBy(desc(analytics.date))
          .limit(1);

        if (result && result.length > 0) {
          setData(result[0] as AnalyticsData);
        } else {
          setData(null);
        }
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Unable to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="analytics-widget analytics-widget--loading">
        <div className="analytics-widget__spinner" aria-label="Loading analytics data" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-widget analytics-widget--error" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-widget analytics-widget--empty">
        <p>No analytics data available yet.</p>
      </div>
    );
  }

  return (
    <div className="analytics-widget">
      <h2 className="analytics-widget__title">Analytics Overview</h2>
      <div className="analytics-widget__grid">
        <div className="analytics-widget__metric">
          <span className="analytics-widget__metric-label">Page Views</span>
          <span className="analytics-widget__metric-value">
            {data.pageViews.toLocaleString()}
          </span>
        </div>
        <div className="analytics-widget__metric">
          <span className="analytics-widget__metric-label">Unique Visitors</span>
          <span className="analytics-widget__metric-value">
            {data.uniqueVisitors.toLocaleString()}
          </span>
        </div>
        <div className="analytics-widget__metric">
          <span className="analytics-widget__metric-label">Bounce Rate</span>
          <span className="analytics-widget__metric-value">
            {data.bounceRate.toFixed(1)}%
          </span>
        </div>
        <div className="analytics-widget__metric">
          <span className="analytics-widget__metric-label">Avg. Session Duration</span>
          <span className="analytics-widget__metric-value">
            {formatDuration(data.avgSessionDuration)}
          </span>
        </div>
      </div>
      <p className="analytics-widget__date">
        Data as of {new Date(data.date).toLocaleDateString()}
      </p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}