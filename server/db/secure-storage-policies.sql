-- Locks down the chat-media bucket. Safe to run more than once.
-- Uploads need a Supabase session (the widget's anonymous sign-in counts), and
-- the bucket itself enforces the type and size limits the browser only asks for.

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm'
    ]
WHERE id = 'chat-media';

DROP POLICY IF EXISTS "Anon upload chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in upload chat-media" ON storage.objects;

CREATE POLICY "Signed-in upload chat-media" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = 'chat'
  );
