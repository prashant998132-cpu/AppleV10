# 🤖 JARVIS v6 — Personal AI Assistant

> Ek aisa AI dost jo yaad rakhta hai, sochta hai, aur genuinely care karta hai.

**Built with:** Next.js 15, Supabase, Gemini AI, Groq, React 19, TailwindCSS  
**AI Models:** Gemini 1.5 Flash (Deep) + DeepSeek R1 (Think) + Llama3-70B (Flash)  
**Memory:** pgvector semantic search + Gemini embeddings  
**Agent:** Custom ReAct implementation (no LangChain)

---

## ⚡ Quick Start

```bash
# Clone + setup
npm install
cp .env.example .env.local
# Fill keys in .env.local

# Database (Supabase SQL Editor mein run karo)
# 1. lib/db/schema.sql
# 2. lib/db/schema_v6_migration.sql

# Run
npm run dev
```

→ Full setup guide: **USER_GUIDE.md**  
→ Developer docs: **JARVIS_MASTER_CONTEXT.md**

---

## ✨ Features

| Category | Features |
|----------|----------|
| **Chat** | Streaming, 4 AI modes, voice in/out, image analysis, auto-resume |
| **Memory** | Semantic search (pgvector), auto-extract from chat, 8 categories |
| **Agent** | ReAct loop, parallel tools, dynamic temperature, cascading fallback |
| **Creative** | Image/Video/Music/TTS generation |
| **Personal** | Goals, Analytics, Knowledge Base, Daily logs, Habits |
| **UX** | PWA, offline, markdown render, in-chat search, source badges |

---

## 🔑 Required APIs (All Free)

- [Supabase](https://supabase.com) — Database
- [Gemini](https://aistudio.google.com) — AI + Embeddings  
- [Groq](https://console.groq.com) — Fast inference

---

*For context in new Claude sessions: paste `JARVIS_MASTER_CONTEXT.md` content*
