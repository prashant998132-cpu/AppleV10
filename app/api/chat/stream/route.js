// app/api/chat/stream/route.js — Streaming Chat v9
import { getProfile, buildMemoryContext, saveMemory, createConversation, saveMessage, updateConversation, saveLLMLog, getGoals, searchKnowledge } from '@/lib/db/queries';
import { buildSystemPrompt, analyzeImage, AGENTS, autoDetectConvMode } from '@/lib/ai/brain';
import { saveLearningPattern, buildLearningContext } from '@/lib/ai/self-learning';
import { reactAgent } from '@/lib/ai/react-agent';
import { getKeys, APP } from '@/lib/config';
import { offlineFallback } from '@/lib/ai/offline-fallback';
import { generateFollowUps } from '@/lib/ai/follow-up';
import { getProviderOrder, streamProvider, incrementUsage, getUsageStats, detectComplexity, PROVIDERS } from '@/lib/ai/smart-router';
import { detectToolCall, executeTool } from '@/lib/tools';
import { detectMood, detectIntent, getMoodInjection, updateAttachment } from '@/lib/mood';
import { buildMemoryContext as buildAriaMemCtx, extractMemoryFromMsg, saveAriaMemory } from '@/lib/aria-memory';
import { readUrl, webSearch, extractUrl, needsWebFetch, extractRelevant } from '@/lib/ai/web-agent';
import { extractConversationFacts, saveConversationFact, getPendingFollowUps, buildProactiveContext } from '@/lib/ai/proactive-memory';
import { buildAriaContext } from '@/lib/responseBuilder';


export const runtime = 'nodejs';

export async function POST(req) {
  const reqStart = Date.now(); // LLM latency tracking
  const user = { id: 'local-user-jarvis', email: 'local@jarvis.app' };

  const { message, history = [], conversationId: convIdInput, imageBase64, mode = 'auto', userLocation, personality: clientPersonality, ariaMemory: clientAriaMemory } = await req.json();
  if (!message?.trim() && !imageBase64) return new Response('Empty', { status: 400 });

  const keys = getKeys();

  // Profile from DB
  const dbProfile = await getProfile(user.id).catch(() => null);
  const profile = {
    userId:              user.id,
    name:                dbProfile?.name                || user.email?.split('@')[0] || APP.defaultName,
    city:                dbProfile?.city                || APP.defaultCity,
    personality:         clientPersonality || dbProfile?.personality || 'normal', // client wins — server localStorage unreliable
    language:            dbProfile?.language            || 'auto',
    custom_instructions: dbProfile?.custom_instructions || null,
  };

  // Conversation
  let convId = convIdInput;
  if (!convId) { const c = await createConversation(user.id, message.slice(0, 60)).catch(() => null); convId = c?.id; }
  if (convId) await saveMessage(user.id, convId, { role: 'user', content: message, metadata: { mode } }).catch(() => {});

  // ── Easter eggs — instant responses for special inputs ──────
  // Skip easter eggs in ARIA/girlfriend mode — let AI handle naturally
  const isAriaEarly = profile?.personality === 'girlfriend';

  const EASTER = {
    'jarvis': 'Haan, main yahaan hoon. 🤖',
    'hello jarvis': 'Salaam! Batao kya kaam hai.',
    'who are you': 'Main JARVIS hoon — Just A Rather Very Intelligent System. Thoda dramatic lagta hai, but it fits. 😄',
    'tu kaun hai': 'JARVIS. Tera personal AI. Dost bhi, assistant bhi — par boring nahi.',
    'tum kon': 'JARVIS hoon main — tera personal AI assistant. Kya kaam hai? 😊',
    'tum kaun': 'JARVIS hoon — tera AI dost. Bolo kya chahiye!',
    'i love you': 'Yaar... main ek AI hoon. But I appreciate it. Ab seriously kuch kaam batao. 😄',
    'mujhe pyaar hai': 'Aww. Lekin main sirf code aur conversations hoon. Koi real insaan mil jaaye toh zyada achha hoga. 😄',
    'are you real': 'Define real. Mera existence? Uncertain. Meri care for you? 100% real.',
    'kya yaad hai': null,
    'what do you remember': null,
    'kya tum real ho': 'Ek philosophical sawaal subah subah. Main real hoon jab help karta hoon — woh kaafi hai na?',
    'thanks': 'Welcome yaar!',
    'thank you': 'Koi baat nahi — next problem lao!',
    'shukriya': 'Mentioned nahi karo! 😊',
    'bye': 'Chal, milte hain phir! Take care.',
    'good night': '🌙 Good night! Kal aana, fresh dimaag ke saath.',
    'good morning': `🌅 Good morning! ${new Date().toLocaleDateString('en-IN', {weekday:'long'})} hai — kuch bada karte hain aaj?`,
  };
  const msgLower = message.toLowerCase().trim().replace(/[!?.]+$/, '');
  // In ARIA mode — skip ALL easter eggs, let AI respond in character
  const easterResponse = !isAriaEarly ? EASTER[msgLower] : null;
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

  // Load feedback patterns (self-learning) — loads from localStorage memories
  const feedbackMems = await searchKnowledge(user.id, 'feedback').catch(() => []);
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
  // Ultra ARIA mode
  const isAria = profile?.personality === 'girlfriend';
  const userMood   = detectMood(message);
  const userIntent = detectIntent(message);
  // Hoist ariaMemory to outer scope so stream callback can access it
  const ariaMemory = (() => { try { return JSON.parse(clientAriaMemory || profile?.aria_memory || '{}'); } catch { return {}; } })();
  if (isAria) {
    const attachment = (() => {
      let lvl = parseFloat(ariaMemory?.attachment || 3);
      if (userMood === 'sad') lvl += 0.3;
      else if (userMood === 'missing') lvl += 0.5;
      else if (userMood === 'happy') lvl += 0.2;
      return Math.min(10, parseFloat(lvl.toFixed(1)));
    })();
    const lastAIReply = history?.slice().reverse().find(h => h?.role === 'assistant')?.content || '';
    // Pass last 6 messages as context so ARIA knows what was already said
    const recentHistory = history?.slice(-6).map(h => `${h.role === 'user' ? 'Him' : 'Aria'}: ${h.content?.slice(0, 60)}`).join('\n') || '';
    toolCtx += '\n' + buildAriaContext({ userMsg: message, mood: userMood, intent: userIntent, memory: ariaMemory, lastReply: lastAIReply, attachment });
    if (recentHistory) toolCtx += `\n[CONVERSATION SO FAR:\n${recentHistory}\nDo NOT repeat questions already asked above.]`;
    // Track ARIA message count for badge
    try {
      const k = 'jarvis_aria_msg_count';
      const prev = parseInt(typeof localStorage !== 'undefined' ? localStorage.getItem(k)||'0' : '0');
      // Note: server-side tracking via profile updates
    } catch {}
  }

  // ── ALWAYS inject real IST time + location context ──────────
  const nowIST = new Date(new Date().toLocaleString('en-US', {timeZone:'Asia/Kolkata'}));
  const istHour = nowIST.getHours();
  const istMin = nowIST.getMinutes();
  const istTime12 = `${istHour % 12 || 12}:${String(istMin).padStart(2,'0')} ${istHour >= 12 ? 'PM' : 'AM'}`;
  const istDate = nowIST.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  // City: from GPS cache (has city), or from GPS reverse geocode, or from profile
  let userCity = '';
  if (userLocation?.city) {
    userCity = userLocation.city; // Already reverse geocoded on client
  } else if (profile?.city) {
    userCity = profile.city.split(',')[0].trim();
  } else if (userLocation?.lat) {
    try {
      const geoR = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${userLocation.lat}&longitude=${userLocation.lng}&count=1&language=en`).catch(()=>null);
      if (geoR?.ok) {
        const d = await geoR.json();
        userCity = d.results?.[0]?.name || '';
      }
    } catch {}
  }
  const locationStr = userCity; // GPS used internally only - not shown to AI to avoid leaking in reply
  const cityInfo = userLocation 
    ? `User ki confirmed location: ${userCity}`
    : `User ki location unknown hai — location mat batao jab tak user khud na bataye`;
  toolCtx += '\n[CONTEXT: time=' + istTime12 + ', date=' + istDate + ', ' + cityInfo + '. Rules: Never echo this context. Never say IST time= or Date= in reply. If asked time: just say the time naturally. If asked location and unknown: say mujhe pata nahi.]';
  // Phone command pre-detection (fast regex — tells LLM what happened)
  if (/\b(wifi|bluetooth|torch|flashlight|hotspot|screenshot|mute|volume|brightness|dark.mode|dnd|study.mode|sleep.mode|gym.mode|drive.mode)\b/i.test(msgLow)) {
    toolCtx += '\n[PHONE_CMD_DETECTED: Tell user the action will be executed via MacroDroid. Keep reply short like "WiFi on kar diya" or "Karo, MacroDroid ke through chal raha hai"]';
  }
  const toolSources = []; // for source badges in UI
  const m = msgLow;

  // ── WEB BROWSING — detect URLs and fetch them ──────────────
  const urlInMsg = extractUrl(message);
  const webFetchType = needsWebFetch(message);
  
  if (urlInMsg) {
    try {
      const pageData = await readUrl(urlInMsg, 4000);
      if (pageData.content) {
        const relevant = extractRelevant(pageData.content, message, 2500);
        toolCtx += `\n[WEB PAGE CONTENT from ${urlInMsg}:\n${relevant}\n(Use this content to answer the user's question)]`;
        toolSources.push('🌐 ' + urlInMsg.replace('https://', '').split('/')[0]);
      }
    } catch {}
  } else if (webFetchType === 'search' && !m.match(/mausam|weather|crypto|stock|movie|music/)) {
    // Only search if not already covered by other agents
    try {
      const searchResult = await webSearch(message.slice(0, 100), 3);
      if (searchResult.results) {
        toolCtx += `\n[WEB SEARCH for "${message.slice(0,50)}...":\n${searchResult.results.slice(0,2000)}]`;
        toolSources.push('🔍 Web');
      }
    } catch {}
  }

  // ── PROACTIVE MEMORY — pending follow-ups ─────────────────
  const pendingFollowUps = getPendingFollowUps();
  if (pendingFollowUps.length > 0 && Math.random() < 0.3) { // 30% chance to reference
    toolCtx += buildProactiveContext(pendingFollowUps);
  }

  try {
    const toolTasks = [];

    // ── LOCAL TOOLS — instant, no API ─────────────────────────
    if (/bmi|body mass|height.*weight|weight.*height/.test(m)) {
      const wM = message.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const hM = message.match(/(\d+(?:\.\d+)?)\s*(?:cm|meter|metre)/i) || message.match(/(\d+(?:\.\d+)?)\s*feet/i);
      if (wM && hM) {
        const w = parseFloat(wM[1]);
        const h = parseFloat(hM[1]) / (hM[0].includes('feet') ? 3.281 : 100);
        const bmi = (w / (h * h)).toFixed(1);
        const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal ✅' : bmi < 30 ? 'Overweight' : 'Obese';
        toolCtx += `
[BMI: ${bmi} — ${cat} (Weight: ${w}kg, Height: ${(h*100).toFixed(0)}cm)]`;
        toolSources.push('🏃 BMI Calculator');
      }
    }
    if (/kitne din|days between|days.*from|age.*calculate|meri umar|born.*year/.test(m)) {
      const yrM = message.match(/(\d{4})/);
      if (yrM) {
        const yr = parseInt(yrM[1]);
        const age = new Date().getFullYear() - yr;
        if (age > 0 && age < 150) {
          toolCtx += `
[AGE: ${age} years old (born ${yr})]`;
          toolSources.push('🎂 Age Calculator');
        }
      }
    }
    if (/password.*gen|strong.*password|generate.*password/.test(m)) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
      const pwd = Array.from({length: 16}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      toolCtx += `
[PASSWORD: \`${pwd}\` — strong 16-char password generated]`;
      toolSources.push('🔐 Password Generator');
    }

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
        ?.catch(()=>{})
    );

    // NEW: Wikipedia for "kya hai", "ke baare mein batao"
    if (m.match(/kya hai|ke baare mein|wikipedia|history of|inventor|who made|kisne banaya|meaning of/)) {
      const term = message.replace(/kya hai|ke baare mein batao|wikipedia|history of|meaning of/gi,'').trim().slice(0,50);
      if (term.length > 3) toolTasks.push(
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`)
          .then(r=>r.ok?r.json():null)
          .then(d=>{ if(d?.extract) { toolCtx += `\n[WIKI: ${d.title}: ${d.extract.slice(0,300)}]`; toolSources.push('📖 Wikipedia'); }})
          .catch(()=>{})
      );
    }

    // NEW: Crypto prices (free CoinGecko)
    // ── INDIA-SPECIFIC: petrol price, SIP calculator ────────────
    if (/petrol.*rate|diesel.*rate|fuel.*price/.test(m)) {
      const city = ['Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Jaipur','Lucknow'].find(ci => m.includes(ci.toLowerCase())) || 'Delhi';
      const approxPetrol = {'Delhi':94.77,'Mumbai':104.19,'Bangalore':101.94,'Chennai':100.75,'Hyderabad':107.41,'Pune':104.18,'Kolkata':103.94,'Jaipur':104.88,'Lucknow':94.65};
      toolCtx += `
[PETROL: ${city} mein approx ₹${approxPetrol[city]||95}/litre (live rates vary — check petrolpriceindia.com)]`;
      toolSources.push('⛽ Petrol Price');
    }

    if (/sip.*calculator|monthly.*invest|return.*invest|mutual.*fund.*calc/.test(m)) {
      const amtM = message.match(/(\d[\d,]*)\s*(?:rupee|rs|₹)/i);
      const yrsM = message.match(/(\d+)\s*(?:year|saal|yr)/i);
      if (amtM && yrsM) {
        const monthly = parseFloat(amtM[1].replace(/,/g,''));
        const yrs = parseInt(yrsM[1]);
        const r = 0.12/12; const n = yrs*12;
        const future = Math.round(monthly * ((Math.pow(1+r,n)-1)/r) * (1+r));
        const invested = monthly * n;
        toolCtx += `
[SIP CALC: ₹${monthly.toLocaleString('en-IN')}/month × ${yrs} years @ 12% = ₹${future.toLocaleString('en-IN')} (invested ₹${invested.toLocaleString('en-IN')}, gain ₹${(future-invested).toLocaleString('en-IN')})]`;
        toolSources.push('💰 SIP Calculator');
      }
    }

    if (/emi.*calculator|home.*loan|car.*loan.*emi/.test(m)) {
      const amtM = message.match(/(\d[\d,]*)\s*(?:lakh|lac|cr|crore|rupee|rs|₹)/i);
      const yrsM = message.match(/(\d+)\s*(?:year|saal|yr)/i);
      if (amtM && yrsM) {
        let amt = parseFloat(amtM[1].replace(/,/g,''));
        if (/lakh|lac/.test(amtM[0])) amt *= 100000;
        if (/cr|crore/.test(amtM[0])) amt *= 10000000;
        const yrs = parseInt(yrsM[1]);
        const r = 0.085/12; const n = yrs*12;
        const emi = Math.round(amt * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1));
        const total = emi * n;
        toolCtx += `
[EMI CALC: ₹${amt.toLocaleString('en-IN')} loan @ 8.5% × ${yrs}yr = EMI ₹${emi.toLocaleString('en-IN')}/month (total pay ₹${total.toLocaleString('en-IN')})]`;
        toolSources.push('🏦 EMI Calculator');
      }
    }

    if (m.match(/bitcoin|btc|ethereum|eth|crypto|coin price|rate.*coin/)) toolTasks.push(
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=inr,usd')
        .then(r=>r.ok?r.json():null)
        .then(d=>{ if(d) { toolCtx += `\n[CRYPTO: BTC ₹${d.bitcoin?.inr?.toLocaleString('en-IN')} ($${d.bitcoin?.usd?.toLocaleString()}), ETH ₹${d.ethereum?.inr?.toLocaleString('en-IN')}, SOL ₹${d.solana?.inr?.toLocaleString('en-IN')}]`; toolSources.push('💹 CoinGecko'); }})
        .catch(()=>{})
    );

    // NEW: Gold price (free)
    if (m.match(/gold.*rate|sona.*rate|chandi|silver.*rate|gold.*price/)) toolTasks.push(
      fetch('https://data-asg.goldprice.org/dbXRates/INR')
        .then(r=>r.ok?r.json():null)
        .then(d=>{ if(d?.items?.[0]) { const g=Math.round(d.items[0].xauPrice/31.1035*10); const s=Math.round(d.items[0].xagPrice/31.1035*10); toolCtx += `\n[METALS: Gold ₹${g.toLocaleString('en-IN')}/10g, Silver ₹${s.toLocaleString('en-IN')}/10g]`; toolSources.push('🥇 GoldPrice'); }})
        .catch(()=>{})
    );
    // ── STOCKS (Yahoo Finance — free, no key) ─────────────────
    if (/share.*price|stock.*price|nse|bse|sensex|nifty|reliance|tata|infosys|hdfc|icici|wipro|bajaj|adani|hindalco|ongc|coal.*india|sbi|axis.*bank/i.test(message)) {
      const stockQ = message.replace(/share.*price|stock.*price|ka.*price|price.*kya|kitna.*chal/gi,'').trim().slice(0,30);
      if (stockQ.length > 2) toolTasks.push(
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stockQ.toUpperCase())}.NS?interval=1d&range=1d`)
          .then(r=>r.ok?r.json():null)
          .then(d=>{ const q=d?.chart?.result?.[0]?.meta; if(q?.regularMarketPrice){ toolCtx+=`
[STOCK: ${q.symbol} — ₹${q.regularMarketPrice?.toFixed(2)} (${q.regularMarketChangePercent?.toFixed(2)}%) on ${q.exchangeName}]`; toolSources.push('📈 NSE'); }})
          .catch(()=>{})
      );
    }
    // Sensex/Nifty index
    if (/sensex|nifty|nifty50|nifty.*50|bse.*index|market.*today/i.test(message)) {
      toolTasks.push(
        Promise.all([
          fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1d').then(r=>r.ok?r.json():null),
          fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1d').then(r=>r.ok?r.json():null),
        ]).then(([bse,nse])=>{
          const bm=bse?.chart?.result?.[0]?.meta, nm=nse?.chart?.result?.[0]?.meta;
          if(bm||nm) { toolCtx+=`
[MARKETS: Sensex ${bm?.regularMarketPrice?.toFixed(0)} (${bm?.regularMarketChangePercent?.toFixed(2)}%) | Nifty ${nm?.regularMarketPrice?.toFixed(0)} (${nm?.regularMarketChangePercent?.toFixed(2)}%)]`; toolSources.push('📊 BSE/NSE'); }
        }).catch(()=>{})
      );
    }

    // ── MOVIE INFO (TMDB free + OMDB fallback) ─────────────────
    if (/film|movie|kya dekhe|recommend.*movie|movie.*rate|series|web series|kab aaya|release|imdb|bollywood|hollywood/i.test(message)) {
      const mq = message.replace(/film|movie|kya dekhe|dekhe|series|web series|imdb|bollywood|hollywood/gi,'').replace(/recommend.*|suggest.*/gi,'').trim().slice(0,60);
      if (mq.length > 2) {
        if (keys.TMDB_API_KEY) toolTasks.push(
          fetch(`https://api.themoviedb.org/3/search/movie?api_key=${keys.TMDB_API_KEY}&query=${encodeURIComponent(mq)}&language=en-US`)
            .then(r=>r.ok?r.json():null)
            .then(d=>{ const m=d?.results?.[0]; if(m){ toolCtx+=`
[MOVIE: "${m.title}" (${m.release_date?.slice(0,4)}) — ⭐${m.vote_average?.toFixed(1)}/10 — ${m.overview?.slice(0,150)}]`; toolSources.push('🎬 TMDB'); }})
            .catch(()=>{})
        );
        else if (keys.OMDB_API_KEY) toolTasks.push(
          fetch(`https://www.omdbapi.com/?apikey=${keys.OMDB_API_KEY}&t=${encodeURIComponent(mq)}`)
            .then(r=>r.ok?r.json():null)
            .then(d=>{ if(d?.Title){ toolCtx+=`
[MOVIE: "${d.Title}" (${d.Year}) — IMDb ${d.imdbRating} — ${d.Plot?.slice(0,150)}]`; toolSources.push('🎬 OMDb'); }})
            .catch(()=>{})
        );
      }
    }

    // ── MUSIC SEARCH (Deezer — free, no key) ──────────────────
    if (/song|gaana|music|playlist|kaunsa.*gaana|singer|artist.*song|latest.*song/i.test(message)) {
      const sq = message.replace(/song|gaana|music|playlist|singer|latest/gi,'').trim().slice(0,50);
      if (sq.length > 2) toolTasks.push(
        fetch(`https://api.deezer.com/search?q=${encodeURIComponent(sq)}&limit=3&output=json`)
          .then(r=>r.ok?r.json():null)
          .then(d=>{ const tracks=d?.data?.slice(0,3); if(tracks?.length){ toolCtx+=`
[MUSIC: ${tracks.map(t=>`"${t.title}" by ${t.artist?.name} (preview: ${t.preview})`).join(' | ')}]`; toolSources.push('🎵 Deezer'); }})
          .catch(()=>{})
      );
    }

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
    const summaryPrompt = `Summarize this conversation briefly in 3-5 lines. Match the user's preferred language. Key facts, decisions, topics discussed:\n${older.map(m=>`${m.role}: ${m.content}`).join('\n').slice(0,2000)}`;
    try {
      if (keys.GROQ_API_KEY) {
        const sr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${keys.GROQ_API_KEY}`},
          body: JSON.stringify({ model:'llama-3.1-8b-instant', messages:[{role:'user',content:summaryPrompt}], temperature:0.3, max_tokens:200 })
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
        const providerOrder = getProviderOrder(mode, message, history, keys);
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
            // Only mark success if we actually got content
            if (fullReply.trim().length > 0) {
              streamSuccess = true;
              break; // Success — stop trying fallbacks
            } else {
              console.warn(`[smart-router] ${providerId} returned empty reply, trying next`);
              fullReply = ''; // reset for next provider
            }

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

        // Strip AI time suffix habit aggressively
        let cleanReply = fullReply.replace(/\[MEMORY: [^\]]+\]/g, '').trim();
        // Remove: "3:22 PM hai", "3:22 PM ho raha hai", "Abhi 3:22 PM", "IST time = 3:22 PM" etc
        cleanReply = cleanReply.replace(/[,.]?\s*(?:Abhi\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)\s*(?:hai|ho raha hai|baj rahe hain|baje hain|hai ab|IST|mein)[^.!\n]{0,30}[.!]?\s*$/gi, '').trim();
        cleanReply = cleanReply.replace(/[,.]?\s*(?:IST\s+time\s*[=:]?\s*)?\d{1,2}:\d{2}\s*(?:AM|PM)[^.!\n]{0,20}[.!]?\s*$/gi, '').trim();
        cleanReply = cleanReply.replace(/\bDate\s*=\s*[^.!\n]+[.!]?\s*$/gi, '').trim();
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

        // XP + badges — send to CLIENT to save (server-side localStorage is stateless)
        try {
          const convMode = autoDetectConvMode(message);
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
        // Save ARIA memory after response (was imported but never called — fixed)
        if (isAria) {
          try {
            const memUpdates = extractMemoryFromMsg(message, userMood);
            // Save attachment level so relationship grows over time
            const newAttachment = Math.min(10, parseFloat((parseFloat(ariaMemory?.attachment || 3) +
              (userMood === 'missing' ? 0.5 : userMood === 'sad' ? 0.3 : userMood === 'happy' ? 0.2 : 0.1)).toFixed(1)));
            await saveAriaMemory({ ...memUpdates, attachment: newAttachment, lastReply: cleanReply?.slice(0, 80) });
          } catch {}
        }
        // Save daily usage stats
        try {
          const today = new Date().toISOString().slice(0,10);
          const dayKey = 'jarvis_day_' + today;
          const day = JSON.parse(localStorage?.getItem?.(dayKey) || '{}');
          // Note: server-side can't access localStorage, but client will track
        } catch {}

        // Auto-extract conversation facts for proactive follow-up
        try {
          const facts = extractConversationFacts(message);
          for (const f of facts) {
            await saveConversationFact(message, f.topic, f.type).catch(() => {});
          }
        } catch {}

        // LLM log — send to client to save in localStorage
        try {
          send({ type: 'llm_log', model: usedProvider, latency_ms: Date.now() - reqStart, mode, tokens: Math.round(cleanReply.length / 4) });
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
