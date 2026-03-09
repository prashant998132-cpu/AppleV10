// app/api/chat/route.js
import { getUser } from '@/lib/db/supabase';
import { getProfile, buildMemoryContext, saveMemory, createConversation, saveMessage, updateConversation } from '@/lib/db/queries';
import { jarvisThink, buildSystemPrompt } from '@/lib/ai/brain';
import { callLLMChain } from '@/lib/ai/router';
import { getKeys, APP } from '@/lib/config';

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, history = [], conversationId: convIdInput, imageBase64, mode = 'auto' } = await req.json();
  if (!message?.trim() && !imageBase64) return Response.json({ error: 'Empty message' }, { status: 400 });

  const keys  = getKeys();
  const start = Date.now();

  // Profile from DB — not hardcoded
  const dbProfile = await getProfile(user.id).catch(() => null);
  const profile = {
    name:        dbProfile?.name        || user.email?.split('@')[0] || APP.defaultName,
    city:        dbProfile?.city        || APP.defaultCity,
    personality: dbProfile?.personality || 'normal',
    language:    dbProfile?.language    || 'hinglish',
  };

  // Conversation setup
  let convId = convIdInput;
  if (!convId) {
    const conv = await createConversation(user.id, message.slice(0, 60)).catch(() => null);
    convId = conv?.id;
  }
  if (convId) await saveMessage(user.id, convId, { role: 'user', content: message, metadata: { mode } }).catch(() => {});

  try {
    const memCtx = await buildMemoryContext(user.id).catch(() => '');
    let reply, thinking = null, modelUsed = '', agentsUsed = [], imageUrl, imageSource, intent, timing;

    if (mode === 'flash') {
      const result = await callLLMChain([...history.slice(-8), { role:'user', content:message }], buildSystemPrompt(profile, memCtx, profile.personality), keys, 'flash');
      reply = result.text; modelUsed = result.modelUsed; timing = Date.now() - start;

    } else if (mode === 'think') {
      const result = await callLLMChain([...history.slice(-8), { role:'user', content:message }], buildSystemPrompt(profile, memCtx, profile.personality), keys, 'think');
      reply = result.text; thinking = result.thinking; modelUsed = result.modelUsed; timing = Date.now() - start;

    } else {
      const result = await jarvisThink(message, history, profile, memCtx, keys, imageBase64);
      reply = result.reply; thinking = result.thinking; imageUrl = result.imageUrl;
      imageSource = result.toolData?.generatedImage?.provider;
      agentsUsed = result.agentsUsed || []; modelUsed = result.modelUsed || 'Gemini Flash';
      intent = result.intent; timing = result.timing;
      if (result.memoriesToSave?.length > 0) {
        await Promise.allSettled(result.memoriesToSave.map(m => saveMemory(user.id, { value: m.value, category: 'general', key: m.key, importance: 6 })));
      }
    }

    if (convId && reply) {
      await saveMessage(user.id, convId, { role: 'assistant', content: reply, metadata: { modelUsed, mode } }).catch(() => {});
      await updateConversation(user.id, convId, { updated_at: new Date().toISOString() }).catch(() => {});
    }

    return Response.json({ reply, thinking, imageUrl, imageSource, agentsUsed, modelUsed, intent, timing, conversationId: convId });

  } catch (e) {
    console.error('[chat]', e.message);
    try {
      const r = await callLLMChain([...history.slice(-4), { role:'user', content:message }], 'You are JARVIS, helpful Hinglish AI.', keys, 'flash');
      return Response.json({ reply: r.text, modelUsed: r.modelUsed, agentsUsed: ['fallback'], conversationId: convId, timing: Date.now()-start });
    } catch {
      return Response.json({ reply: 'Network issue — thodi der baad try karo! 🔧', agentsUsed: [], conversationId: convId, timing: Date.now()-start });
    }
  }
}
