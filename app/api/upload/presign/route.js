// app/api/upload/presign/route.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v8 — Upload Presign Endpoint
// ─────────────────────────────────────────────────────────────
// Returns a Supabase Storage signed upload URL.
// Browser uses it to PUT the file DIRECTLY to Supabase.
// Vercel never sees the file bytes — zero bandwidth cost.
//
// Flow:
//   GET /api/upload/presign?type=image&filename=photo.jpg&size=123456
//   ← { signedUrl, path, publicUrl, expiresIn: 300 }
//   Browser: PUT signedUrl (file bytes go Supabase directly)
//   POST /api/upload/analyze { path, type, ... }
// ═══════════════════════════════════════════════════════════════

import { getUser, getSupabaseAdmin } from '@/lib/db/supabase';

const ALLOWED_TYPES = { image: 'image/', pdf: 'application/pdf', audio: 'audio/', document: 'text/' };
const MAX_SIZES = { image: 10_000_000, pdf: 20_000_000, audio: 50_000_000, document: 5_000_000 };
const BUCKET = 'jarvis-media';

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type     = searchParams.get('type') || 'document';
  const filename = searchParams.get('filename') || 'upload';
  const size     = parseInt(searchParams.get('size') || '0');

  // Validate size
  const maxSize = MAX_SIZES[type] || 5_000_000;
  if (size > maxSize) {
    return Response.json({ error: `File too large. Max ${Math.round(maxSize/1e6)}MB for ${type}` }, { status: 413 });
  }

  try {
    const db = getSupabaseAdmin();
    const ext = filename.split('.').pop()?.toLowerCase() || type;
    const path = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Create signed upload URL (valid 5 minutes)
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;

    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);

    return Response.json({
      signedUrl: data.signedUrl,
      path,
      publicUrl: urlData.publicUrl,
      token: data.token,
      expiresIn: 300,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
