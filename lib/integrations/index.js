// lib/integrations/index.js — JARVIS v10.1
// ═══════════════════════════════════════════════════════════════
// ALL External App Integrations
//
// Apps Connected:
//   🐙 GitHub        — repos, commits, issues, trending (NO KEY for public)
//   ▲  Vercel        — deployment status, build logs (VERCEL_TOKEN)
//   📅 Google Cal    — events read/write (GOOGLE_CAL_TOKEN)
//   📱 Telegram Bot  — send messages (TELEGRAM_BOT_TOKEN)
//   🎵 Spotify       — now playing, search (SPOTIFY_CLIENT_ID/SECRET)
//   📝 Notion        — pages read/write (NOTION_TOKEN)
//   ☁️  Google Drive  — files list/read (GOOGLE_ACCESS_TOKEN)
//   🤖 Reddit        — posts, memes, search (NO KEY needed)
//   📸 Pexels        — free photos/videos CDN URL (PEXELS_API_KEY)
//   🎬 Pixabay       — free photos/videos (PIXABAY_KEY optional)
//   🌐 Jina AI       — URL reader/summarizer (NO KEY)
//   🔔 Pushover      — Push notifications (PUSHOVER_TOKEN)
//   📊 Gist          — Notes/paste (GITHUB_TOKEN)
// ═══════════════════════════════════════════════════════════════

// ─── GITHUB ──────────────────────────────────────────────────────
export const github = {
  // Public API — No key needed for public repos
  async getUserRepos(username, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, { headers });
    const d = await r.json();
    return d.map(repo => ({
      name: repo.name,
      desc: repo.description,
      stars: repo.stargazers_count,
      lang: repo.language,
      url: repo.html_url,
      updated: repo.updated_at,
    }));
  },

  async getRepoCommits(owner, repo, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers });
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(c => ({
      sha: c.sha?.slice(0, 7),
      message: c.commit?.message?.slice(0, 80),
      author: c.commit?.author?.name,
      date: c.commit?.author?.date,
    }));
  },

  async getTrending(language = '', period = 'daily') {
    // Using ghapi.huchen.dev (free, no key)
    const lang = language ? `?language=${encodeURIComponent(language)}` : '';
    const r = await fetch(`https://api.gitterapp.com/repositories${lang}`);
    const d = await r.json();
    return (d || []).slice(0, 8).map(r => ({
      name: r.repositoryName,
      author: r.username,
      desc: r.description,
      stars: r.stargazersCount,
      url: `https://github.com/${r.username}/${r.repositoryName}`,
    }));
  },

  async getIssues(owner, repo, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=5`, { headers });
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(i => ({ number: i.number, title: i.title, labels: i.labels?.map(l => l.name), url: i.html_url }));
  },

  // Save text to GitHub Gist (notepad in cloud)
  async saveGist(content, filename = 'jarvis-note.md', token) {
    if (!token) return { error: 'GitHub token required for Gist' };
    const r = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ public: false, files: { [filename]: { content } } }),
    });
    const d = await r.json();
    return { url: d.html_url, id: d.id };
  },
};

// ─── VERCEL ──────────────────────────────────────────────────────
export const vercel = {
  async getDeployments(projectId, token) {
    if (!token) return { error: 'VERCEL_TOKEN required' };
    const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return (d.deployments || []).map(dep => ({
      uid: dep.uid,
      url: dep.url,
      state: dep.state,        // READY / ERROR / BUILDING / CANCELED
      created: new Date(dep.createdAt).toLocaleString('en-IN'),
      meta: dep.meta?.githubCommitMessage?.slice(0, 60),
    }));
  },

  async getLatestDeployment(projectId, token) {
    const deps = await vercel.getDeployments(projectId, token);
    return deps[0] || null;
  },

  async getBuildLogs(deploymentId, token) {
    if (!token) return { error: 'VERCEL_TOKEN required' };
    const r = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    const logs = (d || [])
      .filter(e => e.type === 'stdout' || e.type === 'stderr')
      .slice(-20)
      .map(e => `[${e.type}] ${e.text}`);
    return { logs, total: d.length };
  },

  async getProjectInfo(projectId, token) {
    if (!token) return { error: 'VERCEL_TOKEN required' };
    const r = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.json();
  },
};

// ─── GOOGLE CALENDAR ─────────────────────────────────────────────
export const googleCalendar = {
  async getTodayEvents(accessToken) {
    if (!accessToken) return { error: 'Google Calendar access token required. Connect in Settings.' };
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const d = await r.json();
    return (d.items || []).map(e => ({
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location,
      meet: e.hangoutLink,
    }));
  },

  async addEvent(accessToken, { title, start, end, description = '' }) {
    if (!accessToken) return { error: 'Google Calendar access token required.' };
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end || Date.now() + 3600000).toISOString() },
      }),
    });
    const d = await r.json();
    return { id: d.id, url: d.htmlLink, title: d.summary };
  },

  async getUpcomingEvents(accessToken, days = 7) {
    if (!accessToken) return { error: 'Google Calendar access token required.' };
    const now = new Date().toISOString();
    const end = new Date(Date.now() + days * 86400000).toISOString();
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const d = await r.json();
    return (d.items || []).map(e => ({
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
    }));
  },
};

// ─── TELEGRAM BOT ────────────────────────────────────────────────
export const telegram = {
  async sendMessage(botToken, chatId, text) {
    if (!botToken || !chatId) return { error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required' };
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const d = await r.json();
    return { success: d.ok, message_id: d.result?.message_id };
  },

  async sendReminder(botToken, chatId, message, scheduledTime) {
    // Immediate send (scheduling needs a cron/queue)
    return telegram.sendMessage(botToken, chatId, `🔔 *Reminder:* ${message}\n_Set for: ${scheduledTime}_`);
  },

  async getMe(botToken) {
    if (!botToken) return { error: 'No token' };
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const d = await r.json();
    return d.result;
  },
};

// ─── SPOTIFY ─────────────────────────────────────────────────────
export const spotify = {
  async getAccessToken(clientId, clientSecret) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const d = await r.json();
    return d.access_token;
  },

  async searchTrack(query, token) {
    const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return (d.tracks?.items || []).map(t => ({
      name: t.name,
      artist: t.artists?.map(a => a.name).join(', '),
      album: t.album?.name,
      preview: t.preview_url, // 30-second MP3 URL (free!)
      url: t.external_urls?.spotify,
      image: t.album?.images?.[0]?.url,
    }));
  },

  async getPlaylist(playlistId, token) {
    const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return (d.items || []).map(i => ({
      name: i.track?.name,
      artist: i.track?.artists?.[0]?.name,
      preview: i.track?.preview_url,
    }));
  },

  async getNewReleases(token, market = 'IN') {
    const r = await fetch(`https://api.spotify.com/v1/browse/new-releases?limit=5&market=${market}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return (d.albums?.items || []).map(a => ({
      name: a.name,
      artist: a.artists?.[0]?.name,
      url: a.external_urls?.spotify,
      image: a.images?.[0]?.url,
    }));
  },
};

// ─── NOTION ──────────────────────────────────────────────────────
export const notion = {
  async getPages(token) {
    if (!token) return { error: 'NOTION_TOKEN required — Get from notion.so/my-integrations' };
    const r = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 10 }),
    });
    const d = await r.json();
    return (d.results || []).map(p => ({
      id: p.id,
      title: p.properties?.title?.title?.[0]?.text?.content || p.properties?.Name?.title?.[0]?.text?.content || 'Untitled',
      url: p.url,
      created: p.created_time,
    }));
  },

  async createPage(token, databaseId, title, content = '') {
    if (!token) return { error: 'NOTION_TOKEN required' };
    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: content ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content } }] } }] : [],
      }),
    });
    const d = await r.json();
    return { id: d.id, url: d.url };
  },
};

// ─── GOOGLE DRIVE ────────────────────────────────────────────────
export const googleDrive = {
  async listFiles(accessToken, query = '') {
    if (!accessToken) return { error: 'Google Drive access token required. Connect in Settings.' };
    const q = query ? `&q=name+contains+'${query}'` : '';
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)${q}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const d = await r.json();
    return (d.files || []).map(f => ({
      name: f.name,
      type: f.mimeType,
      modified: f.modifiedTime,
      size: f.size ? `${Math.round(f.size / 1024)}KB` : 'N/A',
      url: f.webViewLink,
    }));
  },

  async readFile(fileId, accessToken) {
    if (!accessToken) return { error: 'Google access token required' };
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return r.text();
  },
};

// ─── REDDIT ──────────────────────────────────────────────────────
// NO KEY NEEDED — Public Reddit JSON API
export const reddit = {
  async getTopPosts(subreddit = 'india', limit = 5) {
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`, {
      headers: { 'User-Agent': 'JARVIS-Bot/1.0' },
    });
    const d = await r.json();
    return (d.data?.children || []).map(p => ({
      title: p.data?.title,
      url: p.data?.url,
      score: p.data?.score,
      comments: p.data?.num_comments,
      thumbnail: p.data?.thumbnail !== 'self' ? p.data?.thumbnail : null,
      reddit_url: `https://reddit.com${p.data?.permalink}`,
    }));
  },

  async searchPosts(query, subreddit = 'all', limit = 5) {
    const r = await fetch(
      `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`,
      { headers: { 'User-Agent': 'JARVIS-Bot/1.0' } }
    );
    const d = await r.json();
    return (d.data?.children || []).map(p => ({
      title: p.data?.title,
      url: `https://reddit.com${p.data?.permalink}`,
      score: p.data?.score,
    }));
  },

  async getMeme(subreddit = 'memes') {
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/random.json`, {
      headers: { 'User-Agent': 'JARVIS-Bot/1.0' },
    });
    const d = await r.json();
    const post = d?.[0]?.data?.children?.[0]?.data;
    return {
      title: post?.title,
      url: post?.url,
      score: post?.score,
      permalink: `https://reddit.com${post?.permalink}`,
    };
  },
};

// ─── PEXELS — Free stock photos/videos (CDN URL only) ────────────
export const pexels = {
  async searchPhotos(query, perPage = 5, apiKey) {
    if (!apiKey) {
      // Fallback: Picsum random photos (no key, always works)
      return Array.from({ length: perPage }, (_, i) => ({
        url: `https://picsum.photos/800/600?random=${Date.now() + i}`,
        thumb: `https://picsum.photos/400/300?random=${Date.now() + i}`,
        photographer: 'Random',
        source: 'Picsum (fallback)',
      }));
    }
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
      headers: { Authorization: apiKey },
    });
    const d = await r.json();
    return (d.photos || []).map(p => ({
      url: p.src?.large2x || p.src?.large,
      thumb: p.src?.medium,
      photographer: p.photographer,
      alt: p.alt,
    }));
  },

  async searchVideos(query, perPage = 3, apiKey) {
    if (!apiKey) {
      // Pixabay fallback (no key for some)
      return [{ note: 'Add PEXELS_API_KEY for free video search', search_url: `https://www.pexels.com/search/videos/${encodeURIComponent(query)}/` }];
    }
    const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
      headers: { Authorization: apiKey },
    });
    const d = await r.json();
    return (d.videos || []).map(v => ({
      url: v.video_files?.find(f => f.quality === 'hd')?.link || v.video_files?.[0]?.link,
      thumb: v.video_pictures?.[0]?.picture,
      duration: v.duration,
    }));
  },

  // Always works — Picsum random photos
  randomPhoto(width = 800, height = 600) {
    return { url: `https://picsum.photos/${width}/${height}?random=${Date.now()}` };
  },
};

// ─── JINA AI — URL Reader (No key for basic) ────────────────────
export const jinaReader = {
  async readUrl(url) {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'application/json' },
    });
    const d = await r.json();
    return {
      title: d.data?.title,
      content: d.data?.content?.slice(0, 2000),
      url: d.data?.url,
    };
  },
};

// ─── MEDIA STORAGE — Bandwidth-safe rules ────────────────────────
// ZERO binary proxying — all media returned as external URLs only
export const mediaRules = {
  image: {
    // Chain: Pollinations → Pexels → Picsum (all return URL, zero bytes)
    providers: ['pollinations', 'pexels', 'picsum'],
    maxSizeBytes: 0,       // Never proxy image binary
    returnType: 'url',
    note: 'Always CDN URL — never base64 unless <400KB and explicitly needed',
  },
  audio: {
    // Chain: Sarvam → ElevenLabs → Google → Azure → Pollinations → Browser
    providers: ['sarvam', 'elevenlabs', 'google', 'azure', 'pollinations_audio', 'browser'],
    maxBase64Bytes: 200000, // <200KB base64 OK
    returnType: 'url_or_base64',
    note: 'base64 only if <200KB — else return URL or useBrowser:true',
  },
  video: {
    // NEVER proxy video — return external URL only
    providers: ['youtube_embed', 'pexels_url', 'pixabay_url'],
    maxSizeBytes: 0,
    returnType: 'url',
    note: 'NEVER proxy video binary — Vercel limit will die instantly',
  },
  music: {
    providers: ['spotify_preview', 'jamendo_url', 'youtube_url', 'soundcloud_url'],
    maxSizeBytes: 0,
    returnType: 'url',
    note: 'External URL only — Spotify 30s preview MP3 URLs are OK (external)',
  },
};

// ─── INTEGRATION HEALTH CHECK ─────────────────────────────────────
export async function checkAllIntegrations(keys = {}) {
  const results = {};

  // GitHub — always works (public API)
  try {
    const r = await fetch('https://api.github.com/rate_limit', {
      headers: keys.GITHUB_TOKEN ? { Authorization: `Bearer ${keys.GITHUB_TOKEN}` } : {},
    });
    const d = await r.json();
    results.github = { ok: true, remaining: d.rate?.remaining, limit: d.rate?.limit };
  } catch { results.github = { ok: false }; }

  // Vercel
  if (keys.VERCEL_TOKEN) {
    try {
      const r = await fetch('https://api.vercel.com/v2/user', { headers: { Authorization: `Bearer ${keys.VERCEL_TOKEN}` } });
      const d = await r.json();
      results.vercel = { ok: r.ok, user: d.user?.email };
    } catch { results.vercel = { ok: false }; }
  } else results.vercel = { ok: false, reason: 'No VERCEL_TOKEN' };

  // Telegram
  if (keys.TELEGRAM_BOT_TOKEN) {
    try {
      const info = await telegram.getMe(keys.TELEGRAM_BOT_TOKEN);
      results.telegram = { ok: true, bot: info?.username };
    } catch { results.telegram = { ok: false }; }
  } else results.telegram = { ok: false, reason: 'No TELEGRAM_BOT_TOKEN' };

  // Spotify
  if (keys.SPOTIFY_CLIENT_ID && keys.SPOTIFY_CLIENT_SECRET) {
    try {
      const token = await spotify.getAccessToken(keys.SPOTIFY_CLIENT_ID, keys.SPOTIFY_CLIENT_SECRET);
      results.spotify = { ok: !!token };
    } catch { results.spotify = { ok: false }; }
  } else results.spotify = { ok: false, reason: 'No SPOTIFY credentials' };

  // Reddit — always works
  try {
    const r = await fetch('https://www.reddit.com/r/india/hot.json?limit=1', { headers: { 'User-Agent': 'JARVIS/1.0' } });
    results.reddit = { ok: r.ok };
  } catch { results.reddit = { ok: false }; }

  return results;
}
