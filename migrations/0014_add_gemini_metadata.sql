-- Migration: Track Gemini File API upload metadata
--
-- Gemini's File API expires uploaded files after ~48 hours. Storing the URI
-- without a timestamp means stale URIs eventually return 404 and the AI chat
-- silently breaks for products with datasheets. We also need the original
-- mime_type so we don't hardcode application/pdf for image datasheets.

ALTER TABLE catalog_items ADD COLUMN gemini_uploaded_at TIMESTAMP;
ALTER TABLE catalog_items ADD COLUMN gemini_mime_type TEXT;

-- Backfill: any existing gemini_file_uri rows get a NULL uploaded_at,
-- which our refresh logic treats as "expired, re-upload on next use".
