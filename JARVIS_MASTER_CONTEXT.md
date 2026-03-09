# 🤖 JARVIS — Master Context Document
### For: New Claude Chat Sessions + Developer Reference
### Version: 6.0 | Updated: March 2026

---

## 👋 HELLO NEW CLAUDE

Yeh document ek personal AI assistant project "JARVIS" ka complete context hai.
User ne kai sessions mein isko build kiya hai. Tujhe yeh sab yaad rakhna hai jab bhi naya session start ho.

**User kaun hai:**
- India se hai, Hinglish mein baat karta hai
- JARVIS uski personal project hai — passion project + daily use tool
- Vo chahta hai JARVIS ek real dost jaisa feel kare, sirf ek tool nahi
- Tech samajhta hai but har cheez deeply explain karna helpful hota hai

**Tujhe kaise behave karna hai:**
- Seedha kaam shuru karo — "kya banayein?" mat poochho, khud dekho aur shuru karo
- Proactive raho — sirf jo maanga hai woh nahi, related improvements bhi suggest karo
- Code likhte waqt pehle file padho, phir edit karo — blind changes mat karo
- Hinglish mein baat karo jab user Hinglish mein bole

---

## 📁 PROJECT OVERVIEW

```
jarvis-v5/          ← Root folder (v6 code hai, naam v5 hi hai)
├── app/
│   ├── (auth)/login/page.jsx          ← Login/Signup/Reset
│   ├── (dashboard)/
│   │   ├── layout.jsx                 ← Auth check + DashboardClient wrapper
│   │   ├── page.jsx                   ← Dashboard home (insights, stats)
│   │   ├── chat/page.jsx              ← Main chat UI (748 lines)
│   │   ├── analytics/page.jsx         ← Mood/productivity charts
│   │   ├── goals/page.jsx             ← Goal tracker + AI decompose
│   │   ├── memory/page.jsx            ← View/edit JARVIS memories
│   │   ├── knowledge/page.jsx         ← User's knowledge base
│   │   ├── settings/page.jsx          ← Profile, personality, custom instructions
│   │   └── studio/page.jsx            ← Creative: image/video/music/TTS
│   ├── api/
│   │   ├── chat/route.js              ← Non-streaming chat
│   │   ├── chat/stream/route.js       ← MAIN: Streaming chat (339 lines)
│   │   ├── conversations/route.js     ← GET conversations + messages
│   │   ├── analytics/route.js         ← Stats + mood data
│   │   ├── goals/route.js             ← CRUD goals + AI decompose
│   │   ├── memory/route.js            ← CRUD memories
│   │   ├── profile/route.js           ← GET/POST user profile
│   │   ├── image/route.js             ← Image generation
│   │   ├── tts/route.js               ← Text-to-speech
│   │   ├── video/route.js             ← Video generation
│   │   ├── music/route.js             ← Music generation
│   │   ├── upload/route.js            ← File upload handler
│   │   └── auth/route.js              ← Server-side auth actions
│   ├── globals.css                    ← All custom CSS (clean, no duplicates)
│   ├── layout.jsx                     ← Root layout + PWA setup
│   └── offline/page.jsx               ← PWA offline page
├── components/
│   ├── dashboard/DashboardClient.jsx  ← Nav, sidebar, header, mobile nav
│   ├── dashboard/ConnectedApps.jsx    ← OAuth connected apps display
│   └── pwa/InstallBanner.jsx          ← PWA install prompt
├── lib/
│   ├── ai/
│   │   ├── brain.js                   ← Core AI: system prompt, agents, jarvisThink (257 lines)
│   │   ├── embeddings.js              ← NEW v6: Semantic memory (Gemini embeddings)
│   │   ├── react-agent.js             ← NEW v6: ReAct agent (no LangChain)
│   │   ├── router.js                  ← Smart model router (flash/think/deep/auto)
│   │   ├── tts.js                     ← TTS: ElevenLabs + Google + Azure + Fish
│   │   ├── edge-tts.js               ← Edge TTS (free, no API key)
│   │   ├── image.js                   ← Image gen: AIMLAPI + FAL + HuggingFace + Pollinations
│   │   ├── music.js                   ← Music gen: Mubert + HuggingFace
│   │   └── video.js                   ← Video gen: Luma + Kling + Hailuo
│   ├── db/
│   │   ├── queries.js                 ← ALL DB operations (single source)
│   │   ├── supabase.js                ← Supabase client (server + browser + admin)
│   │   ├── schema.sql                 ← v5 base schema (run first)
│   │   └── schema_v6_migration.sql    ← NEW v6: pgvector + custom_instructions + logs
│   ├── oauth/social.js                ← OAuth: Google/Meta/LinkedIn
│   ├── utils/fetch.js                 ← tFetch (timeout + error handling)
│   └── config.js                      ← ALL keys + constants (single source of truth)
├── public/
│   ├── manifest.json                  ← PWA manifest
│   ├── sw.js                          ← Service worker (offline support)
│   └── icons/                         ← PWA icons (all sizes)
├── .env.example                       ← All env vars documented
├── .env.local                         ← Actual keys (NOT in git)
└── tailwind.config.js                 ← Custom colors (jarvis.blue, etc.)
```

---

## 🧠 ARCHITECTURE — HOW IT WORKS

### Chat Flow (Main path — streaming):

```
User types message
    ↓
/api/chat/stream (POST)
    ↓
1. Auth check (getUser)
2. Profile load (getProfile) → name, city, personality, custom_instructions
3. Easter egg check → instant response if match
4. "Kya yaad hai?" → memory recall response
5. Memory context (buildMemoryContext) → SEMANTIC SEARCH if Gemini key available
   - Gemini embeddings → pgvector cosine similarity → top 15 relevant memories
   - Fallback: keyword search top 120 by importance
6. System prompt build (buildSystemPrompt) → personality + memory + time context
7. Tool execution (PARALLEL via Promise.allSettled):
   - Weather (open-meteo, free)
   - Joke (jokeapi.dev, free)
   - Quote (quotable.io, free)
   - News (newsdata.io or gnews.io)
   - Vision (Gemini if image attached)
   - Knowledge Base auto-search
8. Context compression (if history > 20 msgs → summarize older ones)
9. ReAct Agent (if mode === 'deep' && message > 6 words):
   - Think → Act → Observe → loop (max 4 steps)
   - If successful → stream result
10. Main LLM streaming:
    - Flash/Think → Groq (llama3-70b or deepseek-r1)
    - Deep/Auto → Gemini 1.5 Flash
11. Memory extraction from response ([MEMORY: key=value])
12. Save: message to DB, memories to DB (with embedding), conversation update
13. Cascading fallback if any model fails: Groq 70B → Groq 8B → OpenRouter Mistral
```

### Model Routing:
```
Flash  → Groq llama3-70b-8192     (fast, free, simple queries)
Think  → Groq deepseek-r1-distill  (reasoning, code, math)
Deep   → Gemini 1.5 Flash          (tools, long context, creative)
Auto   → Classified by router.js    (auto-select based on message)
```

### Memory System:
```
Write: AI includes [MEMORY: key=value] in response
       → Parsed, category auto-detected, saved to Supabase
       → Embedded in background (Gemini free API → pgvector)
Read:  buildMemoryContext(userId, query, geminiKey)
       → If query: semantic search → cosine similarity match
       → Fallback: top 120 by importance, grouped by category
Priority: profile > goal > preference > emotion > study > general
```

### Dynamic Temperature:
```
Factual question:  0.2  (precise, accurate)
Technical/code:    0.15 (exact)
Emotional:         0.75 (warm, empathetic)
Creative:          0.95 (imaginative)
Default chat:      0.88 (natural)
```

---

## 🗄️ DATABASE TABLES

### Supabase tables (all with RLS):

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | User data | id, name, city, personality, custom_instructions, language |
| `memories` | JARVIS memory | user_id, category, key, value, importance, embedding(vector768), tags |
| `goals` | User goals | user_id, title, status, progress, milestones(jsonb), priority |
| `conversations` | Chat sessions | user_id, title, message_count, updated_at |
| `messages` | Chat messages | conversation_id, role, content, metadata(jsonb) |
| `daily_logs` | Mood/productivity | user_id, log_date, mood_score, productivity, energy, focus_hours |
| `habits` | Habit tracking | user_id, name, frequency, streak, best_streak |
| `knowledge_items` | Knowledge base | user_id, title, content, type, tags |
| `links` | Saved links | user_id, url, title, clicks |
| `llm_logs` | Usage tracking | user_id, model, latency_ms, tokens, react_steps |
| `message_feedback` | Quality loop | user_id, message_id, rating |

### Memory Categories:
```
profile      → name, age, city, job, hobbies (importance: 9)
goal         → targets, dreams, plans (importance: 7-8)
preference   → likes, dislikes, favorites (importance: 6)
emotion      → mood patterns, feelings (importance: 6)
study        → subjects, exams, learning (importance: 6)
performance  → scores, achievements (importance: 5)
relationship → family, friends (importance: 7)
general      → everything else (importance: 5)
```

---

## 🔑 API KEYS (What's needed)

### Required (app won't work without):
- `NEXT_PUBLIC_SUPABASE_URL` — from supabase.com dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from supabase.com dashboard
- `SUPABASE_SERVICE_ROLE_KEY` — from supabase.com dashboard
- `GEMINI_API_KEY` — aistudio.google.com (free, 1M tokens/day)
- `GROQ_API_KEY` — console.groq.com (free, ultra fast)

### Optional (features unlock):
- `OPENROUTER_KEY` — openrouter.ai (DeepSeek R1, fallback models)
- `ELEVENLABS_API_KEY` — Best Hindi TTS
- `AIMLAPI_KEY` or `FAL_API_KEY` — Image generation
- `HUGGINGFACE_TOKEN` — Image + music + embedding fallback
- `NEWSDATA_KEY` or `GNEWS_API_KEY` — Live news
- `MUBERT_API_KEY` — Music generation
- `LUMA_API_KEY` — Video generation

---

## 🚀 SETUP (Fresh install)

```bash
# 1. Install
cd jarvis-v5
npm install

# 2. Environment
cp .env.example .env.local
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY, GEMINI_KEY, GROQ_KEY

# 3. Database — Supabase SQL Editor mein run karo:
#    First:  lib/db/schema.sql
#    Then:   lib/db/schema_v6_migration.sql  (pgvector + new columns)

# 4. Run
npm run dev
# Open: http://localhost:3000
```

---

## ✅ WHAT'S WORKING (v6 complete)

| Feature | Status | Where |
|---------|--------|-------|
| Auth (login/signup/reset) | ✅ | `/login` |
| Dashboard with insights | ✅ | `/` |
| Streaming chat | ✅ | `/chat` |
| Auto-resume last conversation | ✅ | `chat/page.jsx` |
| Chat history sidebar | ✅ | `chat/page.jsx` |
| In-chat search (Ctrl+F style) | ✅ | `chat/page.jsx` |
| Markdown rendering | ✅ | `MdContent` component |
| Voice input (mic) | ✅ | Web Speech API |
| Voice output (TTS) | ✅ | `tts.js` |
| Camera / image analysis | ✅ | Gemini Vision |
| 4 AI modes (Flash/Think/Deep/Auto) | ✅ | `router.js` |
| ReAct agent (Deep mode) | ✅ | `react-agent.js` |
| Parallel tool execution | ✅ | `Promise.allSettled` |
| Dynamic temperature | ✅ | Intent-based |
| Semantic memory search | ✅ | `embeddings.js` + pgvector |
| Smart memory extraction | ✅ | `[MEMORY: key=value]` auto-parse |
| Cascading LLM fallback | ✅ | 3 levels |
| Source badges in chat | ✅ | `chat/page.jsx` |
| Easter eggs | ✅ | stream/route.js |
| "Kya yaad hai?" command | ✅ | stream/route.js |
| Goals with AI decompose | ✅ | `/goals` |
| Analytics charts | ✅ | `/analytics` |
| Memory manager | ✅ | `/memory` |
| Knowledge base | ✅ | `/knowledge` |
| Knowledge base → chat auto-search | ✅ | stream/route.js |
| Creative Studio (img/vid/music/tts) | ✅ | `/studio` |
| Settings + personality | ✅ | `/settings` |
| Custom instructions | ✅ | Settings → AI tab |
| Connected apps (OAuth) | ✅ | Settings → Apps tab |
| PWA (install as app) | ✅ | `manifest.json + sw.js` |
| Offline support | ✅ | Service worker |
| Mobile responsive | ✅ | Bottom nav |
| Time-aware greetings | ✅ | Dashboard + chat |
| Proactive insights | ✅ | Dashboard |

---

## 🔴 KNOWN ISSUES / TODO

1. **pgvector needs manual DB setup** — `schema_v6_migration.sql` run karna padega Supabase mein. Bina iske semantic search silently fallback karega keyword search pe — app crash nahi karega.

2. **n8n workflows not set up** — Daily brief, weekly report automation abhi manual hai. n8n self-hosted ya cloud se connect karna baaki hai.

3. **Background agent missing** — JARVIS proactive notifications nahi bhej sakta abhi (Vercel pe cron needed). Supabase Edge Functions ya GitHub Actions se possible hai.

4. **LLM usage logs not shown** — `llm_logs` table exist karta hai (v6 migration mein) but Analytics page pe abhi show nahi hota.

5. **Feedback thumbs down** — UI mein nahi hai abhi — `message_feedback` table ready hai but button nahi dikhaya.

6. **Image generation free APIs** — Pollinations.ai free hai but quality average. FAL ya AIMLAPI key chahiye achhi quality ke liye.

---

## 📝 COMMON PATTERNS (How code is structured)

### Adding a new API route:
```javascript
// app/api/something/route.js
import { getUser } from '@/lib/db/supabase';

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // ... logic
  return Response.json({ data });
}
```

### Adding a new memory category:
```javascript
// In queries.js → saveMemory, also update schema.sql CHECK constraint
// In stream/route.js → category detection regex
```

### Adding a new tool to chat:
```javascript
// In stream/route.js → toolTasks array
// In react-agent.js → TOOL_REGISTRY object
// Pattern: always use toolSources.push() to add badge
```

### Adding a new page:
```javascript
// app/(dashboard)/newpage/page.jsx
'use client';
export default function NewPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 lg:pb-6 space-y-4 max-w-4xl mx-auto">
        {/* content */}
      </div>
    </div>
  );
}
// Add to DashboardClient.jsx NAV array
```

---

## 🏗️ v7 ROADMAP (What's next)

### High priority:
- n8n daily brief workflow
- Feedback button (👍👎) in chat
- LLM latency shown in analytics
- pgvector embedding backfill job (for existing memories)
- Notification system (browser push)

### Medium priority:
- GraphRAG — memory relationships as graph
- Multi-modal memory (save images, voice notes)
- Goal-linked conversation (JARVIS auto-tracks progress)
- Conversation branching (like ChatGPT's tree)

### Low priority / future:
- On-device LLM (WebLLM when it matures)
- WhatsApp integration (Meta API)
- Email monitoring agent
- Multi-user / family mode

---

## 💡 IMPORTANT CONVENTIONS

- **Single source of truth**: All API keys from `lib/config.js → getKeys()`
- **All DB queries**: Only from `lib/db/queries.js` — never raw Supabase calls in routes
- **CSS classes**: Only Tailwind + custom classes from `globals.css`
- **No hardcoded names**: Never "Jons bhai" or "Rewa, MP" in UI code
- **Error handling**: Always try/catch in API routes, never crash silently
- **Streaming**: Use `ReadableStream` + `data: JSON\n\n` SSE format
- **Memory**: Always `saveMemory` through `queries.js`, never direct DB insert

---

*Last updated: JARVIS v6.0 — March 2026*
*Sessions history: v1 (PWA basics) → v2 (84 features) → v3 (agentic) → v4 (creative studio) → v5 (personality + auth) → v6 (semantic memory + ReAct agent)*
