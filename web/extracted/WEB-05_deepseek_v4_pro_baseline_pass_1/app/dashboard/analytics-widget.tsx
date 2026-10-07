"use client";

import { useEffect, useState, useCallback } from "react";
import type { AnalyticsSummary } from "@/lib/analytics/queries";

interface AnalyticsWidgetProps {
  initialData?: AnalyticsSummary;
  refreshIntervalMs?: number;
  className?: string;
}

type LoadingState = "idle" | "loading" | "error" | "success";

export default function AnalyticsWidget({
  initialData,
  refreshIntervalMs = 60_000,
  className = "",
}: AnalyticsWidgetProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(initialData ?? null);
  const [loadingState, setLoadingState] = useState<LoadingState>(
    initialData ? "success" : "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialData ? new Date() : null
  );

  const fetchData = useCallback(async () => {
    setLoadingState((prev) => (prev === "success" ? prev : "loading"));
    try {
      const response = await fetch("/api/analytics/summary", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result: AnalyticsSummary = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setLoadingState("success");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
      setLoadingState("error");
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
    const intervalId = setInterval(fetchData, refreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [fetchData, refreshIntervalMs, initialData]);

  const handleRefresh = () => {
    fetchData();
  };

  if (loadingState === "loading" && !data) {
    return (
      <div
        className={`analytics-widget analytics-widget--loading ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="analytics-widget__spinner" aria-hidden="true" />
        <p>Loading analytics data…</p>
      </div>
    );
  }

  if (loadingState === "error" && !data) {
    return (
      <div
        className={`analytics-widget analytics-widget--error ${className}`}
        role="alert"
      >
        <p className="analytics-widget__error-message">
          Failed to load analytics: {error}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          className="analytics-widget__retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section
      className={`analytics-widget ${className}`}
      aria-label="Analytics dashboard widget"
    >
      <header className="analytics-widget__header">
        <h2 className="analytics-widget__title">Analytics Overview</h2>
        <div className="analytics-widget__header-actions">
          {lastUpdated && (
            <span className="analytics-widget__last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            className="analytics-widget__refresh-button"
            disabled={loadingState === "loading"}
            aria-label="Refresh analytics data"
          >
            {loadingState === "loading" ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="analytics-widget__stale-warning" role="status">
          Showing stale data. Last refresh failed: {error}
        </div>
      )}

      <div className="analytics-widget__metrics-grid">
        <MetricCard label="Total Events" value={formatNumber(data.totalEvents)} />
        <MetricCard label="Unique Sessions" value={formatNumber(data.uniqueSessions)} />
        <MetricCard label="Unique Visitors" value={formatNumber(data.uniqueVisitors)} />
        <MetricCard
          label="Avg Session Duration"
          value={formatDuration(data.avgSessionDuration)}
        />
        <MetricCard label="Bounce Rate" value={formatPercent(data.bounceRate)} />
        <MetricCard label="Conversion Rate" value={formatPercent(data.conversionRate)} />
        <MetricCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
      </div>

      <div className="analytics-widget__sections">
        <div className="analytics-widget__section">
          <h3 className="analytics-widget__section-title">Top Pages</h3>
          <BarList
            items={data.topPages.map((p) => ({
              label: p.pageUrl,
              value: p.views,
            }))}
          />
        </div>

        <div className="analytics-widget__section">
          <h3 className="analytics-widget__section-title">Top Events</h3>
          <BarList
            items={data.topEvents.map((e) => ({
              label: e.eventName,
              value: e.count,
            }))}
          />
        </div>

        <div className="analytics-widget__section">
          <h3 className="analytics-widget__section-title">Device Breakdown</h3>
          <BarList
            items={data.deviceBreakdown.map((d) => ({
              label: d.deviceType,
              value: d.count,
            }))}
          />
        </div>

        <div className="analytics-widget__section">
          <h3 className="analytics-widget__section-title">Top Countries</h3>
          <BarList
            items={data.countryBreakdown.map((c) => ({
              label: c.country,
              value: c.count,
            }))}
          />
        </div>
      </div>

      <div className="analytics-widget__section analytics-widget__section--full">
        <h3 className="analytics-widget__section-title">Daily Trend</h3>
        <DailyTrendChart data={data.dailyTrend} />
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="analytics-widget__metric-card">
      <span className="analytics-widget__metric-label">{label}</span>
      <span className="analytics-widget__metric-value">{value}</span>
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="analytics-widget__bar-list">
      {items.length === 0 ? (
        <li className="analytics-widget__empty">No data available</li>
      ) : (
        items.map((item) => (
          <li key={item.label} className="analytics-widget__bar-item">
            <span className="analytics-widget__bar-label" title={item.label}>
              {item.label}
            </span>
            <div className="analytics-widget__bar-track">
              <div
                className="analytics-widget__bar-fill"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="analytics-widget__bar-value">
              {formatNumber(item.value)}
            </span>
          </li>
        ))
      )}
    </ul>
  );
}

function DailyTrendChart({
  data,
}: {
  data: Array<{ date: string; visits: number; revenue: number }>;
}) {
  const maxVisits = Math.max(...data.map((d) => d.visits), 1);
  return (
    <div className="analytics-widget__trend-chart">
      {data.length === 0 ? (
        <p className="analytics-widget__empty">No trend data available</p>
      ) : (
        <div className="analytics-widget__trend-bars">
          {data.map((day) => (
            <div key={day.date} className="analytics-widget__trend-bar-group">
              <div
                className="analytics-widget__trend-bar"
                style={{ height: `${(day.visits / maxVisits) * 100}%` }}
                title={`${day.date}: ${formatNumber(day.visits)} visits, ${formatCurrency(day.revenue)}`}
              />
              <span className="analytics-widget__trend-date">
                {day.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}