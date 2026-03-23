# ⚡ JARVIS v11.3 — Personal AI Assistant

> Tumhara personal AI dost — jo yaad rakhta hai, samjhta hai, aur genuinely care karta hai.
> Tony Stark ke JARVIS jaisa — intelligent, witty, aur loyal.

**Live Demo:** [apple-v10.vercel.app](https://apple-v10.vercel.app)  
**GitHub:** [prashant998132-cpu/AppleV10](https://github.com/prashant998132-cpu/AppleV10)

---

## 🚀 Features

| Feature | Details |
|---|---|
| 🤖 AI Chat | 8 personalities — Normal, ARIA (girlfriend), Motivational, Fun, Sarcastic, Coach, Roast, Executive |
| 🎙️ Voice Mode | Hold-to-speak — Aira ki awaaz mein reply, Groq Whisper STT |
| 🎨 Studio | Image generation (Pollinations FLUX), Music (Deezer/Jamendo), Video |
| 🎯 Goals | AI se goal decompose karo, milestones track karo |
| 🧠 Memory | JARVIS yaad rakhta hai — facts, preferences, history |
| 📊 Analytics | Performance radar, streaks, habits tracking |
| 📚 Knowledge | URLs, PDFs, images — AI se analyze karo |
| 📱 Phone Control | MacroDroid se Android automation |
| 🔒 Security | Fingerprint/PIN biometric lock |
| 🌐 PWA | Android home screen pe install, offline support |
| 🏆 Gamification | 10 levels, 13 badges, XP system |
| 📈 Live Data | Stocks (NSE/BSE), Crypto, Gold/Silver, Weather, News |

---

## 🤖 AI Models (Sab FREE)

### Flash Mode (Fast responses)
| Model | Provider | Speed |
|---|---|---|
| Llama 4 Scout | Groq | ⚡⚡⚡ Fastest |
| GPT-OSS 20B | Groq | ⚡⚡⚡ |
| Gemini 2.5 Flash-Lite | Google | ⚡⚡ 1000 RPD |

### Think Mode (Reasoning)
| Model | Provider | Quality |
|---|---|---|
| **Kimi K2** | Groq | ⭐⭐⭐⭐⭐ 1T params |
| Qwen3 32B | Groq | ⭐⭐⭐⭐⭐ |
| DeepSeek R1 | Groq | ⭐⭐⭐⭐⭐ |

### Deep Mode (Best quality)
| Model | Provider | Quality |
|---|---|---|
| Kimi K2 (1T MoE) | Groq | ⭐⭐⭐⭐⭐ |
| Gemini 2.5 Flash | Google | ⭐⭐⭐⭐⭐ |
| GPT-OSS 120B | Groq | ⭐⭐⭐⭐ |

---

## 🔑 API Keys Setup

### ZARURI (Required)
| Key | Kahan milega | Free? |
|---|---|---|
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) | ✅ Free |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/app/apikey) | ✅ Free |

### OPTIONAL (Recommended)
| Key | Kahan milega | Free? |
|---|---|---|
| `NEWSDATA_IO_KEY` | [newsdata.io](https://newsdata.io) | ✅ 200/day |
| `GNEWS_API_KEY` | [gnews.io](https://gnews.io/register) | ✅ 100/day |
| `TMDB_API_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | ✅ Free |
| `OMDB_API_KEY` | [omdbapi.com/apikey.aspx](http://www.omdbapi.com/apikey.aspx) | ✅ 1000/day |
| `OPENROUTER_FREE_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | ✅ Free models |
| `CEREBRAS_API_KEY` | [inference.cerebras.ai](https://inference.cerebras.ai) | ✅ Free |
| `SARVAM_API_KEY` | [app.sarvam.ai](https://app.sarvam.ai) | ✅ Free — Hindi TTS |
| `TOGETHER_API_KEY` | [api.together.ai](https://api.together.ai) | ✅ Free credits |
| `NVIDIA_API_KEY` | [build.nvidia.com](https://build.nvidia.com) | ✅ Free 40 RPM |
| `MOONSHOT_API_KEY` | [platform.moonshot.ai](https://platform.moonshot.ai) | ✅ Free trial |

### NO KEY NEEDED (Free APIs used internally)
- 🌤️ Weather: Open-Meteo
- 📈 Stocks: Yahoo Finance (NSE/BSE + Nifty/Sensex)
- ₿ Crypto: CoinGecko
- 🥇 Gold/Silver: GoldPrice.org
- 🎵 Music: Deezer + Jamendo
- 🌐 URL fetch: Jina AI Reader
- 🖼️ Images: Pollinations.ai (FLUX)

---

## 🛠️ Quick Start

```bash
# 1. Clone
git clone https://github.com/prashant998132-cpu/AppleV10.git
cd AppleV10

# 2. Install
npm install

# 3. Environment setup
cp .env.example .env.local
```

`.env.local` mein ye add karo (minimum):
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxx
GEMINI_API_KEY=AIxxxxxxxxxxxxxxxxx
```

```bash
# 4. Run
npm run dev
```

App chalega: [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Project Structure

```
AppleV10/
├── app/
│   ├── (dashboard)/
│   │   ├── chat/         → Main AI chat page
│   │   ├── voice/        → Voice mode (hold-to-speak)
│   │   ├── studio/       → Image + Music + Video generation
│   │   ├── goals/        → Goals + milestones
│   │   ├── memory/       → JARVIS ki memories
│   │   ├── analytics/    → Performance stats
│   │   ├── knowledge/    → Upload + analyze docs
│   │   ├── profile/      → XP, badges, level
│   │   ├── settings/     → APIs, security, preferences
│   │   ├── phone/        → Android phone control
│   │   ├── automation/   → MacroDroid integration
│   │   └── widget/       → Home screen widget
│   └── api/
│       ├── chat/stream/  → Main AI streaming endpoint
│       ├── tts/          → Text-to-speech (Sarvam Bulbul v3)
│       ├── stt/          → Speech-to-text (Groq Whisper Turbo)
│       ├── music/        → Music generation
│       ├── memory/       → Memory CRUD
│       └── upload/       → File analysis
├── components/
│   ├── dashboard/
│   │   └── DashboardClient.jsx  → Main layout + sidebar
│   └── chat/
│       ├── FloatingJarvis.jsx   → Floating chat button (every page)
│       ├── InlineWidgets.jsx    → Weather, Timer, Calculator widgets
│       └── WallpaperPicker.jsx  → Chat background picker
├── lib/
│   ├── ai/
│   │   ├── smart-router.js   → Multi-provider AI routing
│   │   ├── brain.js          → System prompts, all 8 personalities
│   │   ├── media-client.js   → TTS, image, music client-side
│   │   └── smart-context.js  → Time-based proactive suggestions
│   ├── db/
│   │   └── queries.js        → localStorage-based DB (Supabase optional)
│   └── config.js             → All API keys + app config
└── public/
    ├── sw.js                 → Service Worker (PWA, notifications)
    └── manifest.json         → PWA manifest
```

---

## 🧠 ARIA / Girlfriend Mode

Settings → AI & Voice → Personality → **ARIA (Girlfriend)**

- ARIA ka naam **Aira** hai — ek real ladki ki tarah respond karti hai
- Pink avatar (A), rose-colored chat background
- Hinglish mein baat karti hai — casual, warm, emotional
- Memory: `aria_ultra` localStorage key mein relationships track hoti hai
- Voice page pe "ARIA VOICE" mode — Aira ki awaaz mein baat karo

---

## 📱 PWA Installation (Android)

1. Chrome mein [apple-v10.vercel.app](https://apple-v10.vercel.app) kholo
2. Browser menu (3 dots) → **"Add to Home screen"**
3. Install karo
4. Home screen pe JARVIS icon aayega
5. Fullscreen app ki tarah chalega — no browser bar

---

## 🤖 AI Routing Logic

```
User message ─┬─ Flash mode  → Scout → GPT-OSS-20B → Flash-Lite → Cerebras
              ├─ Think mode  → Kimi K2 → Qwen3-32B → DeepSeek-R1
              ├─ Deep mode   → Kimi K2 → Gemini Flash → GPT-OSS-120B
              └─ Auto mode   → complexity detect → route accordingly
```

Agar ek provider fail kare ya limit hit ho, automatically next pe jaata hai.

---

## 🔧 Vercel Deployment

```bash
# Vercel CLI se
npm i -g vercel
vercel

# Ya GitHub pe push karo — auto deploy hota hai
```

**Environment Variables** Vercel Dashboard > Settings > Environment Variables mein sab keys add karo.

---

## 📊 Storage Architecture

```
Priority:  Supabase (optional) > Puter.js > IndexedDB > localStorage
```

**localStorage keys:**
| Key | Data |
|---|---|
| `jarvis_profile` | Name, city, personality, language |
| `jarvis_personality` | Current personality (standalone) |
| `jarvis_mode` | Last used AI mode |
| `jarvis_memories` | Saved memories |
| `jarvis_conversations` | Chat history list |
| `jarvis_msgs_{convId}` | Individual conversation messages |
| `jarvis_xp` | XP points |
| `jarvis_badges` | Earned badges |
| `jarvis_streak_days` | Daily streak count |
| `aria_ultra` | ARIA relationship memory |

---

## 🏆 Gamification

**10 Levels:**
```
Stranger (0) → Acquaintance (100) → Friend (300) → Buddy (600) → 
Homie (1000) → JARVIS Mode (2000) → Power User (4000) → 
Legend (8000) → Master (15000) → JARVIS Prime 👑 (30000)
```

**13 Badges:** first_chat, early_bird, night_owl, week_streak, goal_setter, goal_crusher, memory_keeper, chatterbox, deep_thinker, aria_friend, level5, level10, power_user

---

## 🔐 Security

- **Biometric Lock**: Android fingerprint API via WebAuthn
- **PIN Lock**: 4-digit fallback
- **Auto-lock**: 5 min inactivity ke baad
- No server-side auth required (localStorage-based)

---

## 🛡️ Golden Rules (Development)

1. ❌ No NEET references anywhere
2. ❌ No XP system changes
3. ❌ No hardcoded personal names (Prashant/Rewa)
4. ✅ Free APIs only — no paid services
5. ✅ HTML pusher only — never ZIP
6. ✅ Scan first, then code
7. ✅ Build fail = fix immediately
8. ✅ Personality always from client, never server localStorage

---

## 🔌 Integrations

| Integration | Status | Notes |
|---|---|---|
| MacroDroid | ✅ Working | Android automation via webhooks |
| WhatsApp | ✅ wa.me links | Direct message links |
| Google Search | ✅ Intent | Opens in browser |
| YouTube | ✅ Intent | Search + play |
| Spotify | 🔄 Partial | API sunset — Deezer preferred |
| GitHub | ⏳ Planned | Repo search |
| Telegram | ⏳ Planned | Bot integration |

---

## 📝 Tech Stack

| Tech | Version | Use |
|---|---|---|
| Next.js | 15.1.12 | Framework |
| React | 19 | UI |
| TailwindCSS | 3 | Styling |
| Lucide React | 0.383 | Icons |
| Groq SDK | — | AI inference |
| Supabase | — | Optional DB |

---

## 🤝 Contributing

1. Fork karo
2. Feature branch banao: `git checkout -b feature/AmazingFeature`
3. Commit karo: `git commit -m 'feat: Add AmazingFeature'`
4. Push karo: `git push origin feature/AmazingFeature`
5. Pull Request open karo

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

<div align="center">

**Made with ❤️ — JARVIS v11.3**

*"The best AI is the one that feels like a real friend."*

[Live Demo](https://apple-v10.vercel.app) • [Issues](https://github.com/prashant998132-cpu/AppleV10/issues)

</div>
