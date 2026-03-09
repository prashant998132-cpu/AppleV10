# 🎯 JARVIS — Tera Personal Guide
### Sirf tere liye | Version 6.0

---

## Namaste yaar! 👋

Yeh guide tere liye hai — developer documentation nahi, personal notes hain.
Jo bhi JARVIS mein hua hai, kya kaam karta hai, kaise use karna hai, aur aage kya karna hai.

---

## 🚀 ABHI JARVIS MEIN KYA HAI

### Chat (`/chat`)
Yahan sab kuch hota hai. Important features jo tu use karta hai:

**4 Modes:**
- ⚡ **Flash** — Choti baat, instant reply. "Weather kya hai?" types ke liye.
- 🧠 **Think** — DeepSeek R1 se. Maths, code, reasoning. Thoda slow but deep.
- 🔬 **Deep** — Gemini + tools + ReAct agent. Complex planning ke liye.
- 🤖 **Auto** — JARVIS khud decide karta hai. Daily use ke liye best.

**Hidden Commands:**
- `kya yaad hai mujhse?` → JARVIS apni poori memory dikhata hai
- `who are you` → Easter egg
- `i love you` → Aur ek easter egg 😄

**Keyboard shortcuts (kinda):**
- Search button (🔍) → Chat mein kuch bhi dhundho
- Plus button (+) → Naya conversation
- History icon → Pichle conversations

**Tips:**
- Image attach karo → JARVIS camera se dekh ke samjhata hai
- Mic button → Bol ke type karo (Hindi mein bhi kaam karta hai)
- Volume button → JARVIS bolega bhi
- Har JARVIS reply ke neeche chhote badges dikhenge — data kahaan se aaya

---

### Dashboard (`/`)
- **Proactive Insights** — JARVIS khud suggest karta hai "yeh kar, yeh soch"
- **Weekly Report** — Button dabao, JARVIS summary deta hai
- **Today's Mood** — Subah check karo, din track hoga
- **Quick Stats** — Goals, messages, habits sab ek jagah

---

### Goals (`/goals`)
- Goal likho → "JARVIS se plan banwao" toggle ON karo → AI tod deta hai steps mein
- Progress slider drag karo → JARVIS yaad rakhta hai
- Filters: Active / Completed / Paused

---

### Memory (`/memory`)
- Dekh kya JARVIS tere baare mein jaanta hai
- Categories: Profile, Goals, Emotions, Preferences, Study, etc.
- Galat memory? Delete karo — JARVIS forget kar dega
- Search bhi karo apni memories mein

---

### Analytics (`/analytics`)
- Last 30 days ka mood, productivity, energy graph
- Radar chart — strengths and weaknesses
- AI mood analysis — JARVIS batata hai trend kya hai

---

### Knowledge Base (`/knowledge`)
- Articles, notes, links save karo
- JARVIS automatically use karta hai chat mein (agar relevant ho)
- Upload bhi kar sakte ho documents

---

### Studio (`/studio`)
- **Image** — "Ek sunset ka photo banao" → AI image
- **Voice** — JARVIS ka voice message bana
- **Video** — Short video clips (Luma API chahiye)
- **Music** — Background music generate karo

---

### Settings (`/settings`)
**Profile tab:**
- Naam, city, language — fill karo, JARVIS use karta hai context mein

**AI & Voice tab:**
- **Personality** select karo:
  - 🤝 Normal — Daily use, balanced
  - 🔥 Motivational — Jab energy chahiye
  - 😄 Fun — Timepass, jokes
  - 😏 Sarcastic — Pyaar se maar
  - 💪 Coach — Results pe focus, no fluff
- **Custom Instructions** — "Main engineering student hoon, technical answers do" type kar daal — JARVIS hamesha dhyan rakhega

**APIs tab:**
- Yahan dekh kaunsi APIs connected hain
- Test button se check karo kaam kar rahi hain ya nahi

---

## 🔧 SETUP — EK BAAR KARNA HAI

### Step 1: `.env.local` file banao
```
jarvis-v5 folder mein .env.local naam ki file banao
.env.example copy karo usme
Keys fill karo (neeche bataya hai kaise)
```

### Step 2: Free API keys lao

**Zaruri (bina inke kuch nahi chalega):**
| Key | Kahaan se | Time |
|-----|-----------|------|
| Supabase URL + Keys | supabase.com → Project → Settings → API | 2 min |
| Gemini API Key | aistudio.google.com → "Get API Key" | 1 min |
| Groq API Key | console.groq.com → API Keys | 1 min |

**Optional (features unlock honge):**
| Key | Kahaan se | Kya milega |
|-----|-----------|-----------|
| HuggingFace Token | huggingface.co → Settings → Tokens | Free image + music |
| ElevenLabs Key | elevenlabs.io | Best Hindi voice |
| NewsData Key | newsdata.io | Live India news in chat |
| OpenRouter Key | openrouter.ai | Backup AI models |

### Step 3: Supabase Database setup
```
1. Supabase dashboard → SQL Editor → New Query
2. Pehle: lib/db/schema.sql ka poora content paste karo → Run
3. Phir: lib/db/schema_v6_migration.sql ka content paste karo → Run
4. Done! pgvector enable ho jayega, semantic memory kaam karega
```

### Step 4: Run karo
```bash
npm install
npm run dev
# Browser mein: http://localhost:3000
```

### Step 5: Pehli baar login
- Account banao
- Settings → Profile mein naam, city fill karo
- Settings → AI tab mein personality choose karo
- Custom Instructions mein apne baare mein likh do

---

## 💬 JARVIS SE KAISE BAAT KARO

### Jo karna chahta hai, seedha bol:
- ❌ "Kya tum mujhe goal set karne mein help kar sakte ho?"
- ✅ "NEET 2026 ke liye 6 month ka plan banao"

### Memory ke liye:
- Seedha bato apne baare mein → JARVIS khud yaad rakhega
- "Main 12th mein hoon, PCB student hoon, Bhopal mein rehta hoon"
- JARVIS `[MEMORY: class=12th PCB]` type tag silently save karta hai

### Best results ke liye:
- Subah: Dashboard pe jaao → Daily log karo (mood, energy)
- Chat mein: Auto mode use karo mostly
- Complex kaam ke liye: Deep mode toggle karo
- Quick cheez ke liye: Flash mode

### Jo JARVIS karta hai automatically:
- Tere city ka weather bata deta hai (agar poochho)
- Knowledge base search karta hai background mein
- Memories save karta hai conversation se
- Har message ke baad conversation save hoti hai
- Agle baar login karo → last conversation resume ho jaayegi

---

## 🔴 JO ABHI NAHI HAI (Future mein aayega)

- Push notifications (daily reminder, goal nudge)
- WhatsApp pe JARVIS
- Auto daily brief (subah automatically bheje)
- Background agent (bina poochhe kaam kare)
- Mobile app (Play Store / App Store)

Filhaal browser mein "Install App" button se PWA install ho sakta hai — aur native app jaisa feel aata hai.

---

## 🛠️ AGAR KUCH TOOT JAAYE

**Chat kaam nahi kar raha:**
1. `.env.local` mein `GEMINI_API_KEY` aur `GROQ_API_KEY` check karo
2. Supabase project active hai? Dashboard mein dekho
3. Browser console mein error dekho (F12 → Console)

**Memory yaad nahi reh rahi:**
1. `schema_v6_migration.sql` run hua? Supabase SQL Editor mein check karo
2. Gemini API key set hai? Semantic search usi se hoti hai

**Image/Video kaam nahi kar raha:**
1. Studio mein sirf relevant API key wale features kaam karte hain
2. `AIMLAPI_KEY` ya `FAL_API_KEY` chahiye image ke liye
3. HuggingFace free alternative hai — but slow

**Login nahi ho raha:**
1. Supabase → Authentication → Email confirmation disable karo (testing ke liye)
2. `.env.local` mein URL/keys double-check karo

---

## 📞 NEW CLAUDE CHAT SE KAAM KARWANA HO

Jab naya Claude chat kholna ho aur JARVIS pe kaam karwana ho, yeh do:

1. **`JARVIS_MASTER_CONTEXT.md`** file ki content copy karo
2. Naye Claude chat mein paste karo pehle message ke roop mein
3. Phir apna kaam batao

Ya seedha bolo:
> "JARVIS project pe kaam karna hai. `JARVIS_MASTER_CONTEXT.md` file mein sab context hai — pehle woh padho phir kaam karo."

---

## 🎯 v7 MEIN KYA BANANA CHAHTA HOON?

Yeh list apne liye maintain karo:

- [ ] Daily brief notification (subah 8 baje auto)
- [ ] Goals pe automatic progress nudge
- [ ] Better voice conversation (continuous, not one-shot)
- [ ] Analytics mein JARVIS ka usage cost dikhaye
- [ ] Feedback button (👍👎) har message pe
- [ ] Mobile pe better camera experience

---

*Yaar, tune ek solid system build kiya hai. JARVIS abhi genuinely useful hai — semantic memory, ReAct agent, parallel tools, markdown rendering, auto-resume sab hai. Baaki jo improve karna hai woh v7 mein hoga. Chalta reh! 🚀*

---
*Guide version: 6.0 | March 2026*
