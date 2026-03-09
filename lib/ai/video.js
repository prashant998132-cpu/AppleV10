import { tFetch } from '../utils/fetch.js';
// lib/ai/video.js
// ═══════════════════════════════════════════════════════════════
// JARVIS v5 — Video Generation Engine
// Chain: Luma Dream Machine → Kling AI → Hailuo/MiniMax
// Background job pattern — mobile doesn't block
// ═══════════════════════════════════════════════════════════════

// ─── LUMA DREAM MACHINE ──────────────────────────────────────
async function videoViaLuma(prompt, apiKey, duration = 5) {
  if (!apiKey) throw new Error('No Luma key');

  // Submit generation job
  const r = await tFetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '16:9',
      loop: false,
      keyframes: {
        frame0: { type: 'generation', id: null },
      }
    })
  }, 15000);

  const d = await r.json();
  if (!d.id) throw new Error('Luma: no job ID');

  return {
    jobId: d.id,
    provider: 'Luma Dream Machine',
    status: 'pending',
    pollFn: () => pollLuma(d.id, apiKey),
  };
}

async function pollLuma(jobId, apiKey) {
  const r = await tFetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  }, 10000);
  const d = await r.json();

  if (d.state === 'completed') {
    return { status: 'done', url: d.assets?.video, thumbnail: d.assets?.image, provider: 'Luma Dream Machine' };
  } else if (d.state === 'failed') {
    return { status: 'failed', error: d.failure_reason };
  }
  return { status: 'pending', progress: d.state };
}

// ─── KLING AI ────────────────────────────────────────────────
async function videoViaKling(prompt, apiKey, duration = 5) {
  if (!apiKey) throw new Error('No Kling key');

  const r = await tFetch('https://api.klingai.com/v1/videos/text2video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      prompt,
      model: 'kling-v1',
      duration: Math.min(duration, 10),
      aspect_ratio: '16:9',
      mode: 'standard',
    })
  }, 15000);

  const d = await r.json();
  if (!d.data?.task_id) throw new Error('Kling: no task ID');

  return {
    jobId: d.data.task_id,
    provider: 'Kling AI',
    status: 'pending',
    pollFn: () => pollKling(d.data.task_id, apiKey),
  };
}

async function pollKling(taskId, apiKey) {
  const r = await tFetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  }, 10000);
  const d = await r.json();
  const task = d.data;

  if (task?.task_status === 'succeed') {
    return { status: 'done', url: task.task_result?.videos?.[0]?.url, provider: 'Kling AI' };
  } else if (task?.task_status === 'failed') {
    return { status: 'failed', error: task.task_status_msg };
  }
  return { status: 'pending', progress: task?.task_status };
}

// ─── HAILUO / MINIMAX ────────────────────────────────────────
async function videoViaHailuo(prompt, apiKey, groupId) {
  if (!apiKey || !groupId) throw new Error('No Hailuo keys');

  const r = await tFetch(`https://api.minimax.chat/v1/video_generation?GroupId=${groupId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'video-01', prompt })
  }, 15000);

  const d = await r.json();
  if (!d.task_id) throw new Error('Hailuo: no task ID');

  return {
    jobId: d.task_id,
    provider: 'Hailuo (MiniMax)',
    status: 'pending',
    pollFn: () => pollHailuo(d.task_id, apiKey, groupId),
  };
}

async function pollHailuo(taskId, apiKey, groupId) {
  const r = await tFetch(`https://api.minimax.chat/v1/query/video_generation?task_id=${taskId}&GroupId=${groupId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  }, 10000);
  const d = await r.json();

  if (d.status === 'Success') {
    return { status: 'done', url: d.file_id, provider: 'Hailuo' };
  } else if (d.status === 'Fail') {
    return { status: 'failed' };
  }
  return { status: 'pending' };
}

// ─── MAIN VIDEO GENERATION ───────────────────────────────────
export async function generateVideo(prompt, keys = {}, options = {}) {
  const { duration = 5 } = options;

  const chain = [
    { name: 'luma',   fn: () => videoViaLuma(prompt, keys.LUMA_API_KEY, duration),                       enabled: !!keys.LUMA_API_KEY },
    { name: 'kling',  fn: () => videoViaKling(prompt, keys.KLING_API_KEY, duration),                      enabled: !!keys.KLING_API_KEY },
    { name: 'hailuo', fn: () => videoViaHailuo(prompt, keys.HAILUO_API_KEY, keys.HAILUO_GROUP_ID),        enabled: !!(keys.HAILUO_API_KEY && keys.HAILUO_GROUP_ID) },
  ];

  for (const p of chain) {
    if (!p.enabled) continue;
    try {
      const job = await p.fn();
      return job; // Returns job object with pollFn — caller handles polling
    } catch (e) {
      console.warn(`Video ${p.name} failed:`, e.message);
    }
  }

  // No video API available
  return {
    status: 'unavailable',
    message: 'Video generation ke liye Luma/Kling API key chahiye. Settings mein add karo!',
    links: [
      { name: 'Luma Dream Machine', url: 'https://lumalabs.ai' },
      { name: 'Kling AI', url: 'https://klingai.com' },
      { name: 'Runway Gen-3', url: 'https://runwayml.com' },
    ]
  };
}

// ─── POLL JOB (called every 5s from frontend) ─────────────────
export async function pollVideoJob(jobId, provider, keys = {}) {
  try {
    if (provider === 'Luma Dream Machine' && keys.LUMA_API_KEY) return pollLuma(jobId, keys.LUMA_API_KEY);
    if (provider === 'Kling AI' && keys.KLING_API_KEY) return pollKling(jobId, keys.KLING_API_KEY);
    if (provider === 'Hailuo (MiniMax)' && keys.HAILUO_API_KEY) return pollHailuo(jobId, keys.HAILUO_API_KEY, keys.HAILUO_GROUP_ID);
  } catch (e) {
    return { status: 'error', error: e.message };
  }
  return { status: 'unknown' };
}

