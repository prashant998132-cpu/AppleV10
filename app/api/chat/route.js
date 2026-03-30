// app/api/chat/route.js — Non-streaming fallback (upgraded to smart-router v10.1)
import { getProfile, buildMemoryContext, saveMemory, createConversation, saveMessage, updateConversation } from '@/lib/db/queries';
import { jarvisThink, buildSystemPrompt } from '@/lib/ai/brain';
import { getKeys, APP } from '@/lib/config';
import { getProviderOrder, callProvider, PROVIDERS } from '@/lib/ai/smart-router';

export async function POST(req) {
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };

  const { message, history = [], conversationId: convIdInput, imageBase64, mode = 'auto' } = await req.json();
  if (!message?.trim() && !imageBase64) return Response.json({ error: 'Empty message' }, { status: 400 });

  const keys  = getKeys();
  const start = Date.now();

  const dbProfile = await getProfile(user.id).catch(() => null);
  const profile = {
    name:        dbProfile?.name        || user.email?.split('@')[0] || APP.defaultName,
    city:        dbProfile?.city        || APP.defaultCity,
    personality: dbProfile?.personality || 'normal',
    language:    dbProfile?.language    || 'auto',
  };

  let convId = convIdInput;
  if (!convId) {
    const conv = await createConversation(user.id, message.slice(0, 60)).catch(() => null);
    convId = conv?.id;
  }
  if (convId) await saveMessage(user.id, convId, { role: 'user', content: message, metadata: { mode } }).catch(() => {});

  try {
    const memCtx = await buildMemoryContext(user.id).catch(() => '');
    const system  = buildSystemPrompt(profile, memCtx, profile.personality);
    const msgs    = [...history.slice(-8).map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }];

    let reply = '', thinking = null, modelUsed = '', agentsUsed = [], imageUrl, timing;

    if (mode === 'auto' || mode === 'deep') {
      // Use jarvisThink for full agent pipeline (weather, crypto, etc.)
      const result = await jarvisThink(message, history, profile, memCtx, keys, imageBase64);
      reply = result.reply; thinking = result.thinking; imageUrl = result.imageUrl;
      agentsUsed = result.agentsUsed || []; modelUsed = result.modelUsed || 'Kimi K2';
      timing = result.timing;
      if (result.memoriesToSave?.length > 0) {
        await Promise.allSettled(result.memoriesToSave.map(m =>
          saveMemory(user.id, { value: m.value, category: 'general', key: m.key, importance: 6 })
        ));
      }
    } else {
      // Flash / Think — use smart-router directly
      const providerOrder = getProviderOrder(mode, message, history, keys);
      const errors = [];
      for (const pid of providerOrder) {
        try {
          const result = await callProvider(pid, msgs, system, keys, {
            maxTokens: 1400,
            temperature: mode === 'think' ? 0.7 : 0.85,
          });
          if (result.text?.trim()) {
            reply = result.text;
            modelUsed = result.provider;
            // Extract DeepSeek thinking if present
            const thinkMatch = reply.match(/<think>([\s\S]*?)<\/think>/i);
            if (thinkMatch) { thinking = thinkMatch[1].trim(); reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(); }
            break;
          }
        } catch (e) { errors.push(e.message); }
      }
      if (!reply) throw new Error(`All providers failed: ${errors.slice(0,2).join(' | ')}`);
      timing = Date.now() - start;
    }

    if (convId && reply) {
      await saveMessage(user.id, convId, { role: 'assistant', content: reply, metadata: { modelUsed, mode } }).catch(() => {});
      await updateConversation(user.id, convId, { updated_at: new Date().toISOString() }).catch(() => {});
    }

    return Response.json({ reply, thinking, imageUrl, agentsUsed, modelUsed, timing, conversationId: convId });

  } catch (e) {
    console.error('[chat]', e.message);
    // Last resort fallback
    try {
      const provs = getProviderOrder('flash', message, [], keys);
      const system2 = buildSystemPrompt(profile, '', 'normal');
      for (const pid of provs.slice(0, 3)) {
        try {
          const r = await callProvider(pid, [{ role: 'user', content: message }], system2, keys, { maxTokens: 800 });
          if (r.text) return Response.json({ reply: r.text, modelUsed: r.provider, agentsUsed: ['fallback'], conversationId: convId, timing: Date.now()-start });
        } catch {}
      }
    } catch {}
    return Response.json({ reply: 'Network issue — thodi der baad try karo! 🔧', agentsUsed: [], conversationId: convId, timing: Date.now()-start });
  }
}
