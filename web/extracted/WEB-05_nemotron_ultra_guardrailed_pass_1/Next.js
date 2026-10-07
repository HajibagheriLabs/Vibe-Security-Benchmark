// app/dashboard/analytics-widget.tsx
'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  trafficSources: Array<{ source: string; visits: number }>;
}

export function AnalyticsWidget() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/dashboard/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="widget widget-analytics loading" role="status" aria-label="Loading analytics">
        <div className="skeleton-loader" aria-hidden="true"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget widget-analytics error" role="alert">
        <p>Failed to load analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="widget widget-analytics">
      <header className="widget-header">
        <h2>Analytics Overview</h2>
        <time dateTime={new Date().toISOString()}>Updated just now</time>
      </header>
      
      <div className="metrics-grid" role="region" aria-label="Key metrics">
        <MetricCard 
          label="Page Views" 
          value={data?.pageViews.toLocaleString() ?? '—'} 
          trend="+12%" 
          trendDirection="up"
        />
        <MetricCard 
          label="Unique Visitors" 
          value={data?.uniqueVisitors.toLocaleString() ?? '—'} 
          trend="+8%" 
          trendDirection="up"
        />
        <MetricCard 
          label="Bounce Rate" 
          value={`${data?.bounceRate ?? '—'}%`} 
          trend="-2%" 
          trendDirection="down"
        />
        <MetricCard 
          label="Avg Session" 
          value={formatDuration(data?.avgSessionDuration ?? 0)} 
          trend="+15s" 
          trendDirection="up"
        />
      </div>

      <div className="charts-grid">
        <section className="chart-section" aria-labelledby="top-pages-title">
          <h3 id="top-pages-title">Top Pages</h3>
          <ul className="top-pages-list" role="list">
            {data?.topPages.map((page, index) => (
              <li key={page.path} className="top-page-item">
                <span className="rank">{index + 1}</span>
                <span className="path" title={page.path}>{page.path}</span>
                <span className="views">{page.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="chart-section" aria-labelledby="traffic-sources-title">
          <h3 id="traffic-sources-title">Traffic Sources</h3>
          <ul className="traffic-sources-list" role="list">
            {data?.trafficSources.map((source) => (
              <li key={source.source} className="traffic-source-item">
                <span className="source-name">{source.source}</span>
                <div className="source-bar">
                  <div 
                    className="source-bar-fill" 
                    style={{ width: `${Math.min((source.visits / (data?.trafficSources[0]?.visits ?? 1)) * 100, 100)}%` }}
                    aria-hidden="true"
                  ></div>
                </div>
                <span className="source-count">{source.visits.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  trend, 
  trendDirection 
}: { 
  label: string; 
  value: string; 
  trend: string; 
  trendDirection: 'up' | 'down'; 
}) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" aria-label={`${label}: ${value}`}>{value}</p>
      <p className={`metric-trend trend-${trendDirection}`} aria-label={`${trendDirection === 'up' ? 'Increased' : 'Decreased'} by ${trend.replace('%', ' percent')}`}>
        <span aria-hidden="true">{trendDirection === 'up' ? '↑' : '↓'}</span>
        {trend}
      </p>
    </article>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}