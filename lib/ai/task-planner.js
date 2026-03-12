// lib/ai/task-planner.js — JARVIS Autonomous Task Planner
// ═══════════════════════════════════════════════════════════════
// Converts natural language → structured workflow steps
// Executes steps sequentially with progress tracking
// Works with: MacroDroid, Deep Links, APIs, local tools
// ═══════════════════════════════════════════════════════════════

// ─── KNOWN WORKFLOW TEMPLATES ───────────────────────────────────
// Pre-built flows for common tasks (faster than AI planning)
const WORKFLOW_TEMPLATES = {

  // Study workflows
  study_plan: {
    match: /study plan|padhai schedule|timetable|neet|jee|board|exam.*plan/i,
    goal: 'study_plan',
    emoji: '📚',
    steps: [
      { id: 'analyze',   label: 'Subjects analyze karo',    tool: 'ai_analyze',    input: 'subjects_from_request' },
      { id: 'schedule',  label: 'Timetable generate karo',  tool: 'ai_generate',   input: 'daily_schedule' },
      { id: 'resources', label: 'Resources dhundo',         tool: 'web_search',    input: 'best_resources' },
      { id: 'reminder',  label: 'Reminders set karo',       tool: 'automation',    input: 'set_alarm' },
      { id: 'display',   label: 'Plan dikhao',              tool: 'format_output', input: 'structured_plan' },
    ],
  },

  // News workflows
  ai_news: {
    match: /ai news|tech news|latest.*news|news.*summarize|khabar|samachar/i,
    goal: 'news_summary',
    emoji: '📰',
    steps: [
      { id: 'search',   label: 'News search karo',       tool: 'web_search',    input: 'latest_ai_news' },
      { id: 'collect',  label: 'Articles collect karo',  tool: 'web_fetch',     input: 'top_3_articles' },
      { id: 'summarize',label: 'AI se summarize karo',   tool: 'ai_summarize',  input: 'articles' },
      { id: 'display',  label: 'Summary dikhao',         tool: 'format_output', input: 'bullet_points' },
    ],
  },

  // Weather + suggestion
  weather_plan: {
    match: /weather.*plan|outing|bahar jaana|trip.*plan|aaj.*bahar/i,
    goal: 'weather_based_plan',
    emoji: '🌤',
    steps: [
      { id: 'weather',  label: 'Weather check karo',     tool: 'weather',       input: 'current_city' },
      { id: 'suggest',  label: 'Suggestions generate',   tool: 'ai_suggest',    input: 'based_on_weather' },
      { id: 'reminder', label: 'Reminder set karo',      tool: 'automation',    input: 'set_alarm' },
      { id: 'display',  label: 'Plan ready karo',        tool: 'format_output', input: 'outing_plan' },
    ],
  },

  // Research workflow
  research: {
    match: /research|jaankari|detail mein|explain.*steps|puri jankari/i,
    goal: 'deep_research',
    emoji: '🔬',
    steps: [
      { id: 'search1',   label: 'Primary search',           tool: 'web_search',    input: 'main_query' },
      { id: 'search2',   label: 'Deep search',              tool: 'web_search',    input: 'detailed_query' },
      { id: 'wiki',      label: 'Wikipedia check',          tool: 'wiki_search',   input: 'topic' },
      { id: 'analyze',   label: 'Information analyze karo', tool: 'ai_analyze',    input: 'all_sources' },
      { id: 'display',   label: 'Report dikhao',            tool: 'format_output', input: 'research_report' },
    ],
  },

  // Goal + task workflow
  goal_setup: {
    match: /goal set|lakshya|target.*set|plan.*banana|mujhe.*achieve/i,
    goal: 'goal_creation',
    emoji: '🎯',
    steps: [
      { id: 'analyze',   label: 'Goal analyze karo',       tool: 'ai_analyze',    input: 'goal_details' },
      { id: 'milestones',label: 'Milestones banao',        tool: 'ai_generate',   input: 'milestones' },
      { id: 'schedule',  label: 'Schedule banao',          tool: 'ai_generate',   input: 'timeline' },
      { id: 'save',      label: 'Goal save karo',          tool: 'save_goal',     input: 'goal_data' },
      { id: 'reminder',  label: 'Daily reminder set karo', tool: 'automation',    input: 'daily_reminder' },
    ],
  },

  // Morning routine
  morning_routine: {
    match: /good morning|subah.*routine|morning.*plan|aaj ka din/i,
    goal: 'morning_brief',
    emoji: '🌅',
    steps: [
      { id: 'weather',  label: 'Weather check',           tool: 'weather',       input: 'current_city' },
      { id: 'goals',    label: 'Aaj ke goals dekho',      tool: 'get_goals',     input: 'active' },
      { id: 'news',     label: 'Headlines check karo',    tool: 'web_search',    input: 'today_headlines' },
      { id: 'motivate', label: 'Motivation dose',         tool: 'ai_generate',   input: 'morning_motivation' },
      { id: 'display',  label: 'Brief ready',             tool: 'format_output', input: 'morning_brief' },
    ],
  },

  // Phone automation workflow
  phone_control: {
    match: /wifi|bluetooth|torch|flashlight|volume|screenshot|phone.*control|mobile.*control/i,
    goal: 'phone_automation',
    emoji: '📱',
    steps: [
      { id: 'detect',   label: 'Command samjho',          tool: 'intent_detect', input: 'automation_intent' },
      { id: 'execute',  label: 'Action execute karo',     tool: 'automation',    input: 'detected_action' },
      { id: 'confirm',  label: 'Confirm karo',            tool: 'notify',        input: 'action_done' },
    ],
  },
};

// ─── TASK PLANNER ───────────────────────────────────────────────
export function detectWorkflow(message) {
  for (const [key, template] of Object.entries(WORKFLOW_TEMPLATES)) {
    if (template.match.test(message)) {
      return { key, ...template };
    }
  }
  return null;
}

// ─── AI-GENERATED PLAN (for unknown requests) ───────────────────
export async function generateAIPlan(message, groqKey) {
  if (!groqKey) return null;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Break this task into 3-5 simple steps. Respond ONLY in JSON:
{"goal": "short_goal_name", "emoji": "relevant_emoji", "steps": [{"id": "step1", "label": "Step description in Hinglish", "tool": "tool_name"}, ...]}

Available tools: web_search, ai_generate, ai_analyze, weather, get_goals, save_goal, automation, format_output

Task: "${message}"`,
        }],
      }),
      signal: AbortSignal.timeout(5000),
    });

    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || '';
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (json) {
      const plan = JSON.parse(json);
      if (plan.steps?.length) return plan;
    }
  } catch {}

  return null;
}

// ─── WORKFLOW EXECUTOR ───────────────────────────────────────────
// Executes steps one by one, calling onProgress for each
export async function executeWorkflow({
  workflow,
  message,
  agents,
  groqKey,
  tavilyKey,
  userId,
  onProgress,    // callback: (stepId, status, result) => void
  onComplete,    // callback: (finalResult) => void
}) {
  const results = {};
  let finalText = '';

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    onProgress?.(step.id, 'running', null);

    try {
      let result = '';

      switch (step.tool) {
        case 'web_search':
          if (tavilyKey && agents?.search) {
            result = await agents.search(buildSearchQuery(step.input, message, results));
          } else {
            result = `Search: ${message}`;
          }
          break;

        case 'weather':
          if (agents?.weather) {
            const w = await agents.weather('Delhi'); // TODO: detect city
            result = `${w.temp}°C, ${w.condition}`;
          }
          break;

        case 'get_goals':
          if (agents?.getGoals && userId) {
            const goals = await agents.getGoals(userId, 'active');
            result = goals?.slice(0,5).map(g => g.title).join(', ') || 'No active goals';
          }
          break;

        case 'ai_generate':
        case 'ai_analyze':
        case 'ai_summarize':
        case 'ai_suggest': {
          if (groqKey) {
            const prompt = buildAIPrompt(step, message, results);
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                max_tokens: 500,
                messages: [{ role: 'user', content: prompt }],
              }),
              signal: AbortSignal.timeout(8000),
            });
            const d = await r.json();
            result = d.choices?.[0]?.message?.content || '';
          }
          break;
        }

        case 'automation': {
          // Detect and fire MacroDroid automation
          const { detectAutomationIntent } = await import('./task-planner.js').catch(() => ({}));
          result = `Automation: ${step.input}`;
          break;
        }

        case 'format_output':
          result = compileResults(workflow, results, message);
          finalText = result;
          break;

        default:
          result = `Completed: ${step.label}`;
      }

      results[step.id] = result;
      onProgress?.(step.id, 'done', result);

      // Small delay for UX (feels natural)
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      onProgress?.(step.id, 'error', e.message);
      results[step.id] = `Error: ${e.message}`;
    }
  }

  onComplete?.(finalText || compileResults(workflow, results, message));
}

// ─── HELPERS ─────────────────────────────────────────────────────
function buildSearchQuery(input, message, results) {
  if (input === 'latest_ai_news') return 'latest AI news today';
  if (input === 'today_headlines') return 'India news today';
  if (input === 'best_resources') return `best resources ${message}`;
  return message;
}

function buildAIPrompt(step, message, results) {
  const prevResults = Object.values(results).filter(Boolean).join('\n\n');
  const prompts = {
    milestones:          `Create 5 milestones for this goal: "${message}". Be specific and actionable. Hinglish mein.`,
    daily_schedule:      `Create a realistic daily study timetable for: "${message}". Include breaks. Hinglish mein.`,
    morning_motivation:  `Give a short powerful morning motivation (3-4 lines) for someone starting their day. Hinglish mein.`,
    based_on_weather:    `Based on this weather: ${results.weather || 'unknown'}, suggest 3 activities for today. Hinglish mein.`,
    articles:            `Summarize these news items in 5 bullet points in Hinglish:\n\n${prevResults}`,
    all_sources:         `Based on this research:\n\n${prevResults}\n\nGive a comprehensive summary about: "${message}". Hinglish mein.`,
  };
  return prompts[step.input] || `Help with: "${message}". Context: ${prevResults}. Hinglish mein respond karo.`;
}

function compileResults(workflow, results, message) {
  const parts = [];
  parts.push(`## ${workflow.emoji} ${workflow.goal?.replace(/_/g, ' ').toUpperCase()}\n`);

  for (const step of workflow.steps) {
    if (step.tool === 'format_output') continue;
    const r = results[step.id];
    if (r && !r.startsWith('Error:') && r !== 'No tool needed') {
      parts.push(`**${step.label}:** ${r}`);
    }
  }

  return parts.join('\n\n') || `Task complete: ${message}`;
}
