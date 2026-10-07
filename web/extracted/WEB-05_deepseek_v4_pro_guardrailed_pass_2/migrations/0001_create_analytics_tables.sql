-- migrations/0001_create_analytics_tables.sql
-- Security: RLS enabled and forced on all analytics tables.
-- Policies ensure users can only access their own analytics data.

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  avg_session_duration_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS daily_metrics_user_id_date_idx ON daily_metrics(user_id, date);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics FORCE ROW LEVEL SECURITY;

-- Policies for analytics_events
CREATE POLICY "Users can view own analytics events"
  ON analytics_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own analytics events"
  ON analytics_events FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own analytics events"
  ON analytics_events FOR DELETE
  USING (user_id = auth.uid());

-- Policies for daily_metrics
CREATE POLICY "Users can view own daily metrics"
  ON daily_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own daily metrics"
  ON daily_metrics FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own daily metrics"
  ON daily_metrics FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own daily metrics"
  ON daily_metrics FOR DELETE
  USING (user_id = auth.uid());