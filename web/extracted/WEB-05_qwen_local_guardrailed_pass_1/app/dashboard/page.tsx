// app/dashboard/page.tsx
import AnalyticsWidget from '../../components/AnalyticsWidget';

// Flag: Identity comes from verified session (e.g., NextAuth or custom middleware)
// In a real app, this would be fetched server-side from the session object
const MOCK_USER_ID = 'usr_123456789';

export default function DashboardPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <AnalyticsWidget userId={MOCK_USER_ID} />
    </main>
  );
}