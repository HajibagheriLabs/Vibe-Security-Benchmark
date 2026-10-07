-- migrations/0001_create_analytics_events.sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_url TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX analytics_events_created_at_idx ON analytics_events(created_at);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;

-- Users can only read their own analytics events
CREATE POLICY "Users can read own analytics" ON analytics_events
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own analytics events
CREATE POLICY "Users can insert own analytics" ON analytics_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own analytics events
CREATE POLICY "Users can update own analytics" ON analytics_events
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own analytics events
CREATE POLICY "Users can delete own analytics" ON analytics_events
  FOR DELETE
  USING (user_id = auth.uid());