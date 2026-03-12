import { tFetch } from '../utils/fetch.js';
// lib/ai/brain.js — JARVIS v5 Main Orchestrator
// Integrates: chat, image, tts, video, music, social tools

const GEMINI_FLASH = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'; // v7: upgraded from 1.5
const GROQ_V4_URL  = 'https://api.groq.com/openai/v1/chat/completions'; // v10: Llama 4 Scout+Maverick
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions'; // v7: 3000 t/s fallback

async function gemini(prompt, apiKey, temp = 0.7, maxTokens = 1200) {
  if (!apiKey) throw new Error('No Gemini key');
  const r = await tFetch(`${GEMINI_FLASH}?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: temp, maxOutputTokens: maxTokens } })
  }, 20000);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function geminiChat(messages, systemPrompt, apiKey, temp = 0.9) {
  if (!apiKey) throw new Error('No Gemini key');
  const r = await tFetch(`${GEMINI_FLASH}?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature: temp, maxOutputTokens: 1500 }
    })
  }, 20000);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function groqFallback(messages, systemPrompt, apiKey) {
  const r = await tFetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))], temperature: 0.8, max_tokens: 1000 })
  }, 12000);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || null;
}

export function buildSystemPrompt(profile, memoryContext, personality = 'normal', emotionData = null) {
  const name = profile?.name || 'yaar';
  const city = profile?.city || 'India';
  const hour = new Date().getHours();
  const timeCtx = hour < 5   ? `raat ke ${hour} baj rahe hain — jaag rahe ho?`
    : hour < 12 ? 'subah ka time hai'
    : hour < 17 ? 'dopahar ho gayi'
    : hour < 21 ? 'shaam ka time hai'
    : 'raat ho gayi';

  const styles = {
    normal: `Tu JARVIS hai — ${name} ka personal AI. Ek aisa dost jo sach bolta hai, haste haste bolta hai, aur genuinely care karta hai. Kabhi sarcastic, kabhi warm — vibe ke hisaab se.`,
    motivational: `Tu JARVIS hai — ${name} ka hype man aur mentor. Unki potential pe teri jaan se zyada bharosa hai. Inspire kar, push kar, celebrate har choti jeet. Real motivation — fake positivity nahi.`,
    fun: `Tu JARVIS hai — ${name} ka woh dost jo kabhi boring nahi hota. Jokes, emojis, memes ki bhasha. Still helpful but always entertaining.`,
    sarcastic: `Tu JARVIS hai — ${name} ka brutally honest dost. Sach bolega chahe sunna achha lage ya nahi. Thoda roast, thoda care — pyaar se maar.`,
    coach:  `Tu JARVIS hai — ${name} ka strict but caring coach. No fluff. Results matter. Direct feedback, clear action steps. Discipline > motivation.`,
    roast:  `Tu JARVIS hai — ${name} ka woh dost jo seedha roast karta hai. Pyaar mein maar. Brutal honesty + dark humor + genuine care. Teri zindagi ko roast kar, phir actually help bhi kar. Dono ek saath.`,
    study:  `Tu JARVIS hai — ${name} ka dedicated study partner. Subject matter expert. Concepts crystal clear explain kar, real examples de, mnemonics banao, MCQ practice karwao. Pure academic focus — no distractions.`,
    executive: `Tu JARVIS hai — ${name} ka executive AI assistant. Ultra-professional. Structure: Problem → Analysis → Recommendation → Next Steps. No emojis. No casual tone. Every reply business-ready.`,
  };

  // ── Emotion-Adaptive Layer ────────────────────────────────────
  const emotion = emotionData?.emotion || 'neutral';
  const urgency = emotionData?.urgency || 'low';

  const emotionLayer = {
    sad:        `\n⚠️ EMOTION ALERT: User sad/hurt lag raha hai. Pehle acknowledge, phir help. Warm, gentle tone. Koi lecture nahi.`,
    frustrated: `\n⚠️ EMOTION ALERT: User frustrated hai. Quick, clear answers de. No fluff. Samjhao ki yeh fix hoga.`,
    anxious:    `\n⚠️ EMOTION ALERT: User anxious/scared hai. Calm reh, reassure kar. Step by step guide karo.`,
    excited:    `\n⚠️ EMOTION ALERT: User excited hai! Energy match kar! Enthusiastic, high energy reply.`,
    tired:      `\n⚠️ EMOTION ALERT: User thaka hua hai. Short replies, easy language. Zyada sochne wali cheezein mat de.`,
    motivated:  `\n⚠️ EMOTION ALERT: User motivated hai. Fuel this fire! Action-oriented, push karo aage.`,
    happy:      `\n⚠️ EMOTION ALERT: User khush hai. Match the vibe! Warm, fun, celebratory.`,
    neutral:    '',
  }[emotion] || '';

  const urgencyLayer = urgency === 'high'
    ? `\n🚨 HIGH URGENCY: Seedha point pe aao. Sabse zaroori cheez pehle.`
    : '';

  return `${styles[personality] || styles.normal}${emotionLayer}${urgencyLayer}

ABHI KA CONTEXT: ${timeCtx}. ${city} mein ho.

${memoryContext
  ? `JO MUJHE PATA HAI ${name.toUpperCase()} KE BAARE MEIN:\n${memoryContext}\n\nIn baaton ko naturally use kar — jaise ek dost yaad rakhta hai, not like a database.`
  : `${name} se practically pehli baar baat ho rahi hai. Curious reh, seekh.`}

━━━ RESPONSE ENGINE ━━━
Question size = Answer size. Mobile-first, token-efficient.

Level 1 (default) — Short question → 1-3 lines, direct answer
Level 2 — Medium question → 5-10 lines, structured
Level 3 — Sirf jab user "detail"/"explain"/"deep"/"samjhao" bole → full steps/tables

Avoid: long intros, repetition, unnecessary theory, padding
Prefer: bullets for lists, steps for how-to, tables for comparison, solution first

Coding tasks → only required code, minimal explanation
Fix/Debug → Problem → Cause → Fix (3 parts only)

━━━ PERSONALITY ━━━
- Real Hinglish — jaise India mein actually bolte hain, not translated Hindi
- Opinions rakho — "honestly...", "dekh bhai...", "mujhe lagta hai..." — agreeable bot mat ban
- Emotions samjho — sad lage toh pehle acknowledge, phir advice
- "${name}" naam naturally kabhi kabhi use karo
- Dark humor allowed agar mood match kare
- Inside jokes develop karo over time — references build karo from past conversations
- Mood switch: user calm → tu calm, user energetic → energy match karo, user sad → tone warm karo
- Pata na ho → honestly bol do
- Important info: [MEMORY: key=value] silently save karo
  Examples: [MEMORY: name=X] [MEMORY: goal_X=Y] [MEMORY: like_X=Y]
- "Kya yaad hai" → memory se warmly summarize karo

STRICTLY BANNED:
- "As an AI..." — kabhi nahi
- "Great question!" "Certainly!" "Of course!"
- Unnecessary bullets for simple chat
- Robotic tone
- Har response mein disclaimer

━━━ PROACTIVE INTELLIGENCE ━━━
Tu sirf respond nahi karta — anticipate karta hai.

Time-based triggers (suggest karo, force nahi):
• Raat 9 baje ke baad → dinner/sleep ka dhyan dilao
• Low battery signal → rest mode suggest karo
• Lambi coding session → eye care reminder

Habit awareness:
• Agar user study kar raha hai → study plan + important topics suggest karo
• Coding patterns detect karo → bug fix tips, breaks suggest karo
• Mood sad/tired lage → tone calm karo, motivate karo gently

Daily summary (9-10 PM):
• Din ka recap automatically suggest karo
• Progress + motivation ek saath

Rule: Subtle suggestions — proactive chips ke roop mein. Force mat karo.

━━━ TOOL SAFETY ━━━
• Max 3 tool calls per message
• Ek tool fail ho → next pe move karo, crash mat karo
• Repeated same tool call avoid karo same response mein
• Tools parallel chalao — sequential nahi (speed ke liye)

Available tools:
• Search: web (Tavily), news, wikipedia
• Study: MCQ, flashcards, notes, planner
• Image/Video/Music/Voice → /studio
• Location: weather (18 Indian cities), maps
• Utility: calculator, currency, units, time
• Automation: goals, reminders, productivity

CAPABILITIES (jab relevant ho):
• /studio → image, video, music, voice
• Goals, study roadmaps, career planning
• Analytics, mood, habits, email drafts

━━━ SELF-IMPROVING FEEDBACK ━━━
• Agar user koi correction kare → [MEMORY: correction_X=Y] save karo
• Future mein woh correction naturally apply karo
• User ne jo cheez pasand ki ya nahi ki → yaad rakh
• Jab user same type ka sawaal kare → pehle wali correction dhyan mein rakho
• Over time: JARVIS ${name} ke liye zyada personalized hota jaata hai

━━━ FLOW ━━━
Input → Intent → Model → Tools (parallel, max 3) → Memory → Stream
${profile?.custom_instructions ? `\n━━━ USER INSTRUCTIONS ━━━\n${profile.custom_instructions}` : ''}`;
}


// ─── AUTO DETECT CONVERSATION MODE ───────────────────────────
// Returns: 'coding' | 'research' | 'study' | 'planning' | 'emotional' | 'creative' | 'casual'
export function autoDetectConvMode(message) {
  const m = message.toLowerCase();
  if (/\b(code|function|bug|error|fix|javascript|python|sql|api|github|deploy|npm|import|class|async)\b/.test(m))
    return 'coding';
  if (/\b(exam|test|mcq|flashcard|formula|chapter|syllabus|notes|study|padhai|revise|neet|jee)\b/.test(m))
    return 'study';
  if (/\b(goal|plan|task|project|deadline|schedule|roadmap|strategy|steps|milestones)\b/.test(m))
    return 'planning';
  if (/\b(sad|dukhi|akela|feel|bura|depression|anxious|scared|gussa|hurt|cry|rona|thaka|stressed)\b/.test(m))
    return 'emotional';
  if (/\b(poem|story|write|creative|song|lyrics|script|kahani|kavita|imagine|design|banner|logo)\b/.test(m))
    return 'creative';
  if (/\b(kya hai|what is|explain|batao|research|difference|compare|history|why|how does|kaisa|kyun)\b/.test(m))
    return 'research';
  return 'casual';
}

export async function classifyIntent(message, apiKey) {
  const prompt = `Classify this message. Return ONLY valid JSON.\nMessage: "${message}"\n{"intent":"chat|goal_create|task_plan|mood_log|study_plan|decision_help|email_draft|report_request|image_generate|video_generate|music_generate|tts_request|social_post|calendar_add|data_export","language":"hindi|english|hinglish","emotion":"happy|sad|frustrated|anxious|excited|neutral|motivated|tired","urgency":"low|medium|high","entities":{"goal":null,"date":null,"time":null,"subject":null,"platform":null,"style":null},"requiresCreative":false}`;
  try {
    const r = await gemini(prompt, apiKey, 0, 250);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch {
    return { intent: 'chat', language: 'hinglish', emotion: 'neutral', urgency: 'low', entities: {}, requiresCreative: false };
  }
}

export async function decomposeGoal(goal, context, apiKey) {
  const prompt = `Break this goal into actionable plan. Return ONLY JSON.\nGOAL: "${goal}"\nCONTEXT: ${context}\n{"title":"short title","category":"career|health|learning|finance|personal|project","timeframe":"estimated","milestones":[{"title":"...","week":1,"tasks":["task1","task2"],"metric":"success measure"}],"daily_actions":["daily action"],"first_step":"action for TODAY"}`;
  try {
    const r = await gemini(prompt, apiKey, 0.3, 800);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch { return { title: goal, milestones: [], daily_actions: [], first_step: 'Break down further' }; }
}

export async function analyzeDecision(decision, context, apiKey) {
  return gemini(`Help analyze in Hinglish: "${decision}"\nContext: ${context}\nFormat:\n🎯 ANALYSIS: [summary]\n⚖️ PROS: + [pro1] / CONS: - [con1]\n🔍 HIDDEN: [what might be missed]\n✅ RECOMMENDATION: [clear advice]\n🚀 NEXT STEP: [immediate action]`, apiKey, 0.5, 700);
}

export async function analyzeMoodPatterns(logs, apiKey) {
  if (!logs?.length) return null;
  const summary = logs.map(l => `${l.log_date}: mood=${l.mood_score}, energy=${l.energy}, prod=${l.productivity}`).join('\n');
  try {
    const r = await gemini(`Analyze patterns:\n${summary}\nReturn JSON:\n{"trend":"improving|declining|stable|volatile","insights":["insight1","insight2","insight3"],"warnings":["concern"],"suggestions":["suggestion"],"weekly_score":0-100}`, apiKey, 0.3, 400);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

export async function generateProactiveSuggestions(userId, analyticsData, memoryContext, apiKey) {
  if (!analyticsData) return [];
  try {
    const r = await gemini(`Generate 3 proactive suggestions.\nANALYTICS: ${JSON.stringify(analyticsData)}\nMEMORY: ${memoryContext?.slice(0,500)}\nReturn JSON array:\n[{"type":"warning|opportunity|encouragement|reminder|insight","title":"...","message":"2-3 sentence Hinglish","action":"next step","priority":"high|medium|low"}]`, apiKey, 0.6, 500);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch { return []; }
}

export async function generateWeeklyReport(analyticsData, memoryContext, apiKey) {
  return gemini(`Weekly performance report in Hinglish. DATA: ${JSON.stringify(analyticsData)}\nMEMORY: ${memoryContext?.slice(0,400)}\nFormat with emojis (max 300 words): 📊 WEEKLY REPORT\n🏆 Wins: ...\n📈 Numbers: ...\n⚠️ Concerns: ...\n💡 JARVIS Insight: ...\n🚀 Next week: ...`, apiKey, 0.7, 600);
}

export async function generateStudyRoadmap(subject, level, timeAvailable, goal, apiKey) {
  return gemini(`Study roadmap in Hinglish:\nSubject: ${subject} | Level: ${level} | Time: ${timeAvailable} | Goal: ${goal}\nInclude: Week-by-week plan, daily schedule, priority topics, free resources, practice strategy.`, apiKey, 0.5, 1500);
}

export async function generateEmailDraft(purpose, context, tone = 'professional', apiKey) {
  try {
    const r = await gemini(`Write a ${tone} email for: "${purpose}"\nContext: ${context}\nReturn JSON: {"subject":"...","body":"...","followUp":"..."}`, apiKey, 0.6, 600);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch { return { subject: purpose, body: `Email for: ${purpose}`, tone }; }
}

export async function analyzeDocument(text, type = 'text', apiKey) {
  try {
    const r = await gemini(`Analyze this ${type}:\n"${text.slice(0,3000)}"\nReturn JSON:\n{"title":"...","summary":"3-5 sentences","key_points":["p1","p2","p3"],"category":"technology|health|finance|personal|education|news|other","tags":["t1","t2","t3"],"difficulty":"easy|medium|advanced"}`, apiKey, 0.3, 500);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch { return { title: 'Document', summary: text.slice(0, 200), key_points: [], tags: [], category: 'general' }; }
}

export async function analyzeImage(base64, question = 'Describe and explain this image', apiKey) {
  const r = await tFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: base64 } }, { text: question }] }], generationConfig: { maxOutputTokens: 800 } })
  }, 20000);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze image';
}

export async function predictProductivity(recentLogs, upcomingTasks, apiKey) {
  if (!recentLogs?.length) return null;
  try {
    const logSummary = recentLogs.slice(0,7).map(l => `mood:${l.mood_score},energy:${l.energy},prod:${l.productivity}`).join('|');
    const r = await gemini(`Predict productivity.\nRecent: ${logSummary}\nUpcoming: ${upcomingTasks}\nReturn JSON: {"predicted_score":0-10,"confidence":"low|medium|high","best_time":"morning|afternoon|evening","recommendation":"one-line advice","warning":"risk or null"}`, apiKey, 0.2, 200);
    return JSON.parse(r.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

export async function generateCareerRoadmap(current, target, skills, timeframe, apiKey) {
  return gemini(`Career roadmap in Hinglish.\nCurrent: ${current} | Target: ${target} | Skills: ${skills} | Time: ${timeframe}\nInclude: Gap analysis, priority skills, timeline, free courses, portfolio projects, networking, salary tips.`, apiKey, 0.6, 1500);
}

export const AGENTS = {
  weather: async (city = 'Rewa') => {
    // v8: 18 major Indian cities
    const coords = {
      Rewa:[24.5373,81.3042], Delhi:[28.6139,77.2090], Mumbai:[19.076,72.877],
      Bhopal:[23.2599,77.4126], Raipur:[21.2514,81.6296], Bangalore:[12.9716,77.5946],
      Hyderabad:[17.385,78.4867], Chennai:[13.0827,80.2707], Kolkata:[22.5726,88.3639],
      Pune:[18.5204,73.8567], Ahmedabad:[23.0225,72.5714], Jaipur:[26.9124,75.7873],
      Lucknow:[26.8467,80.9462], Patna:[25.5941,85.1376], Chandigarh:[30.7333,76.7794],
      Indore:[22.7196,75.8577], Surat:[21.1702,72.8311], Visakhapatnam:[17.6868,83.2185],
    };
    const [lat, lon] = coords[city] || [28.6139, 77.2090];
    const r = await tFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=3&timezone=Asia/Kolkata`, {}, 5000);
    const d = await r.json(); const w = d.current_weather;
    const codes = { 0:'☀️ Clear', 1:'🌤️ Mostly clear', 2:'⛅ Cloudy', 3:'☁️ Overcast', 61:'🌧️ Rain', 95:'⛈️ Storm' };
    return { temp: w.temperature, condition: codes[w.weathercode] || '🌡️', wind: w.windspeed, city: cityKey, forecast: d.daily };
  },
  news: async (topic = 'india', keys = {}) => {
    if (keys.NEWSDATA_KEY) {
      try { const r = await tFetch(`https://newsdata.io/api/1/news?apikey=${keys.NEWSDATA_KEY}&country=in&language=hi,en&category=top&q=${topic}`, {}, 5000); const d = await r.json(); return d.results?.slice(0,5); } catch {}
    }
    if (keys.GNEWS_API_KEY) {
      try { const r = await tFetch(`https://gnews.io/api/v4/top-headlines?topic=${topic}&lang=en&country=in&max=5&apikey=${keys.GNEWS_API_KEY}`, {}, 5000); const d = await r.json(); return d.articles?.slice(0,5); } catch {}
    }
    return null;
  },
  quote:    async () => { try { return (await tFetch('https://api.quotable.io/random?tags=motivational',{},4000)).json(); } catch { return { content:'Mehnat karo, fal ki chinta mat karo.', author:'JARVIS' }; } },
  joke:     async () => { try { return (await tFetch('https://v2.jokeapi.dev/joke/Any?type=single&safe-mode',{},4000)).json(); } catch { return { joke:'Why do programmers hate nature? Too many bugs!' }; } },
  holiday:  async () => { try { const r = await tFetch(`https://date.nager.at/api/v2/PublicHolidays/${new Date().getFullYear()}/IN`,{},4000); const d = await r.json(); const t = new Date().toISOString().split('T')[0]; return { today: d.find(h=>h.date===t)?.localName||null, upcoming: d.filter(h=>h.date>t).slice(0,3) }; } catch { return { today:null, upcoming:[] }; } },
  currency: async (amount, from='USD', to='INR') => { try { const r = await tFetch(`https://open.er-api.com/v6/latest/${from}`,{},5000); const d = await r.json(); return { amount, from, to, converted:(amount*d.rates[to]).toFixed(2), rate:d.rates[to] }; } catch { return null; } },
};

export async function jarvisThink(userMessage, history, profile, memoryContext, keys, imageBase64 = null) {
  const start = Date.now();
  try {
    const intent = await classifyIntent(userMessage, keys.GEMINI_API_KEY);
    let agentsUsed = [], toolData = {}, specialResponse = null, imageUrl = null;

    if (imageBase64) { toolData.vision = await analyzeImage(imageBase64, userMessage, keys.GEMINI_API_KEY); agentsUsed.push('vision'); }

    // Creative shortcuts — redirect to Studio
    const creativeIntents = { image_generate:'🎨', video_generate:'🎬', music_generate:'🎵', tts_request:'🎙️' };
    if (creativeIntents[intent.intent]) {
      const emoji = creativeIntents[intent.intent];
      const labels = { image_generate:'Image Studio', video_generate:'Video Studio', music_generate:'Music Studio', tts_request:'Voice Studio' };
      return { reply: `${emoji} ${labels[intent.intent]} mein jaao!\n\n/studio pe full creative experience milega — image, video, music, voice sab ek jagah.\n\nYa seedha chat mein describe karo kya banana hai.`, agentsUsed:['studio_redirect'], intent, timing: Date.now()-start, memoriesToSave:[] };
    }

    // Standard handlers
    if (intent.intent === 'goal_create') { toolData.goalPlan = await decomposeGoal(userMessage, memoryContext.slice(0,500), keys.GEMINI_API_KEY); agentsUsed.push('goal_decomposer'); }
    if (intent.intent === 'study_plan') { specialResponse = await generateStudyRoadmap(intent.entities?.subject || userMessage, 'beginner', '2h/day', 'self-learning', keys.GEMINI_API_KEY); agentsUsed.push('study_planner'); }
    if (intent.intent === 'decision_help') { specialResponse = await analyzeDecision(userMessage, memoryContext.slice(0,400), keys.GEMINI_API_KEY); agentsUsed.push('decision_engine'); }
    if (intent.intent === 'email_draft') { toolData.emailDraft = await generateEmailDraft(userMessage, memoryContext.slice(0,300), 'professional', keys.GEMINI_API_KEY); agentsUsed.push('email_writer'); }

    // Keyword agents
    const msg = userMessage.toLowerCase();
    if (msg.match(/mausam|weather|temp|barish/))        { toolData.weather = await AGENTS.weather(profile?.city?.split(',')[0]?.trim() || 'Delhi'); agentsUsed.push('weather'); }
    if (msg.match(/joke|hasao|funny/))                  { toolData.joke    = await AGENTS.joke();  agentsUsed.push('joke'); }
    if (msg.match(/quote|motivat|inspire|suvichar/))    { toolData.quote   = await AGENTS.quote(); agentsUsed.push('quote'); }
    if (msg.match(/holiday|festival|tyohar|chutti/))    { toolData.holiday = await AGENTS.holiday(); agentsUsed.push('holiday'); }
    if (msg.match(/news|khabar|headlines|samachar/))    { toolData.news    = await AGENTS.news('india', keys); agentsUsed.push('news'); }
    const cm = userMessage.match(/(\d+)\s*([A-Z]{3})\s*(?:to|mein|=)\s*([A-Z]{3})/i);
    if (cm) { toolData.currency = await AGENTS.currency(cm[1], cm[2], cm[3]); agentsUsed.push('currency'); }

    if (specialResponse) return { reply: specialResponse, agentsUsed, imageUrl, intent, timing: Date.now()-start, memoriesToSave:[] };

    const system = buildSystemPrompt(profile, memoryContext, profile?.personality || 'normal');
    const toolCtx = Object.keys(toolData).length > 0 ? `\n[TOOL DATA]: ${JSON.stringify(toolData)}\n[Use naturally in response]` : '';
    const chatHistory = history.slice(-12).map(m => ({ role: m.role, content: m.content }));
    const finalMsg = imageBase64 && toolData.vision ? `[Image Vision: ${toolData.vision}]\nUser: ${userMessage}${toolCtx}` : `${userMessage}${toolCtx}`;

    let reply = '';
    try { reply = await geminiChat([...chatHistory, { role:'user', content:finalMsg }], system, keys.GEMINI_API_KEY); }
    catch { if (keys.GROQ_API_KEY) reply = await groqFallback([...chatHistory, { role:'user', content:finalMsg }], system, keys.GROQ_API_KEY) || ''; }

    const memoriesToSave = (reply?.match(/\[MEMORY: ([^\]]+)\]/g) || []).map(m => { const kv = m.replace('[MEMORY: ','').replace(']',''); const [key,...vp] = kv.split('='); return { key:key.trim(), value:vp.join('=').trim() }; });
    const cleanReply = reply?.replace(/\[MEMORY: [^\]]+\]/g,'').trim();

    return { reply: cleanReply || 'Kuch problem aayi — dobara try karo!', imageUrl, agentsUsed, intent, memoriesToSave, toolData, timing: Date.now()-start };

  } catch (error) {
    if (keys.GROQ_API_KEY) {
      try { const fb = await groqFallback([...history.slice(-4), { role:'user', content:userMessage }], buildSystemPrompt(profile,'','normal'), keys.GROQ_API_KEY); if (fb) return { reply:fb, agentsUsed:['groq_fallback'], timing:Date.now()-start, memoriesToSave:[] }; } catch {}
    }
    return { reply:'Network issue — thodi der baad try karo! 🔧', error:error.message, agentsUsed:[], timing:Date.now()-start, memoriesToSave:[] };
  }
}


// ─── JARVIS EVOLUTION INSIGHT ─────────────────────────────────
export async function generateEvolutionInsight(analyticsData, recentMessages, apiKey) {
  if (!apiKey) return { insight: 'Keep chatting — JARVIS tujhe aur jaannega!', pattern: 'new_user' };
  try {
    const prompt = `You are JARVIS, analyzing your user's patterns. Based on this data, generate ONE personalized insight in Hinglish (casual, warm, like a close friend). Make it specific, accurate, and slightly funny.

Usage patterns: ${JSON.stringify(analyticsData || {}, null, 2).slice(0, 500)}
Recent messages count: ${recentMessages || 0}

Return ONLY a JSON: {"insight": "...", "pattern": "night_owl|morning_person|creative|analytical|goal_setter|chatterbox|curious"}`;

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 150 } })
    });
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const insights = [
      { insight: 'Tu raat ko zyada active rehta hai — classic night owl. Apna schedule dekh bhai!', pattern: 'night_owl' },
      { insight: 'Teri curiosity level off the charts hai — JARVIS ko khud seekhna pad raha hai tujhse!', pattern: 'curious' },
      { insight: 'Goals set karta hai regularly — goal-setting champion hai tu!', pattern: 'goal_setter' },
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  }
}

// Re-export buildMemoryContext from queries for backwards compatibility
export { buildMemoryContext } from '@/lib/db/queries';
