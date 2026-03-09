// app/api/integrations/route.js — JARVIS v10.1
// ═══════════════════════════════════════════════════════════════
// API route for all app integrations
// GET  /api/integrations         → health check for all apps
// POST /api/integrations         → execute integration action
// ═══════════════════════════════════════════════════════════════
import { getUser } from '@/lib/db/supabase';
import { getKeys } from '@/lib/config';
import {
  github, vercel, googleCalendar, telegram,
  spotify, notion, googleDrive, reddit, pexels, jinaReader,
  checkAllIntegrations,
} from '@/lib/integrations';

export const runtime = 'nodejs';

// GET — Health check all integrations
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = getKeys();
  const health = await checkAllIntegrations(keys);
  return Response.json({ health, timestamp: new Date().toISOString() });
}

// POST — Execute any integration
export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { app, action, params = {} } = await req.json();
  if (!app || !action) return Response.json({ error: 'app and action required' }, { status: 400 });

  const keys = getKeys();
  const start = Date.now();

  try {
    let result;

    switch (app) {

      // ── GITHUB ─────────────────────────────────────────────
      case 'github':
        switch (action) {
          case 'repos':     result = await github.getUserRepos(params.username || 'prashant998132-cpu', keys.GITHUB_TOKEN); break;
          case 'commits':   result = await github.getRepoCommits(params.owner, params.repo, keys.GITHUB_TOKEN); break;
          case 'trending':  result = await github.getTrending(params.language, params.period); break;
          case 'issues':    result = await github.getIssues(params.owner, params.repo, keys.GITHUB_TOKEN); break;
          case 'save_gist': result = await github.saveGist(params.content, params.filename, keys.GITHUB_TOKEN); break;
          default: result = { error: `Unknown github action: ${action}` };
        }
        break;

      // ── VERCEL ─────────────────────────────────────────────
      case 'vercel':
        switch (action) {
          case 'deployments': result = await vercel.getDeployments(params.projectId || process.env.VERCEL_PROJECT_ID, keys.VERCEL_TOKEN); break;
          case 'latest':      result = await vercel.getLatestDeployment(params.projectId || process.env.VERCEL_PROJECT_ID, keys.VERCEL_TOKEN); break;
          case 'logs':        result = await vercel.getBuildLogs(params.deploymentId, keys.VERCEL_TOKEN); break;
          case 'project':     result = await vercel.getProjectInfo(params.projectId || process.env.VERCEL_PROJECT_ID, keys.VERCEL_TOKEN); break;
          default: result = { error: `Unknown vercel action: ${action}` };
        }
        break;

      // ── GOOGLE CALENDAR ─────────────────────────────────────
      case 'calendar':
        switch (action) {
          case 'today':    result = await googleCalendar.getTodayEvents(params.token || keys.GOOGLE_ACCESS_TOKEN); break;
          case 'upcoming': result = await googleCalendar.getUpcomingEvents(params.token || keys.GOOGLE_ACCESS_TOKEN, params.days); break;
          case 'add':      result = await googleCalendar.addEvent(params.token || keys.GOOGLE_ACCESS_TOKEN, params); break;
          default: result = { error: `Unknown calendar action: ${action}` };
        }
        break;

      // ── TELEGRAM ─────────────────────────────────────────────
      case 'telegram':
        switch (action) {
          case 'send':     result = await telegram.sendMessage(keys.TELEGRAM_BOT_TOKEN, params.chatId || keys.TELEGRAM_CHAT_ID, params.text); break;
          case 'reminder': result = await telegram.sendReminder(keys.TELEGRAM_BOT_TOKEN, params.chatId || keys.TELEGRAM_CHAT_ID, params.message, params.time); break;
          case 'info':     result = await telegram.getMe(keys.TELEGRAM_BOT_TOKEN); break;
          default: result = { error: `Unknown telegram action: ${action}` };
        }
        break;

      // ── SPOTIFY ──────────────────────────────────────────────
      case 'spotify': {
        let spotToken;
        try { spotToken = await spotify.getAccessToken(keys.SPOTIFY_CLIENT_ID, keys.SPOTIFY_CLIENT_SECRET); } catch { }
        switch (action) {
          case 'search':   result = await spotify.searchTrack(params.query, spotToken); break;
          case 'new':      result = await spotify.getNewReleases(spotToken, params.market || 'IN'); break;
          case 'playlist': result = await spotify.getPlaylist(params.playlistId, spotToken); break;
          default: result = { error: `Unknown spotify action: ${action}` };
        }
        break;
      }

      // ── NOTION ───────────────────────────────────────────────
      case 'notion':
        switch (action) {
          case 'pages':  result = await notion.getPages(keys.NOTION_TOKEN); break;
          case 'create': result = await notion.createPage(keys.NOTION_TOKEN, params.databaseId, params.title, params.content); break;
          default: result = { error: `Unknown notion action: ${action}` };
        }
        break;

      // ── GOOGLE DRIVE ─────────────────────────────────────────
      case 'drive':
        switch (action) {
          case 'list': result = await googleDrive.listFiles(keys.GOOGLE_ACCESS_TOKEN, params.query); break;
          case 'read': result = await googleDrive.readFile(params.fileId, keys.GOOGLE_ACCESS_TOKEN); break;
          default: result = { error: `Unknown drive action: ${action}` };
        }
        break;

      // ── REDDIT ───────────────────────────────────────────────
      case 'reddit':
        switch (action) {
          case 'hot':    result = await reddit.getTopPosts(params.subreddit || 'india', params.limit || 5); break;
          case 'search': result = await reddit.searchPosts(params.query, params.subreddit || 'all'); break;
          case 'meme':   result = await reddit.getMeme(params.subreddit || 'memes'); break;
          default: result = { error: `Unknown reddit action: ${action}` };
        }
        break;

      // ── PEXELS ───────────────────────────────────────────────
      case 'pexels':
        switch (action) {
          case 'photos': result = await pexels.searchPhotos(params.query, params.perPage, keys.PEXELS_API_KEY); break;
          case 'videos': result = await pexels.searchVideos(params.query, params.perPage, keys.PEXELS_API_KEY); break;
          case 'random': result = pexels.randomPhoto(params.width, params.height); break;
          default: result = { error: `Unknown pexels action: ${action}` };
        }
        break;

      // ── JINA URL READER ──────────────────────────────────────
      case 'jina':
        switch (action) {
          case 'read': result = await jinaReader.readUrl(params.url); break;
          default: result = { error: `Unknown jina action: ${action}` };
        }
        break;

      default:
        result = { error: `Unknown app: ${app}`, available: ['github', 'vercel', 'calendar', 'telegram', 'spotify', 'notion', 'drive', 'reddit', 'pexels', 'jina'] };
    }

    return Response.json({ app, action, result, latency_ms: Date.now() - start });
  } catch (e) {
    console.error(`Integration error [${app}/${action}]:`, e);
    return Response.json({ error: e.message, app, action }, { status: 500 });
  }
}
