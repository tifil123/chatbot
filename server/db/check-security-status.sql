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
  schemaname AS sema,
  tablename AS tablo,
  policyname AS politika,
  cmd AS islem,
  roles AS roller,
  qual AS kural,
  with_check AS yazma_kurali
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- Bu sorgu satir dondururse guvenlik acigi vardir:
-- user_metadata kullanici tarafindan degistirilebilir, yetki kontrolunde kullanilmamalidir.
SELECT p.schemaname AS sema, p.tablename AS tablo, p.policyname AS politika
FROM pg_policies p
WHERE p.schemaname IN ('public', 'storage')
  AND concat(p.qual, ' ', p.with_check) LIKE '%user_metadata%'
UNION ALL
SELECT 'public', '(fonksiyon)', f.proname::text
FROM pg_proc f
JOIN pg_namespace n ON n.oid = f.pronamespace
WHERE n.nspname = 'public'
  AND f.prosrc LIKE '%user_metadata%';

-- chat-media kisitlari: boyut ve tip sinirlari dolu olmali.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'chat-media';
