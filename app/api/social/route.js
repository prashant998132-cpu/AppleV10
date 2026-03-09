// app/api/social/route.js
import { getUser } from '@/lib/db/supabase';
import { postToInstagram, postToLinkedIn, createGmailDraft, addCalendarEvent, getCalendarEvents, getConnectedPlatforms, deleteToken } from '@/lib/oauth/social';

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case 'post_instagram': {
        const result = await postToInstagram(user.id, { imageUrl: body.imageUrl, caption: body.caption, hashtags: body.hashtags });
        return Response.json(result);
      }
      case 'post_linkedin': {
        const result = await postToLinkedIn(user.id, { text: body.text, imageUrl: body.imageUrl });
        return Response.json(result);
      }
      case 'gmail_draft': {
        const result = await createGmailDraft(user.id, { to: body.to, subject: body.subject, body: body.body });
        return Response.json(result);
      }
      case 'calendar_add': {
        const result = await addCalendarEvent(user.id, body.event);
        return Response.json(result);
      }
      case 'calendar_get': {
        const events = await getCalendarEvents(user.id, body.days || 7);
        return Response.json({ events });
      }
      case 'disconnect': {
        await deleteToken(user.id, body.platform);
        return Response.json({ success: true });
      }
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    if (e.message === 'TOKEN_EXPIRED') return Response.json({ error: 'token_expired', message: 'Reconnect karo Settings mein' }, { status: 401 });
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const platforms = await getConnectedPlatforms(user.id);
  return Response.json({ connected: platforms });
}
