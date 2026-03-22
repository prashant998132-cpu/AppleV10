// lib/ai/react-agent.js — JARVIS v11 ReAct Agent
// ══════════════════════════════════════════════════════════════
// Think → Act → Observe → loop (max 5 steps)
// More tools, smarter routing
// ══════════════════════════════════════════════════════════════

const TOOL_REGISTRY = {
  weather: {
    desc: 'Get current weather. Input: city name (e.g. "Delhi")',
    fn: async (input, agents) => {
      const w = await agents.weather(input?.trim() || 'Delhi');
      return `${w.temp}°C, ${w.condition}, wind ${w.wind}km/h in ${w.city}`;
    },
  },
  quote: {
    desc: 'Get an inspirational quote. Input: topic or "any"',
    fn: async (_, agents) => {
      const q = await agents.quote();
      return `"${q.content}" — ${q.author}`;
    },
  },
  calculate: {
    desc: 'Safe math calculation. Input: math expression (e.g. "15% of 50000")',
    fn: async (input) => {
      try {
        const clean = input.replace(/[^0-9+\-*/.()%, ]/g, '');
        const withPercent = clean.replace(/(\d+)%\s*of\s*(\d+)/g, '($1/100)*$2');
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${withPercent})`)();
        return `Result: ${result}`;
      } catch { return 'Calculation failed — please rephrase'; }
    },
  },
  recall_goals: {
    desc: 'Get user active goals. Input: none needed',
    fn: async (_, __, getGoals, userId) => {
      try {
        const goals = await getGoals(userId, 'active');
        if (!goals?.length) return 'No active goals found';
        return goals.slice(0,5).map(g => `${g.title} (${g.progress}% done)`).join(', ');
      } catch { return 'Could not load goals'; }
    },
  },
  web_search: {
    desc: 'Search the internet for current info. Input: search query string',
    fn: async (input, _agents, _getGoals, _userId, tavilyKey) => {
      if (!tavilyKey) return 'Web search not available — no Tavily key';
      try {
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tavilyKey}` },
          body: JSON.stringify({ query: input?.trim() || '', search_depth: 'basic', max_results: 3, include_answer: true }),
        });
        if (!r.ok) throw new Error(`Tavily: ${r.status}`);
        const d = await r.json();
        if (d.answer) return `Web search result: ${d.answer}`;
        return d.results?.slice(0, 3).map(r => `${r.title}: ${r.content?.slice(0, 150)}`).join(' | ') || 'No results';
      } catch (e) { return `Web search failed: ${e.message}`; }
    },
  },
  // NEW: Currency conversion (free API)
  currency: {
    desc: 'Convert currency. Input: "100 USD to INR" or "50 EUR to USD"',
    fn: async (input) => {
      try {
        const m = input.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s*(?:to|in)\s*([A-Z]{3})/i);
        if (!m) return 'Format: "100 USD to INR"';
        const [, amount, from, to] = m;
        const r = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`);
        const d = await r.json();
        const rate = d.rates[to.toUpperCase()];
        if (!rate) return `Rate not found for ${to}`;
        const result = (parseFloat(amount) * rate).toFixed(2);
        return `${amount} ${from.toUpperCase()} = ₹${result} ${to.toUpperCase()} (rate: ${rate.toFixed(4)})`;
      } catch { return 'Currency conversion failed'; }
    },
  },
  // NEW: Wikipedia summary (free)
  wikipedia: {
    desc: 'Get Wikipedia summary for any topic. Input: topic name',
    fn: async (input) => {
      try {
        const term = encodeURIComponent(input?.trim() || '');
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${term}`);
        if (!r.ok) return `No Wikipedia article found for "${input}"`;
        const d = await r.json();
        return `${d.title}: ${d.extract?.slice(0, 300)}...`;
      } catch { return 'Wikipedia lookup failed'; }
    },
  },
  // NEW: Time in any city (free)
  time: {
    desc: 'Get current time in any city/timezone. Input: city or timezone (e.g. "Tokyo", "New York")',
    fn: async (input) => {
      const TZ_MAP = {
        'new york': 'America/New_York', 'london': 'Europe/London', 'tokyo': 'Asia/Tokyo',
        'dubai': 'Asia/Dubai', 'sydney': 'Australia/Sydney', 'paris': 'Europe/Paris',
        'delhi': 'Asia/Kolkata', 'mumbai': 'Asia/Kolkata', 'singapore': 'Asia/Singapore',
        'beijing': 'Asia/Shanghai', 'moscow': 'Europe/Moscow', 'berlin': 'Europe/Berlin',
      };
      const city = input?.toLowerCase().trim() || 'delhi';
      const tz = TZ_MAP[city] || 'Asia/Kolkata';
      const time = new Date().toLocaleString('en-IN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true, weekday: 'short' });
      return `${input}: ${time}`;
    },
  },
  // NEW: Unit converter (no API needed)
  convert_units: {
    desc: 'Convert units. Input: "5 kg to lbs", "100 km to miles", "30 celsius to fahrenheit"',
    fn: async (input) => {
      try {
        const conversions = {
          'kg to lbs': (v) => `${v} kg = ${(v * 2.20462).toFixed(2)} lbs`,
          'lbs to kg': (v) => `${v} lbs = ${(v / 2.20462).toFixed(2)} kg`,
          'km to miles': (v) => `${v} km = ${(v * 0.621371).toFixed(2)} miles`,
          'miles to km': (v) => `${v} miles = ${(v / 0.621371).toFixed(2)} km`,
          'celsius to fahrenheit': (v) => `${v}°C = ${(v * 9/5 + 32).toFixed(1)}°F`,
          'fahrenheit to celsius': (v) => `${v}°F = ${((v - 32) * 5/9).toFixed(1)}°C`,
          'cm to inches': (v) => `${v} cm = ${(v / 2.54).toFixed(2)} inches`,
          'inches to cm': (v) => `${v} inches = ${(v * 2.54).toFixed(2)} cm`,
          'meter to feet': (v) => `${v} m = ${(v * 3.28084).toFixed(2)} ft`,
          'feet to meter': (v) => `${v} ft = ${(v / 3.28084).toFixed(2)} m`,
          'litre to gallon': (v) => `${v} L = ${(v * 0.264172).toFixed(3)} gallons`,
          'ml to oz': (v) => `${v} ml = ${(v * 0.033814).toFixed(2)} oz`,
        };
        const lower = input.toLowerCase();
        const numMatch = input.match(/(\d+(?:\.\d+)?)/);
        if (!numMatch) return 'Format: "5 kg to lbs"';
        const val = parseFloat(numMatch[1]);
        for (const [key, fn] of Object.entries(conversions)) {
          if (lower.includes(key.split(' ')[0]) && lower.includes(key.split(' ')[2])) {
            return fn(val);
          }
        }
        return `Conversion not found. Supported: kg/lbs, km/miles, celsius/fahrenheit, cm/inches`;
      } catch { return 'Conversion failed'; }
    },
  },
  // NEW: Random facts (free API)
  fun_fact: {
    desc: 'Get a random interesting fact. Input: topic (math/science/history/any)',
    fn: async (input) => {
      try {
        const topic = input?.toLowerCase() || 'any';
        const url = topic === 'math' ? 'http://numbersapi.com/random/math?json'
          : topic === 'date' ? `http://numbersapi.com/${new Date().getMonth()+1}/${new Date().getDate()}/date?json`
          : 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en';
        const r = await fetch(url);
        const d = await r.json();
        return d.text || d.fact || 'Could not get fact';
      } catch { return 'Fun fact service unavailable'; }
    },
  },
};

const TOOL_LIST = Object.entries(TOOL_REGISTRY)
  .map(([name, t]) => `- ${name}: ${t.desc}`)
  .join('\n');

// ─── SYSTEM PROMPT ────────────────────────────────────────────────
function buildReActPrompt(message, profile, systemPrompt) {
  return `${systemPrompt}

You have access to these tools:
${TOOL_LIST}

CRITICAL RULES:
- Only use tools when genuinely needed (don't use tool for simple questions)
- Max 2 tool calls per response
- After observations, give a natural conversational reply

Use this format:
Thought: [brief reasoning]
Action: tool_name
Input: tool input

Or if no tool needed:
Thought: I can answer directly
Action: none
Input: none

Then after observations:
Answer: [your natural response to "${message}"]`;
}

// ─── GROQ CALL ────────────────────────────────────────────────────
async function callGroq(messages, system, key, model = 'meta-llama/llama-4-scout-17b-16e-instruct') {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.3,
      max_tokens: 600,
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// ─── PARSE AGENT RESPONSE ─────────────────────────────────────────
function parseAgentResponse(text) {
  const action = text.match(/Action:\s*(\w+)/i)?.[1]?.trim();
  const input  = text.match(/Input:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
  const answer = text.match(/Answer:\s*([\s\S]+?)(?:\n\n|$)/i)?.[1]?.trim();
  return { action, input, answer };
}

// ─── MAIN REACT LOOP ──────────────────────────────────────────────
export async function reactAgent({ message, profile, systemPrompt, agents, getGoals, groqKey, cerebrasKey, tavilyKey, maxSteps = 5 }) {
  const key = groqKey || cerebrasKey;
  if (!key) return null;

  const agentSystem = buildReActPrompt(message, profile, systemPrompt);
  const messages = [{ role: 'user', content: message }];
  const usedTools = [];
  const steps = [];
  let finalReply = '';

  try {
    for (let step = 0; step < maxSteps; step++) {
      const response = await callGroq(messages, agentSystem, key);
      steps.push(response);

      const { action, input, answer } = parseAgentResponse(response);

      // Final answer
      if (!action || action === 'none' || answer) {
        finalReply = answer || response.replace(/Thought:.*\n?|Action:.*\n?|Input:.*\n?/gi, '').trim();
        break;
      }

      if (!TOOL_REGISTRY[action]) {
        finalReply = response;
        break;
      }

      // Execute tool
      let observation;
      try {
        observation = await TOOL_REGISTRY[action].fn(input, agents, getGoals, profile?.userId, tavilyKey);
        usedTools.push(action);
      } catch (e) {
        observation = `Tool error: ${e.message}`;
      }

      messages.push({ role: 'assistant', content: response });
      messages.push({ role: 'user', content: `Observation: ${observation}\n\nNow give your final Answer:` });

      // Max 2 tool calls
      if (usedTools.length >= 2) {
        const finalResponse = await callGroq(messages, agentSystem, key);
        const { answer: finalAns } = parseAgentResponse(finalResponse);
        finalReply = finalAns || finalResponse.replace(/Thought:.*\n?|Action:.*\n?|Input:.*\n?/gi, '').trim();
        break;
      }
    }

    if (!finalReply) return null;

    return { reply: finalReply, usedTools, steps: steps.length };

  } catch (e) {
    console.error('[reactAgent]', e.message);
    return null;
  }
}
