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

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages("timestamp");
CREATE INDEX IF NOT EXISTS idx_pending_session ON pending_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_questions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone_number);

-- Real-time aboneliklerini etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE learned_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_messages;

-- RLS (Row Level Security) - Şimdilik açık erişim
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pending_questions" ON pending_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on learned_responses" ON learned_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on scheduled_messages" ON scheduled_messages FOR ALL USING (true) WITH CHECK (true);
