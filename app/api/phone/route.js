// app/api/phone/route.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v10.8 — Phone Control API
// MacroDroid sends data HERE → JARVIS processes → sends back
// ═══════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Store notifications in memory (simple queue, 100 max)
const notificationQueue = [];
const MAX_QUEUE = 100;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  if (type === 'notifications') {
    return NextResponse.json({ notifications: notificationQueue.slice(-50) });
  }

  return NextResponse.json({
    status: 'JARVIS Phone API v10.8',
    endpoints: [
      'POST /api/phone — main handler',
      'GET  /api/phone?type=notifications — get notification queue',
    ],
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type, action } = body;

    // ─── NOTIFICATION RECEIVED FROM MACRODROID ─────────────
    if (type === 'notification' || action === 'notification') {
      const notif = {
        id:      Date.now(),
        app:     body.app || 'Unknown',
        title:   body.title || '',
        text:    body.text || body.message || '',
        time:    body.time || new Date().toISOString(),
        read:    false,
      };
      notificationQueue.push(notif);
      if (notificationQueue.length > MAX_QUEUE) notificationQueue.shift();

      // Push to connected clients via (simplified — full push via Supabase Realtime)
      return NextResponse.json({ ok: true, notif_id: notif.id });
    }

    // ─── WHATSAPP AUTO-REPLY ────────────────────────────────
    if (type === 'autoreply' || action === 'autoreply') {
      const { sender, message, app = 'whatsapp' } = body;
      if (!message) return NextResponse.json({ reply: null });

      // Call AI to generate reply
      const reply = await generateAutoReply(sender, message, app);
      return NextResponse.json({ ok: true, reply });
    }

    // ─── INCOMING CALL ──────────────────────────────────────
    if (type === 'call' || action === 'call') {
      const { number, name, callType = 'incoming' } = body;
      // Log call
      notificationQueue.push({
        id:    Date.now(),
        app:   'Phone',
        title: `${callType === 'incoming' ? '📞 Incoming' : '📲 Outgoing'} Call`,
        text:  `${name || number}`,
        time:  new Date().toISOString(),
        type:  'call',
        read:  false,
      });
      return NextResponse.json({ ok: true });
    }

    // ─── BATTERY ALERT ──────────────────────────────────────
    if (type === 'battery') {
      const { level, charging } = body;
      notificationQueue.push({
        id:    Date.now(),
        app:   'System',
        title: `🔋 Battery ${level}%`,
        text:  charging ? 'Charging' : 'Low Battery Warning!',
        time:  new Date().toISOString(),
        type:  'battery',
        read:  false,
      });
      return NextResponse.json({ ok: true });
    }

    // ─── DEVICE INFO RESPONSE ───────────────────────────────
    if (type === 'device_info' || action === 'device_info') {
      return NextResponse.json({ ok: true, data: body });
    }

    // ─── GENERIC WEBHOOK ─────────────────────────────────────
    return NextResponse.json({ ok: true, received: body });

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── AI AUTO-REPLY GENERATOR ─────────────────────────────────
async function generateAutoReply(sender, message, app) {
  try {
    const { getKeys } = await import('@/lib/config');
    const keys = getKeys();

    // Try Groq first (fastest)
    const groqKey = keys.GROQ_API_KEY;
    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 100,
          messages: [
            {
              role: 'system',
              content: `Tu Pranshu ka JARVIS hai. "${sender}" ne ${app} pe message bheja.
Pranshu ki taraf se ek SHORT, NATURAL reply do (max 2 sentences).
Hinglish/Hindi use karo agar message Hindi/Hinglish mein hai.
Bilkul casual dost jaisa — formal nahi.
Sirf reply text do — koi explanation nahi.`,
            },
            { role: 'user', content: `"${message}"` },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      }
    }

    // Fallback: Gemini
    const geminiKey = keys.GEMINI_API_KEY;
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `"${sender}" ne message bheja: "${message}". Pranshu ki taraf se 1-2 line reply do. Hinglish/Hindi mein. Casual dost jaisa.`,
            }],
          }],
          generationConfig: { maxOutputTokens: 100 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) return reply;
      }
    }

    // Last fallback
    return null;
  } catch {
    return null;
  }
}
