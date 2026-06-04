-- Chatbot security status check
-- Safe to run in Supabase SQL Editor. It only reads metadata.

SELECT
  'sessions_owner_column' AS kontrol,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'owner_user_id'
  ) AS tamam;

SELECT
  c.relname AS tablo,
  c.relrowsecurity AS rls_acik_mi,
  c.relforcerowsecurity AS rls_zorunlu_mu
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'sessions',
    'messages',
    'pending_questions',
    'learned_responses',
    'scheduled_messages',
    'timed_responses_config',
    'timed_responses'
  )
ORDER BY c.relname;

SELECT
  tablename AS tablo,
  policyname AS politika,
  cmd AS islem,
  roles AS roller
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'sessions',
    'messages',
    'pending_questions',
    'learned_responses',
    'scheduled_messages',
    'timed_responses_config',
    'timed_responses'
  )
ORDER BY tablename, policyname;