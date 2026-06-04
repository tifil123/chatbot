-- Adds per-visitor ownership for widget sessions.
-- Run this after the first RLS policy setup.
-- Supabase Auth > Providers > Anonymous sign-ins must be enabled for the widget.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_user_id);

DROP POLICY IF EXISTS "Visitors can create sessions" ON sessions;
DROP POLICY IF EXISTS "Visitors can read own sessions" ON sessions;
DROP POLICY IF EXISTS "Visitors can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Visitors can read own messages" ON messages;
DROP POLICY IF EXISTS "Visitors can create user messages" ON messages;
DROP POLICY IF EXISTS "Visitors can create bot messages" ON messages;
DROP POLICY IF EXISTS "Visitors can create pending questions" ON pending_questions;

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
    AND COALESCE(status, 'pending') = 'pending'
    AND length(question) BETWEEN 1 AND 1000
  );
