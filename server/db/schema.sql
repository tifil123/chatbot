-- =============================================
-- Chatbot Supabase Veritabanı Şeması
-- Firebase'den Supabase'e migration için
-- =============================================

-- Sessions tablosu (Firebase: sessions/{id}/info + control)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  custom_name TEXT DEFAULT 'isimsiz',
  phone_number TEXT,
  start_time BIGINT,
  last_active BIGINT,
  user_agent TEXT,
  status TEXT DEFAULT 'active',
  pinned BOOLEAN DEFAULT FALSE,
  needs_attention BOOLEAN DEFAULT FALSE,
  has_pending_question BOOLEAN DEFAULT FALSE,
  last_read_timestamp BIGINT DEFAULT 0,
  last_message TEXT,
  control_mode TEXT DEFAULT 'auto',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages tablosu (Firebase: sessions/{id}/messages)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  "timestamp" BIGINT NOT NULL,
  seen BOOLEAN DEFAULT FALSE,
  from_admin BOOLEAN DEFAULT FALSE,
  auto_reply BOOLEAN DEFAULT FALSE,
  learned BOOLEAN DEFAULT FALSE,
  scheduled BOOLEAN DEFAULT FALSE,
  reply_to JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending Questions tablosu (Firebase: pending_questions)
CREATE TABLE IF NOT EXISTS pending_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  conversation_history TEXT,
  "timestamp" BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learned Responses tablosu (Firebase: learned_responses)
CREATE TABLE IF NOT EXISTS learned_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  context_tags JSONB,
  "timestamp" BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Messages tablosu (Firebase: scheduled_messages)
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  message TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timed Responses Config tablosu (tek satırlık ayar)
CREATE TABLE IF NOT EXISTS timed_responses_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN DEFAULT FALSE,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO timed_responses_config (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Timed Responses tablosu (zamanlı soru-yanıt çiftleri)
CREATE TABLE IF NOT EXISTS timed_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages("timestamp");
CREATE INDEX IF NOT EXISTS idx_pending_session ON pending_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_questions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_user_id);

-- Real-time aboneliklerini etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE learned_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE timed_responses_config;
ALTER PUBLICATION supabase_realtime ADD TABLE timed_responses;

-- RLS (Row Level Security) - Şimdilik açık erişim
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timed_responses_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE timed_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "Allow all on pending_questions" ON pending_questions;
DROP POLICY IF EXISTS "Allow all on learned_responses" ON learned_responses;
DROP POLICY IF EXISTS "Allow all on scheduled_messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Allow all on timed_responses_config" ON timed_responses_config;
DROP POLICY IF EXISTS "Allow all on timed_responses" ON timed_responses;

-- =============================================
-- Secure RLS override
-- =============================================
-- Guvenlik modeli:
-- 1. Admin islemleri sadece Supabase Auth tokeninda role=admin olan kullanicilara aciktir.
-- 2. Ziyaretciler sadece sohbet baslatmak ve mesaj eklemek icin gereken dar izinlere sahiptir.
-- 3. Yonetim tablolari anonim kullanicilara yazma/silme icin kapatilmistir.

ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE pending_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE learned_responses FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE timed_responses_config FORCE ROW LEVEL SECURITY;
ALTER TABLE timed_responses FORCE ROW LEVEL SECURITY;

-- Tekrar calistirmayi kolaylastirmak icin yeni politikalari da once temizle.
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

-- Supabase Auth JWT icinde app_metadata.role veya user_metadata.role "admin" ise admin kabul edilir.
CREATE OR REPLACE FUNCTION public.is_chatbot_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ) = 'admin';
$$;

-- Admin: tum tablolarda tam yetki.
CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

CREATE POLICY "Admins can manage messages" ON messages
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

CREATE POLICY "Admins can manage pending questions" ON pending_questions
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

CREATE POLICY "Admins can manage learned responses" ON learned_responses
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

CREATE POLICY "Admins can manage scheduled messages" ON scheduled_messages
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

CREATE POLICY "Admins can manage timed responses config" ON timed_responses_config
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

CREATE POLICY "Admins can manage timed responses" ON timed_responses
  FOR ALL
  TO authenticated
  USING (public.is_chatbot_admin())
  WITH CHECK (public.is_chatbot_admin());

-- Ziyaretci/widget: yeni sohbet baslatabilir.
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

-- Ziyaretci/widget: kullanici mesaji ekleyebilir, admin gibi davranamaz.
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

-- Mevcut mimaride bot cevabi tarayicida uretiliyor. Daha guvenli nihai cozum,
-- bot cevabini Edge Function/backend uzerinden service role ile yazmaktir.
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

-- Ziyaretci/widget: botun cevaplayamadigi soruyu kuyruga ekleyebilir.
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

-- Ziyaretci/widget: chatbot cevabi uretebilmek icin yalnizca okuma yapar.
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

