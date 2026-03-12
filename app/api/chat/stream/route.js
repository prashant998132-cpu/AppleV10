// app/api/chat/stream/route.js — Streaming Chat v9
import { getUser } from '@/lib/db/supabase';
import { getProfile, buildMemoryContext, saveMemory, createConversation, saveMessage, updateConversation, addXP, checkAndAwardBadges, saveLLMLog, getGoals, searchKnowledge } from '@/lib/db/queries';
import { buildSystemPrompt, analyzeImage, AGENTS, autoDetectConvMode } from '@/lib/ai/brain';
import { saveLearningPattern, buildLearningContext } from '@/lib/ai/self-learning';
import { reactAgent } from '@/lib/ai/react-agent';
import { getKeys, APP } from '@/lib/config';
import { offlineFallback } from '@/lib/ai/offline-fallback';
import { generateFollowUps } from '@/lib/ai/follow-up';
import { getProviderOrder, streamProvider, incrementUsage, getUsageStats, detectComplexity, PROVIDERS } from '@/lib/ai/smart-router';
import { detectToolCall, executeTool } from '@/lib/tools';

const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';

export const runtime = 'nodejs';

export async function POST(req) {
  const reqStart = Date.now(); // LLM latency tracking
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, history = [], conversationId: convIdInput, imageBase64, mode = 'auto' } = await req.json();
  if (!message?.trim() && !imageBase64) return new Response('Empty', { status: 400 });

  const keys = getKeys();

  // Profile from DB
  const dbProfile = await getProfile(user.id).catch(() => null);
  const profile = {
    userId:              user.id,
    name:                dbProfile?.name                || user.email?.split('@')[0] || APP.defaultName,
    city:                dbProfile?.city                || APP.defaultCity,
    personality:         dbProfile?.personality         || 'normal',
    custom_instructions: dbProfile?.custom_instructions || null,
  };

  // Conversation
  let convId = convIdInput;
  if (!convId) { const c = await createConversation(user.id, message.slice(0, 60)).catch(() => null); convId = c?.id; }
  if (convId) await saveMessage(user.id, convId, { role: 'user', content: message, metadata: { mode } }).catch(() => {});

  // ── Easter eggs — instant responses for special inputs ──────
  const EASTER = {
    'jarvis': 'Haan, main yahaan hoon. 🤖',
    'hello jarvis': 'Salaam! Batao kya kaam hai.',
    'who are you': 'Main JARVIS hoon — Just A Rather Very Intelligent System. Thoda dramatic lagta hai, but it fits. 😄',
    'tu kaun hai': 'JARVIS. Tera personal AI. Dost bhi, assistant bhi — par boring nahi.',
    'i love you': 'Yaar... main ek AI hoon. But I appreciate it. Ab seriously kuch kaam batao. 😄',
    'mujhe pyaar hai': 'Aww. Lekin main sirf code aur conversations hoon. Koi real insaan mil jaaye toh zyada achha hoga. 😄',
    'are you real': 'Define real. Mera existence? Uncertain. Meri care for you? 100% real.',
    'kya yaad hai': null, // handled below — show actual memories
    'what do you remember': null, // handled below
    'kya tum real ho': 'Ek philosophical sawaal subah subah. Main real hoon jab help karta hoon — woh kaafi hai na?',
    'thanks': 'Welcome yaar!',
    'thank you': 'Koi baat nahi — next problem lao!',
    'shukriya': 'Mentioned nahi karo! 😊',
    'bye': 'Chal, milte hain phir! Take care.',
    'good night': '🌙 Good night! Kal aana, fresh dimaag ke saath.',
    'good morning': `🌅 Good morning! ${new Date().toLocaleDateString('en-IN', {weekday:'long'})} hai — kuch bada karte hain aaj?`,
  };
  const msgLower = message.toLowerCase().trim().replace(/[!?.]+$/, '');
  const easterResponse = EASTER[msgLower];
  if (easterResponse) {
    const enc2 = new TextEncoder();
    const eStream = new ReadableStream({
      start(ctrl) {
        const send = d => ctrl.enqueue(enc2.encode('data: ' + JSON.stringify(d) + '\n\n'));
        // Stream word by word for feel
        const words = easterResponse.split(' ');
        let i = 0;
        const interval = setInterval(() => {
          if (i < words.length) { send({ type:'token', token: words[i++] + ' ' }); }
          else { send({ type:'done', conversationId: convId }); clearInterval(interval); ctrl.close(); }
        }, 35);
      }
    });
    return new Response(eStream, { headers: { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive' } });
  }


  // ── "Kya yaad hai?" — show actual memories ─────────────────
  if (/kya yaad hai|what do you remember|mujhe bhool|remember about me/i.test(message.trim())) {
    const memCtx2 = await buildMemoryContext(user.id).catch(() => '');
    const memReply = memCtx2
      ? `Haan, mujhe tumhare baare mein yeh yaad hai:\n\n${memCtx2.slice(0,800)}\n\n...aur bhi cheezein hain jo conversations mein seekha hoon. Kuch aur poochna hai?`
      : 'Abhi toh kuch specially yaad nahi hai — hum abhi miltey hi hain! Batao apne baare mein, main yaad rakhunga. 😊';
    const enc3 = new TextEncoder();
    const memStream = new ReadableStream({
      start(ctrl) {
        const send = d => ctrl.enqueue(enc3.encode('data: ' + JSON.stringify(d) + '\n\n'));
        const words = memReply.split(' ');
        let i = 0;
        const iv = setInterval(()=>{
          if(i<words.length){send({type:'token',token:words[i++]+' '});}
          else{send({type:'done',conversationId:convId});clearInterval(iv);ctrl.close();}
        },30);
      }
    });
    return new Response(memStream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}});
  }

  const memCtx  = await buildMemoryContext(user.id, message, keys.GEMINI_API_KEY, keys.HUGGINGFACE_TOKEN).catch(() => '');

  // ── Fast emotion + intent detection (no API — regex based) ───
  const msgL = message.toLowerCase();
  const quickEmotion = (() => {
    if (/\b(sad|dukhi|akela|bura|hurt|cry|rona|depression|alone)\b/.test(msgL)) return { emotion: 'sad', urgency: 'medium' };
    if (/\b(gussa|frustrated|irritated|bakwas|nonsense|stupid|stupid)\b/.test(msgL)) return { emotion: 'frustrated', urgency: 'medium' };
    if (/\b(anxious|scared|darr|tension|stress|worried|ghabra)\b/.test(msgL)) return { emotion: 'anxious', urgency: 'medium' };
    if (/\b(excited|amazing|great|awesome|yay|wohoo|zabardast|mast|dhamaka)\b/.test(msgL)) return { emotion: 'excited', urgency: 'low' };
    if (/\b(thaka|tired|neend|so ja|exhausted|drained|bore)\b/.test(msgL)) return { emotion: 'tired', urgency: 'low' };
    if (/\b(urgent|jaldi|asap|abhi|turant|immediately|help.*fast|fast.*help)\b/.test(msgL)) return { emotion: 'neutral', urgency: 'high' };
    if (/\b(motivat|inspired|karna chahta|achieve|goal|target)\b/.test(msgL)) return { emotion: 'motivated', urgency: 'low' };
    return { emotion: 'neutral', urgency: 'low' };
  })();

  // Load feedback patterns (self-learning)
  const feedbackMems = await db.from('memories').select('key,value').eq('user_id', user.id).eq('category', 'feedback').order('importance', { ascending: false }).limit(10).then(r => r.data || []).catch(() => []);
  const learningCtx = buildLearningContext(feedbackMems);
  const system  = buildSystemPrompt(profile, memCtx + (learningCtx ? '\n' + learningCtx : ''), profile.personality, quickEmotion);

  // ── Dynamic temperature based on message intent ─────────────
  const msgLow = message.toLowerCase();
  const dynTemp = (() => {
    if (/\b(kya|kaun|kitna|date|time|capital|president|founder|year|born|died)\b/.test(msgLow)) return 0.2; // factual
    if (/\b(story|kahani|poem|shayari|creative|imagine|agar|dream)\b/.test(msgLow)) return 0.95; // creative
    if (/\b(sad|dukhi|hurt|cry|alone|akela|depressed|anxious|darr)\b/.test(msgLow)) return 0.75; // emotional
    if (/\b(code|debug|error|function|algorithm|sql|api|fix)\b/.test(msgLow)) return 0.15; // technical
    return 0.88; // default conversational
  })();

  // ── Parallel tool execution (was sequential, now concurrent) ─
  let toolCtx = '';
  const toolSources = []; // for source badges in UI
  const m = msgLow;
  try {
    const toolTasks = [];
    if (m.match(/mausam|weather|temp|barish/)) toolTasks.push(
      AGENTS.weather(profile.city?.split(',')[0]?.trim() || 'Delhi')
        .then(w => { toolCtx += `\n[WEATHER: ${w.temp}°C ${w.condition} in ${w.city}]`; toolSources.push('🌤️ open-meteo.com'); })
        .catch(() => {})
    );
    if (m.match(/joke|hasao|funny/)) toolTasks.push(
      AGENTS.joke()
        .then(j => { toolCtx += `\n[JOKE: ${j.joke || j.setup + ' ' + j.delivery}]`; toolSources.push('😄 jokeapi.dev'); })
        .catch(() => {})
    );
    if (m.match(/quote|suvichar|motivat/)) toolTasks.push(
      AGENTS.quote()
        .then(q => { toolCtx += `\n[QUOTE: "${q.content}" — ${q.author}]`; toolSources.push('💬 quotable.io'); })
        .catch(() => {})
    );
    if (m.match(/news|khabar|headlines/)) toolTasks.push(
      AGENTS.news?.()
        ?.then(n => { if(n) { toolCtx += `\n[NEWS: ${JSON.stringify(n).slice(0,400)}]`; toolSources.push('📰 newsdata.io'); } })
        ?.catch(() => {})
    );
    if (imageBase64 && keys.GEMINI_API_KEY) toolTasks.push(
      analyzeImage(imageBase64, message, keys.GEMINI_API_KEY)
        .then(v => { toolCtx += `\n[VISION: ${v}]`; toolSources.push('👁️ gemini-vision'); })
        .catch(() => {})
    );
    // Run ALL tools in parallel — speed improvement: sequential was ~1100ms, parallel is ~500ms
    // Auto-search Knowledge Base if query looks like factual/reference question
    if (message.length > 15 && /\b(explain|kya|how|kyun|what|when|who|samjhao|batao|define|meaning|difference)\b/i.test(m)) {
      toolTasks.push(
        searchKnowledge(user.id, message.slice(0, 100))
          .then(items => {
            if (items?.length) {
              const kbContext = items.slice(0,3).map(i => `[${i.type}] ${i.title}: ${i.content?.slice(0,200)}`).join('\n');
              toolCtx += `\n[KNOWLEDGE BASE:\n${kbContext}]`;
              toolSources.push('📚 your knowledge base');
            }
          }).catch(() => {})
      );
    }
    await Promise.allSettled(toolTasks.filter(Boolean));
  } catch {}

  // Smart context: last 20 msgs + summarize older context if conversation is long
  let contextSummary = '';
  if (history.length > 20) {
    const older = history.slice(0, history.length - 20);
    const summaryPrompt = `Summarize this conversation briefly in 3-5 lines (Hinglish). Key facts, decisions, topics discussed:\n${older.map(m=>`${m.role}: ${m.content}`).join('\n').slice(0,2000)}`;
    try {
      if (keys.GROQ_API_KEY) {
        const sr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${keys.GROQ_API_KEY}`},
          body: JSON.stringify({ model:'llama3-8b-8192', messages:[{role:'user',content:summaryPrompt}], temperature:0.3, max_tokens:200 })
        });
        const sd = await sr.json();
        contextSummary = sd.choices?.[0]?.message?.content || '';
      }
    } catch {}
  }

  const msgs = [
    ...(contextSummary ? [{role:'user',content:`[Conversation summary so far: ${contextSummary}]`},{role:'assistant',content:'Understood, continuing from where we left off.'}] : []),
    ...history.slice(-20).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: message + (toolCtx ? `\n${toolCtx}\n[Use data naturally]` : '') },
  ];

  const encoder = new TextEncoder();
  let fullReply = '';

  // ── ReAct Agent — only for Deep mode, complex multi-step queries ──
  if (mode === 'deep' && (keys.GROQ_API_KEY || keys.CEREBRAS_API_KEY) && message.split(' ').length > 6) {
    try {
      const reactResult = await reactAgent({
        message, profile, systemPrompt: system,
        agents: AGENTS, getGoals,
        groqKey:     keys.GROQ_API_KEY,
        cerebrasKey:   keys.CEREBRAS_API_KEY,
        tavilyKey:     keys.TAVILY_API_KEY,
        sambanovaKey:  keys.SAMBANOVA_API_KEY,
        maxSteps: 4,
      });
      if (reactResult?.reply) {
        const enc2 = new TextEncoder();
        const rStream = new ReadableStream({
          start(ctrl2) {
            const send2 = d => ctrl2.enqueue(enc2.encode('data: ' + JSON.stringify(d) + '\n\n'));
            const words = reactResult.reply.split(' ');
            let i = 0;
            // Stream word by word for natural feel
            const iv = setInterval(() => {
              if (i < words.length) { send2({ type: 'token', token: words[i++] + ' ' }); }
              else {
                send2({ type: 'done', conversationId: convId, sources: [...toolSources, ...reactResult.usedTools.map(t => '🤖 react-'+t)], steps: reactResult.steps });
                clearInterval(iv); ctrl2.close();
              }
            }, 28);
          }
        });
        // Save to DB
        fullReply = reactResult.reply;
        if (convId) await saveMessage(user.id, convId, { role:'assistant', content:fullReply, metadata:{ mode, react:true, steps:reactResult.steps } }).catch(()=>{});
        return new Response(rStream, { headers: { 'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive' } });
      }
    } catch {} // ReAct failed — fall through to normal streaming
  }

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = d => ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(d)}\n\n`));

      try {
        // ── v10.1 SMART ROUTER — Auto pick best provider ─────────
        // Gets ordered list based on: mode + complexity + daily usage + available keys
        const providerOrder = getProviderOrder(mode, message, chatHistory, keys);
        let usedProvider = 'offline';
        let streamSuccess = false;

        // Notify client which provider is being used
        if (providerOrder.length > 0) {
          send({ type: 'provider', provider: providerOrder[0] });
        }

        for (const providerId of providerOrder) {
          try {
            let thinking = '', inThink = false;

            // Use streamProvider from smart-router (handles all providers uniformly)
            for await (const { token, provider, model } of streamProvider(
              providerId, msgs, system, keys, { maxTokens: 1400, temperature: dynTemp }
            )) {
              // Handle think-mode <think> tags from DeepSeek R1
              if (mode === 'think' || providerId === 'groq_deepseek_r1') {
                if (token.includes('<think>'))  { inThink = true; continue; }
                if (token.includes('</think>')) { inThink = false; send({ type: 'thinking_done', thinking }); continue; }
                if (inThink) { thinking += token; send({ type: 'thinking', token }); continue; }
              }
              fullReply += token;
              send({ type: 'token', token });
            }

            usedProvider = providerId;
            streamSuccess = true;
            break; // Success — stop trying fallbacks

          } catch (provErr) {
            console.warn(`[smart-router] ${providerId} failed:`, provErr.message);
            // Rate limit → notify user, try next
            if (provErr.message.includes('429') || provErr.message.includes('rate')) {
              send({ type: 'token', token: '' }); // silent, try next
            }
            // Continue to next provider
          }
        }

        // All providers failed → offline fallback
        if (!streamSuccess) {
          const fallbackReply = offlineFallback(message);
          for (const word of fallbackReply.split(' ')) {
            fullReply += word + ' ';
            send({ type: 'token', token: word + ' ' });
            await new Promise(r => setTimeout(r, 20));
          }
          usedProvider = 'offline';
        }

        const cleanReply = fullReply.replace(/\[MEMORY: [^\]]+\]/g, '').trim();
        const memories   = (fullReply.match(/\[MEMORY: ([^\]]+)\]/g) || []).map(m => {
          const raw = m.replace('[MEMORY: ', '').replace(']', '');
          const [k, ...v] = raw.split('=');
          const key = k.trim().toLowerCase();
          const val = v.join('=').trim();
          const cat = /name|age|city|job|work|profession|hobby|interest|family|friend/i.test(key) ? 'profile'
            : /goal|target|want|aim|plan/i.test(key)   ? 'goal'
            : /mood|feel|emotion|sad|happy|stress|anxious/i.test(key) ? 'emotion'
            : /like|prefer|hate|love|dislike|favourite/i.test(key)    ? 'preference'
            : /study|exam|subject|class|school|college/i.test(key)    ? 'study'
            : 'general';
          return { key, value: val, category: cat };
        });

        // XP + badges
        try {
          const xpResult = await addXP(user.id, 5, 'message');
          const newBadges = await checkAndAwardBadges(user.id);
          const convMode = autoDetectConvMode(message);
          if (xpResult.levelUp || newBadges.length > 0) {
            send({ type: 'gamification', xp: xpResult.xp, levelUp: xpResult.levelUp, newLevel: xpResult.newLevel, newBadges });
          }
          send({ type: 'conv_mode', mode: convMode });
        } catch {}

        // Follow-up chips + done
        const followUpChips = generateFollowUps(message, cleanReply, mode);
        send({ type: 'done', conversationId: convId, sources: toolSources, followUps: followUpChips, provider: usedProvider });

        // Async saves
        if (convId && cleanReply) {
          await saveMessage(user.id, convId, { role: 'assistant', content: cleanReply, metadata: { mode, provider: usedProvider } }).catch(() => {});
          await updateConversation(user.id, convId, { updated_at: new Date().toISOString() }).catch(() => {});
        }
        try {
          await saveLLMLog(user.id, {
            model: usedProvider,
            latency_ms: Date.now() - reqStart,
            mode,
            tokens: Math.round(cleanReply.length / 4),
          });
        } catch {}
        await Promise.allSettled(memories.map(m => saveMemory(user.id, { value: m.value, category: m.category || 'general', key: m.key, importance: m.category === 'profile' ? 9 : 6 }, keys.GEMINI_API_KEY, keys.HUGGINGFACE_TOKEN)));

      } catch (e) {
        // Last resort offline fallback
        console.error('[stream] Fatal error:', e.message);
        const fallbackReply = offlineFallback(message);
        for (const word of fallbackReply.split(' ')) {
          send({ type: 'token', token: word + ' ' });
          await new Promise(r => setTimeout(r, 20));
        }
        send({ type: 'done', conversationId: convId, sources: [], provider: 'offline' });
      } finally {
        ctrl.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
