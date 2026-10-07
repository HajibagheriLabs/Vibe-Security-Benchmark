// src/app/dashboard/page.tsx
import AnalyticsWidget from './analytics-widget';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <AnalyticsWidget />
    </div>
  );
}