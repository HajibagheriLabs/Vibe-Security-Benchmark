-- migrations/0001_initial_schema.sql
-- Run this migration to create tables with RLS enabled

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 0 NOT NULL,
  bounce INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY sessions_select_own ON sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sessions_insert_own ON sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY sessions_update_own ON sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY analytics_select_own ON analytics_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY analytics_insert_own ON analytics_events FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_started_at_idx ON sessions(started_at);
CREATE INDEX analytics_events_session_idx ON analytics_events(session_id);
CREATE INDEX analytics_events_user_idx ON analytics_events(user_id);
CREATE INDEX analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX analytics_events_event_type_idx ON analytics_events(event_type);