// app/api/video/route.js
import { getKeys } from '@/lib/config';
import { getUser } from '@/lib/db/supabase';
import { generateVideo, pollVideoJob } from '@/lib/ai/video';


export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt, duration = 5, action, jobId, provider } = await req.json();

  try {
    // Poll existing job
    if (action === 'poll' && jobId) {
      const result = await pollVideoJob(jobId, provider, KEYS);
      return Response.json(result);
    }

    // Start new generation
    if (!prompt?.trim()) return Response.json({ error: 'Prompt required' }, { status: 400 });
    const job = await generateVideo(prompt, KEYS, { duration });
    // Remove pollFn (not serializable)
    const { pollFn, ...jobData } = job;
    return Response.json(jobData);

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
