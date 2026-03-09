-- JARVIS v8 — Media Storage Migration
-- Run this in Supabase SQL Editor ONCE
-- Creates: jarvis-media storage bucket + RLS policies

-- ─── CREATE STORAGE BUCKET ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jarvis-media',
  'jarvis-media',
  true,                    -- public CDN — files accessible via URL
  52428800,               -- 50MB per file max
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg',
    'video/mp4', 'video/webm',
    'application/pdf',
    'text/plain', 'application/octet-stream'
  ]
) ON CONFLICT (id) DO NOTHING;

-- ─── RLS POLICIES ──────────────────────────────────────────────

-- Users can upload to their own folder (uploads/{user_id}/...)
CREATE POLICY "Users can upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'jarvis-media' AND
  (storage.foldername(name))[1] = 'uploads' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can read their own uploads
CREATE POLICY "Users can read own uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'jarvis-media' AND
  (storage.foldername(name))[1] = 'uploads' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Public CDN read for all (images served without auth)
CREATE POLICY "Public CDN read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'jarvis-media');

-- Service role can read/write everything (for generated images from Gemini etc.)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'jarvis-media');

-- Users can delete their own files
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'jarvis-media' AND
  (storage.foldername(name))[1] = 'uploads' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ─── COMMENT ─────────────────────────────────────────────────────
-- After running:
-- 1. Storage tab → jarvis-media bucket should appear as "Public"
-- 2. Test: upload a small image, check public URL works
-- 3. Your .env.local: SUPABASE_SERVICE_ROLE_KEY must be set (for presign API)
