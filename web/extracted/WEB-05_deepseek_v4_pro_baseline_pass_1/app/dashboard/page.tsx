import AnalyticsWidget from "./analytics-widget";
import { getAnalyticsSummary } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let initialData = null;
  try {
    initialData = await getAnalyticsSummary();
  } catch (error) {
    console.error("Failed to load initial analytics data:", error);
  }

  return (
    <main className="dashboard-page">
      <h1 className="dashboard-page__title">Dashboard</h1>
      <AnalyticsWidget initialData={initialData} refreshIntervalMs={30_000} />
    </main>
  );
}