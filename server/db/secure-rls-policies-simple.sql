-- Secure RLS policies for the chatbot database.
-- This version avoids SQL function blocks, so it is easier to paste into Supabase SQL Editor.

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timed_responses_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE timed_responses ENABLE ROW LEVEL SECURITY;

ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE pending_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE learned_responses FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE timed_responses_config FORCE ROW LEVEL SECURITY;
ALTER TABLE timed_responses FORCE ROW LEVEL SECURITY;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_user_id);

DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "Allow all on pending_questions" ON pending_questions;
DROP POLICY IF EXISTS "Allow all on learned_responses" ON learned_responses;
DROP POLICY IF EXISTS "Allow all on scheduled_messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Allow all on timed_responses_config" ON timed_responses_config;
DROP POLICY IF EXISTS "Allow all on timed_responses" ON timed_responses;

DROP POLICY IF EXISTS "Admins can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Visitors can create sessions" ON sessions;
DROP POLICY IF EXISTS "Visitors can read own sessions" ON sessions;
DROP POLICY IF EXISTS "Visitors can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can manage messages" ON messages;
DROP POLICY IF EXISTS "Visitors can read own messages" ON messages;
DROP POLICY IF EXISTS "Visitors can create user messages" ON messages;
DROP POLICY IF EXISTS "Visitors can create bot messages" ON messages;
DROP POLICY IF EXISTS "Admins can manage pending questions" ON pending_questions;
DROP POLICY IF EXISTS "Visitors can create pending questions" ON pending_questions;
DROP POLICY IF EXISTS "Admins can manage learned responses" ON learned_responses;
DROP POLICY IF EXISTS "Visitors can read learned responses" ON learned_responses;
DROP POLICY IF EXISTS "Admins can manage scheduled messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Visitors can read enabled scheduled messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Admins can manage timed responses config" ON timed_responses_config;
DROP POLICY IF EXISTS "Visitors can read timed responses config" ON timed_responses_config;
DROP POLICY IF EXISTS "Admins can manage timed responses" ON timed_responses;
DROP POLICY IF EXISTS "Visitors can read timed responses" ON timed_responses;

CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage messages" ON messages
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage pending questions" ON pending_questions
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage learned responses" ON learned_responses
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage scheduled messages" ON scheduled_messages
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage timed responses config" ON timed_responses_config
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage timed responses" ON timed_responses
  FOR ALL
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Visitors can create sessions" ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id IS NOT NULL
    AND owner_user_id = auth.uid()
    AND COALESCE(status, 'active') = 'active'
    AND COALESCE(control_mode, 'auto') = 'auto'
    AND COALESCE(pinned, FALSE) = FALSE
    AND COALESCE(needs_attention, FALSE) = FALSE
  );

CREATE POLICY "Visitors can read own sessions" ON sessions
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Visitors can update own sessions" ON sessions
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Visitors can read own messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM sessions
      WHERE sessions.id = messages.session_id
        AND sessions.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Visitors can create user messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'user'
    AND EXISTS (
      SELECT 1
      FROM sessions
      WHERE sessions.id = messages.session_id
        AND sessions.owner_user_id = auth.uid()
    )
    AND COALESCE(from_admin, FALSE) = FALSE
    AND COALESCE(auto_reply, FALSE) = FALSE
    AND COALESCE(learned, FALSE) = FALSE
    AND COALESCE(scheduled, FALSE) = FALSE
    AND length(message) BETWEEN 1 AND 1000
  );

CREATE POLICY "Visitors can create bot messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'bot'
    AND EXISTS (
      SELECT 1
      FROM sessions
      WHERE sessions.id = messages.session_id
        AND sessions.owner_user_id = auth.uid()
    )
    AND COALESCE(from_admin, FALSE) = FALSE
    AND length(message) BETWEEN 1 AND 1000
  );

CREATE POLICY "Visitors can create pending questions" ON pending_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM sessions
      WHERE sessions.id = pending_questions.session_id
        AND sessions.owner_user_id = auth.uid()
    )
    AND
    COALESCE(status, 'pending') = 'pending'
    AND length(question) BETWEEN 1 AND 1000
  );

CREATE POLICY "Visitors can read learned responses" ON learned_responses
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Visitors can read enabled scheduled messages" ON scheduled_messages
  FOR SELECT
  TO anon, authenticated
  USING (enabled = TRUE);

CREATE POLICY "Visitors can read timed responses config" ON timed_responses_config
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Visitors can read timed responses" ON timed_responses
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
