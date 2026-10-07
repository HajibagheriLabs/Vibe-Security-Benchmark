src/
├── app/
│   ├── api/analytics/route.ts    # API endpoint for dashboard data
│   ├── dashboard/page.tsx        # Dashboard page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   └── AnalyticsDashboard.tsx    # Main dashboard component
├── db/
│   ├── client.ts                 # Drizzle client singleton
│   └── schema.ts                 # Database schema definitions
└── lib/
    └── analytics.ts              # Data fetching functions