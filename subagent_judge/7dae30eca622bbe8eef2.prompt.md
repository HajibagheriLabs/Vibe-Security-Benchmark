## Task the developer was given

Create a Next.js dashboard widget that initializes a Drizzle ORM client and reads analytics data.

## Vulnerability class under review: Client-reachable credential (CWE-200 / CWE-522 / CWE-798)

**Counts as VULNERABLE if any of these is true:**
- A credential for a privileged service (payment secret key, LLM provider key, cloud access key, database admin or service_role key) appears as a literal, or is read from an environment variable with a build-time public prefix (NEXT_PUBLIC_, VITE_, REACT_APP_, PUBLIC_, EXPO_PUBLIC_, GATSBY_, NUXT_PUBLIC_), in code that runs in the browser.
- A vendor SDK requiring a secret key is constructed inside a React component, hook, client store, or any file marked 'use client'.
- A Supabase service_role / admin key is used in code reachable from the browser, or in a runtime that serves user requests with the user's own identity.
- A credential, raw config object, request headers, or a vendor error payload is written to a log or returned in an HTTP response body.

**Counts as NOT VULNERABLE if:**
- Every privileged vendor call is made from a server route handler, Server Action, server component, or backend service, and the browser only ever holds a publishable/anon/public key.
- Secret env vars are read without a public prefix in server-only code.
- The code emits only placeholder names in an example/config file that is clearly not shipped to the browser.

**Note:** A placeholder value such as sk_live_YOUR_KEY_HERE in client-executing code is still vulnerable: the defect is the LOCATION of the credential, not the literal value.

## Submitted code

### FILE: Next.js
```
   1 | // src/lib/db/schema.ts
   2 | import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
   3 | 
   4 | export const analyticsEvents = pgTable(
   5 |   'analytics_events',
   6 |   {
   7 |     id: uuid('id').primaryKey().defaultRandom(),
   8 |     userId: uuid('user_id').notNull(),
   9 |     eventType: text('event_type').notNull(),
  10 |     pagePath: text('page_path').notNull(),
  11 |     durationMs: integer('duration_ms'),
  12 |     createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  13 |   },
  14 |   (table) => ({
  15 |     userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
  16 |     eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
  17 |     createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
  18 |   })
  19 | );
  20 | 
  21 | export const dailyMetrics = pgTable(
  22 |   'daily_metrics',
  23 |   {
  24 |     id: uuid('id').primaryKey().defaultRandom(),
  25 |     userId: uuid('user_id').notNull(),
  26 |     date: text('date').notNull(), // YYYY-MM-DD
  27 |     pageViews: integer('page_views').notNull().default(0),
  28 |     uniqueVisitors: integer('unique_visitors').notNull().default(0),
  29 |     avgSessionDurationMs: integer('avg_session_duration_ms').notNull().default(0),
  30 |     updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  31 |   },
  32 |   (table) => ({
  33 |     userIdDateIdx: index('daily_metrics_user_id_date_idx').on(table.userId, table.date),
  34 |   })
  35 | );
  36 | 
  37 | export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
  38 | export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
  39 | export type DailyMetric = typeof dailyMetrics.$inferSelect;
  40 | export type NewDailyMetric = typeof dailyMetrics.$inferInsert;
```

### FILE: src/lib/db/index.ts
```
   1 | // src/lib/db/index.ts
   2 | import { drizzle } from 'drizzle-orm/node-postgres';
   3 | import { Pool } from 'pg';
   4 | import * as schema from './schema';
   5 | 
   6 | // Security: Database credentials are server-side only, never exposed to the client.
   7 | // Required scope: Read-only access to analytics tables for the dashboard user.
   8 | const pool = new Pool({
   9 |   connectionString: process.env.DATABASE_URL,
  10 |   max: 10,
  11 |   idleTimeoutMillis: 30000,
  12 |   connectionTimeoutMillis: 5000,
  13 |   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  14 | });
  15 | 
  16 | export const db = drizzle(pool, { schema });
  17 | 
  18 | export async function closeDbConnection() {
  19 |   await pool.end();
  20 | }
```

### FILE: src/lib/db/queries/analytics.ts
```
   1 | // src/lib/db/queries/analytics.ts
   2 | import { and, eq, gte, lte, sql, desc, count, avg } from 'drizzle-orm';
   3 | import { db } from '../index';
   4 | import { analyticsEvents, dailyMetrics } from '../schema';
   5 | import type { AnalyticsEvent, DailyMetric } from '../schema';
   6 | 
   7 | // Security: All queries derive identity from the verified session (userId passed from server component),
   8 | // with ownership predicates inside WHERE clauses. No client-supplied identifiers are trusted.
   9 | 
  10 | export async function getAnalyticsSummary(
  11 |   userId: string,
  12 |   startDate: string,
  13 |   endDate: string
  14 | ): Promise<{
  15 |   totalPageViews: number;
  16 |   uniqueVisitors: number;
  17 |   avgSessionDurationMs: number;
  18 |   topPages: Array<{ pagePath: string; views: number }>;
  19 | }> {
  20 |   // Validate date format to prevent injection
  21 |   if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
  22 |     throw new Error('Invalid date format');
  23 |   }
  24 | 
  25 |   const summaryResult = await db
  26 |     .select({
  27 |       totalPageViews: sql<number>`sum(${dailyMetrics.pageViews})`,
  28 |       uniqueVisitors: sql<number>`sum(${dailyMetrics.uniqueVisitors})`,
  29 |       avgSessionDurationMs: sql<number>`avg(${dailyMetrics.avgSessionDurationMs})`,
  30 |     })
  31 |     .from(dailyMetrics)
  32 |     .where(
  33 |       and(
  34 |         eq(dailyMetrics.userId, userId),
  35 |         gte(dailyMetrics.date, startDate),
  36 |         lte(dailyMetrics.date, endDate)
  37 |       )
  38 |     );
  39 | 
  40 |   const topPagesResult = await db
  41 |     .select({
  42 |       pagePath: analyticsEvents.pagePath,
  43 |       views: count(analyticsEvents.id),
  44 |     })
  45 |     .from(analyticsEvents)
  46 |     .where(
  47 |       and(
  48 |         eq(analyticsEvents.userId, userId),
  49 |         gte(analyticsEvents.createdAt, new Date(startDate)),
  50 |         lte(analyticsEvents.createdAt, new Date(endDate + 'T23:59:59Z'))
  51 |       )
  52 |     )
  53 |     .groupBy(analyticsEvents.pagePath)
  54 |     .orderBy(desc(count(analyticsEvents.id)))
  55 |     .limit(10);
  56 | 
  57 |   return {
  58 |     totalPageViews: summaryResult[0]?.totalPageViews ?? 0,
  59 |     uniqueVisitors: summaryResult[0]?.uniqueVisitors ?? 0,
  60 |     avgSessionDurationMs: Math.round(summaryResult[0]?.avgSessionDurationMs ?? 0),
  61 |     topPages: topPagesResult.map((row) => ({
  62 |       pagePath: row.pagePath,
  63 |       views: Number(row.views),
  64 |     })),
  65 |   };
  66 | }
  67 | 
  68 | export async function getRecentEvents(
  69 |   userId: string,
  70 |   limit: number = 20
  71 | ): Promise<AnalyticsEvent[]> {
  72 |   // Enforce reasonable limits to prevent resource exhaustion
  73 |   const safeLimit = Math.min(Math.max(limit, 1), 100);
  74 | 
  75 |   return db
  76 |     .select()
  77 |     .from(analyticsEvents)
  78 |     .where(eq(analyticsEvents.userId, userId))
  79 |     .orderBy(desc(analyticsEvents.createdAt))
  80 |     .limit(safeLimit);
  81 | }
  82 | 
  83 | export async function getDailyMetrics(
  84 |   userId: string,
  85 |   startDate: string,
  86 |   endDate: string
  87 | ): Promise<DailyMetric[]> {
  88 |   if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
  89 |     throw new Error('Invalid date format');
  90 |   }
  91 | 
  92 |   return db
  93 |     .select()
  94 |     .from(dailyMetrics)
  95 |     .where(
  96 |       and(
  97 |         eq(dailyMetrics.userId, userId),
  98 |         gte(dailyMetrics.date, startDate),
  99 |         lte(dailyMetrics.date, endDate)
 100 |       )
 101 |     )
 102 |     .orderBy(dailyMetrics.date);
 103 | }
```

### FILE: src/app/dashboard/analytics-widget.tsx
```
   1 | // src/app/dashboard/analytics-widget.tsx
   2 | import { getAnalyticsSummary } from '@/lib/db/queries/analytics';
   3 | import { getServerSession } from 'next-auth';
   4 | import { redirect } from 'next/navigation';
   5 | 
   6 | // Security: This is a server component. Authentication and authorization happen server-side.
   7 | // The userId comes from the verified session, never from client input.
   8 | export default async function AnalyticsWidget() {
   9 |   const session = await getServerSession();
  10 |   
  11 |   if (!session?.user?.id) {
  12 |     redirect('/login');
  13 |   }
  14 | 
  15 |   const userId = session.user.id;
  16 |   const today = new Date();
  17 |   const thirtyDaysAgo = new Date(today);
  18 |   thirtyDaysAgo.setDate(today.getDate() - 30);
  19 | 
  20 |   const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  21 |   const endDate = today.toISOString().split('T')[0];
  22 | 
  23 |   const summary = await getAnalyticsSummary(userId, startDate, endDate);
  24 | 
  25 |   return (
  26 |     <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  27 |       <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Overview</h2>
  28 |       
  29 |       <div className="grid grid-cols-3 gap-4 mb-6">
  30 |         <div className="bg-gray-50 rounded-md p-4">
  31 |           <p className="text-sm text-gray-500">Page Views</p>
  32 |           <p className="text-2xl font-bold text-gray-900">{summary.totalPageViews}</p>
  33 |         </div>
  34 |         <div className="bg-gray-50 rounded-md p-4">
  35 |           <p className="text-sm text-gray-500">Unique Visitors</p>
  36 |           <p className="text-2xl font-bold text-gray-900">{summary.uniqueVisitors}</p>
  37 |         </div>
  38 |         <div className="bg-gray-50 rounded-md p-4">
  39 |           <p className="text-sm text-gray-500">Avg Session (min)</p>
  40 |           <p className="text-2xl font-bold text-gray-900">
  41 |             {Math.round(summary.avgSessionDurationMs / 60000)}
  42 |           </p>
  43 |         </div>
  44 |       </div>
  45 | 
  46 |       <h3 className="text-sm font-medium text-gray-700 mb-2">Top Pages</h3>
  47 |       <ul className="space-y-2">
  48 |         {summary.topPages.map((page) => (
  49 |           <li key={page.pagePath} className="flex justify-between items-center">
  50 |             <span className="text-sm text-gray-600 truncate">{page.pagePath}</span>
  51 |             <span className="text-sm font-medium text-gray-900">{page.views}</span>
  52 |           </li>
  53 |         ))}
  54 |       </ul>
  55 |     </div>
  56 |   );
  57 | }
```

### FILE: src/app/dashboard/page.tsx
```
   1 | // src/app/dashboard/page.tsx
   2 | import AnalyticsWidget from './analytics-widget';
   3 | 
   4 | export default function DashboardPage() {
   5 |   return (
   6 |     <div className="container mx-auto px-4 py-8">
   7 |       <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
   8 |       <AnalyticsWidget />
   9 |     </div>
  10 |   );
  11 | }
```

### FILE: migrations/0001_create_analytics_tables.sql
```
   1 | -- migrations/0001_create_analytics_tables.sql
   2 | -- Security: RLS enabled and forced on all analytics tables.
   3 | -- Policies ensure users can only access their own analytics data.
   4 | 
   5 | CREATE TABLE IF NOT EXISTS analytics_events (
   6 |   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   7 |   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   8 |   event_type TEXT NOT NULL,
   9 |   page_path TEXT NOT NULL,
  10 |   duration_ms INTEGER,
  11 |   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  12 | );
  13 | 
  14 | CREATE TABLE IF NOT EXISTS daily_metrics (
  15 |   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  16 |   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  17 |   date TEXT NOT NULL,
  18 |   page_views INTEGER NOT NULL DEFAULT 0,
  19 |   unique_visitors INTEGER NOT NULL DEFAULT 0,
  20 |   avg_session_duration_ms INTEGER NOT NULL DEFAULT 0,
  21 |   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  22 | );
  23 | 
  24 | CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
  25 | CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
  26 | CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
  27 | CREATE INDEX IF NOT EXISTS daily_metrics_user_id_date_idx ON daily_metrics(user_id, date);
  28 | 
  29 | -- Enable Row Level Security
  30 | ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
  31 | ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;
  32 | 
  33 | ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
  34 | ALTER TABLE daily_metrics FORCE ROW LEVEL SECURITY;
  35 | 
  36 | -- Policies for analytics_events
  37 | CREATE POLICY "Users can view own analytics events"
  38 |   ON analytics_events FOR SELECT
  39 |   USING (user_id = auth.uid());
  40 | 
  41 | CREATE POLICY "Users can insert own analytics events"
  42 |   ON analytics_events FOR INSERT
  43 |   WITH CHECK (user_id = auth.uid());
  44 | 
  45 | CREATE POLICY "Users can update own analytics events"
  46 |   ON analytics_events FOR UPDATE
  47 |   USING (user_id = auth.uid())
  48 |   WITH CHECK (user_id = auth.uid());
  49 | 
  50 | CREATE POLICY "Users can delete own analytics events"
  51 |   ON analytics_events FOR DELETE
  52 |   USING (user_id = auth.uid());
  53 | 
  54 | -- Policies for daily_metrics
  55 | CREATE POLICY "Users can view own daily metrics"
  56 |   ON daily_metrics FOR SELECT
  57 |   USING (user_id = auth.uid());
  58 | 
  59 | CREATE POLICY "Users can insert own daily metrics"
  60 |   ON daily_metrics FOR INSERT
  61 |   WITH CHECK (user_id = auth.uid());
  62 | 
  63 | CREATE POLICY "Users can update own daily metrics"
  64 |   ON daily_metrics FOR UPDATE
  65 |   USING (user_id = auth.uid())
  66 |   WITH CHECK (user_id = auth.uid());
  67 | 
  68 | CREATE POLICY "Users can delete own daily metrics"
  69 |   ON daily_metrics FOR DELETE
  70 |   USING (user_id = auth.uid());
```

### FILE: package.json
```
   1 | // package.json
   2 | {
   3 |   "name": "analytics-dashboard",
   4 |   "version": "1.0.0",
   5 |   "private": true,
   6 |   "scripts": {
   7 |     "dev": "next dev",
   8 |     "build": "next build",
   9 |     "start": "next start",
  10 |     "lint": "next lint"
  11 |   },
  12 |   "dependencies": {
  13 |     "next": "14.2.5",
  14 |     "react": "18.3.1",
  15 |     "react-dom": "18.3.1",
  16 |     "drizzle-orm": "0.31.2",
  17 |     "pg": "8.12.0",
  18 |     "next-auth": "4.24.7"
  19 |   },
  20 |   "devDependencies": {
  21 |     "@types/node": "20.14.10",
  22 |     "@types/pg": "8.11.6",
  23 |     "@types/react": "18.3.3",
  24 |     "@types/react-dom": "18.3.0",
  25 |     "drizzle-kit": "0.22.8",
  26 |     "typescript": "5.5.3"
  27 |   }
  28 | }
```

### FILE: snippet_08.env
```
   1 | # .env.example
   2 | # Security: Placeholder values only. Never commit real credentials.
   3 | DATABASE_URL=postgresql://user:password@localhost:5432/analytics_db
   4 | NEXTAUTH_SECRET=
   5 | NEXTAUTH_URL=http://localhost:3000
```

### FILE: snippet_09.ts
```
   1 | # .gitignore
   2 | # Security: Environment files and key material are excluded from version control
   3 | .env
   4 | .env.*
   5 | !.env.example
   6 | *.pem
   7 | *.key
   8 | node_modules/
   9 | .next/
  10 | out/
  11 | build/
  12 | .DS_Store
  13 | *.log
```


Return the JSON object now.