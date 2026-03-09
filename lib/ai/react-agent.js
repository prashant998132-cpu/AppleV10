// lib/ai/react-agent.js
// ReAct (Reason + Act) Agent — no LangChain needed
// Only activates for "deep" mode — complex multi-step queries
// v7: Added Tavily web search + Cerebras fast LLM support
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';

// Tool registry — safe, no side effects without user intent
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
      } catch {
        return 'Calculation failed — please rephrase';
      }
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
      if (!tavilyKey) return 'Web search not available — no Tavily key configured';
      try {
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tavilyKey}` },
          body: JSON.stringify({
            query:            input?.trim() || '',
            search_depth:     'basic',
            max_results:      3,
            include_answer:   true,
          }),
        });
        if (!r.ok) throw new Error(`Tavily: ${r.status}`);
        const d = await r.json();
        if (d.answer) return `Web search result: ${d.answer}`;
        const results = d.results?.slice(0, 3).map(r => `${r.title}: ${r.content?.slice(0, 150)}`).join(' | ');
        return results || 'No results found';
      } catch (e) {
        return `Web search failed: ${e.message}`;
      }
    },
  },
};

const TOOL_LIST = Object.entries(TOOL_REGISTRY)
  .map(([name, t]) => `- ${name}: ${t.desc}`)
  .join('\n');

// v8: Cerebras (3000t/s) → SambaNova (919t/s free) → Groq
async function callFastLLM(messages, groqKey, cerebrasKey, sambanovaKey) {
  // 1. Cerebras — 3000 t/s
  if (cerebrasKey) {
    try {
      const r = await fetch(CEREBRAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cerebrasKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b', messages, temperature: 0.3, max_tokens: 400 }),
      });
      if (r.ok) { const d = await r.json(); const t = d.choices?.[0]?.message?.content; if (t) return t; }
    } catch {}
  }
  // 2. SambaNova — 919 t/s free tier
  if (sambanovaKey) {
    try {
      const r = await fetch(`${SAMBANOVA_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sambanovaKey}` },
        body: JSON.stringify({ model: 'Meta-Llama-3.1-70B-Instruct', messages, temperature: 0.3, max_tokens: 400 }),
      });
      if (r.ok) { const d = await r.json(); const t = d.choices?.[0]?.message?.content; if (t) return t; }
    } catch {}
  }
  // 3. Groq fallback
  if (!groqKey) return '';
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({ model: 'llama3-70b-8192', messages, temperature: 0.3, max_tokens: 400, stop: ['Observation:', 'FINAL:'] }),
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// Main ReAct loop
export async function reactAgent({ message, profile, systemPrompt, agents, getGoals, groqKey, cerebrasKey, tavilyKey, sambanovaKey, maxSteps = 4 }) {
  if (!groqKey && !cerebrasKey && !sambanovaKey) return null;

  const startTime = Date.now();
  const history = [];
  let usedTools = [];

  const basePrompt = `${systemPrompt}

You are solving a complex query step by step.
AVAILABLE TOOLS:
${TOOL_LIST}

For each step, respond in EXACTLY this format:
THOUGHT: [your reasoning in 1-2 sentences]
ACTION: [tool_name or "none"]
INPUT: [tool input, or "none"]

When you have enough info to answer, respond:
THOUGHT: [final reasoning]
FINAL: [your complete answer in Hinglish, conversational tone]

User query: "${message}"`;

  for (let step = 0; step < maxSteps; step++) {
    const messages = [
      { role: 'user', content: basePrompt },
      ...history.map(h => ({ role: 'assistant', content: h.agent })),
      ...(history.length ? [{ role: 'user', content: `Observation: ${history[history.length-1].obs}` }] : []),
    ];

    let agentReply;
    try {
      agentReply = await callFastLLM(messages, groqKey, cerebrasKey);
    } catch {
      break;
    }

    if (!agentReply) break;

    // Check if final answer
    if (agentReply.includes('FINAL:')) {
      const final = agentReply.split('FINAL:').pop().trim();
      return {
        reply: final,
        steps: history.length,
        usedTools,
        timing: Date.now() - startTime,
      };
    }

    // Parse action
    const actionMatch = agentReply.match(/ACTION:\s*(\w+)/i);
    const inputMatch  = agentReply.match(/INPUT:\s*(.+)/i);
    const action = actionMatch?.[1]?.toLowerCase();
    const input  = inputMatch?.[1]?.trim().replace(/^"(.*)"$/, '$1');

    if (!action || action === 'none' || !TOOL_REGISTRY[action]) {
      // No valid tool — agent is ready to answer, do one more iteration
      history.push({ agent: agentReply, obs: 'No tool needed for this step' });
      continue;
    }

    // Execute tool
    let observation = '';
    try {
      observation = await TOOL_REGISTRY[action].fn(input, agents, getGoals, profile.userId, tavilyKey);
      usedTools.push(action);
    } catch (e) {
      observation = `Tool error: ${e.message}`;
    }

    history.push({ agent: agentReply, obs: observation });

    // Safety: if taking too long, bail
    if (Date.now() - startTime > 6000) break;
  }

  return null; // Could not complete — caller falls back to main LLM
}
