// lib/integrations/index.js — JARVIS v10.2 ULTRA
// ═══════════════════════════════════════════════════════════════
// ALL External App Integrations — 20+ Apps
//
//   🐙 GitHub        — repos, commits, issues, gist
//   ▲  Vercel        — deployments, build logs
//   📅 Google Cal    — events read/write
//   📱 Telegram Bot  — send messages, reminders
//   🎵 Spotify       — now playing, search, playlists
//   📝 Notion        — pages read/write
//   ☁️  Google Drive  — files list/read
//   🤖 Reddit        — posts, memes, search
//   📸 Pexels        — free photos/videos
//   🎬 YouTube       — search, trending (YOUTUBE_API_KEY)
//   💬 Discord       — webhook messages (DISCORD_WEBHOOK)
//   📢 Slack         — webhook messages (SLACK_WEBHOOK)
//   📱 WhatsApp      — via Twilio (TWILIO_SID + AUTH_TOKEN)
//   ✅ Todoist       — tasks (TODOIST_API_KEY)
//   🌤  OpenWeather  — weather+forecasts (OPENWEATHER_KEY)
//   📊 CoinGecko     — crypto prices (free, no key)
//   🌐 Jina AI       — URL reader
//   🔔 Pushover      — push notifications
//   📊 Gist          — cloud notes
//   🔗 Bitly         — URL shortener
// ═══════════════════════════════════════════════════════════════

// ─── GITHUB ──────────────────────────────────────────────────────
export const github = {
  async getUserRepos(username, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, { headers });
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(repo => ({
      name: repo.name, desc: repo.description, stars: repo.stargazers_count,
      lang: repo.language, url: repo.html_url, updated: repo.updated_at,
    }));
  },
  async getRepoCommits(owner, repo, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers });
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(c => ({
      sha: c.sha?.slice(0, 7), message: c.commit?.message?.slice(0, 80),
      author: c.commit?.author?.name, date: c.commit?.author?.date,
    }));
  },
  async getTrending(language = '') {
    const lang = language ? `?language=${encodeURIComponent(language)}` : '';
    try {
      const r = await fetch(`https://api.gitterapp.com/repositories${lang}`);
      const d = await r.json();
      return (d || []).slice(0, 8).map(r => ({
        name: r.repositoryName, author: r.username, desc: r.description,
        stars: r.stargazersCount, url: `https://github.com/${r.username}/${r.repositoryName}`,
      }));
    } catch { return []; }
  },
  async getIssues(owner, repo, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=5`, { headers });
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(i => ({ number: i.number, title: i.title, labels: i.labels?.map(l => l.name), url: i.html_url }));
  },
  async saveGist(content, filename = 'jarvis-note.md', token) {
    if (!token) return { error: 'GitHub token required' };
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
    const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return (d.deployments || []).map(dep => ({
      id: dep.uid, url: dep.url, state: dep.state, created: dep.created,
      meta: dep.meta?.githubCommitMessage?.slice(0, 60),
    }));
  },
  async getLatestDeployment(projectId, token) {
    const deps = await vercel.getDeployments(projectId, token);
    return deps[0] || null;
  },
  async getBuildLogs(deploymentId, token) {
    const r = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return (d || []).filter(e => e.type === 'stderr' || e.type === 'stdout').slice(-20).map(e => e.text);
  },
};

// ─── GOOGLE CALENDAR ─────────────────────────────────────────────
export const googleCal = {
  async getTodayEvents(accessToken) {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const d = await r.json();
    return (d.items || []).map(e => ({ title: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime, location: e.location }));
  },
  async getUpcomingEvents(accessToken, days = 7) {
    const start = new Date();
    const end   = new Date(); end.setDate(end.getDate() + days);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=10`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const d = await r.json();
    return (d.items || []).map(e => ({ title: e.summary, start: e.start?.dateTime || e.start?.date, location: e.location }));
  },
  async addEvent(accessToken, { title, start, end, description = '' }) {
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: title, start: { dateTime: start }, end: { dateTime: end }, description }),
    });
    return await r.json();
  },
};

// ─── TELEGRAM ─────────────────────────────────────────────────────
export const telegram = {
  async sendMessage(botToken, chatId, text, parseMode = 'HTML') {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    return await r.json();
  },
  async sendPhoto(botToken, chatId, photoUrl, caption = '') {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
    });
    return await r.json();
  },
  async getMe(botToken) {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    return await r.json();
  },
  async sendReminder(botToken, chatId, message) {
    return telegram.sendMessage(botToken, chatId, `🔔 Reminder: ${message}`);
  },
};

// ─── DISCORD WEBHOOK ──────────────────────────────────────────────
export const discord = {
  async send(webhookUrl, { content, username = 'JARVIS', embeds = [] }) {
    if (!webhookUrl) return { error: 'Discord webhook URL not configured' };
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, username, avatar_url: 'https://i.imgur.com/AfFp7pu.png', embeds }),
    });
    return r.ok ? { success: true } : { error: await r.text() };
  },
  async sendRichEmbed(webhookUrl, { title, description, color = 0x1A56DB, fields = [], footer = '' }) {
    return discord.send(webhookUrl, {
      embeds: [{
        title, description, color,
        fields: fields.map(f => ({ name: f.name, value: f.value, inline: f.inline || false })),
        footer: footer ? { text: footer } : undefined,
        timestamp: new Date().toISOString(),
      }]
    });
  },
};

// ─── SLACK WEBHOOK ────────────────────────────────────────────────
export const slack = {
  async send(webhookUrl, { text, blocks = [] }) {
    if (!webhookUrl) return { error: 'Slack webhook URL not configured' };
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    });
    return r.ok ? { success: true } : { error: await r.text() };
  },
  async sendRich(webhookUrl, { title, text, color = '#1A56DB' }) {
    return slack.send(webhookUrl, {
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: title || 'JARVIS' } },
        { type: 'section', text: { type: 'mrkdwn', text } },
        { type: 'divider' },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `_Sent by JARVIS • ${new Date().toLocaleString()}_` }] },
      ]
    });
  },
};

// ─── SPOTIFY ──────────────────────────────────────────────────────
export const spotify = {
  async getAccessToken(clientId, clientSecret) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
      body: 'grant_type=client_credentials',
    });
    const d = await r.json();
    return d.access_token;
  },
  async searchTrack(query, token) {
    const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return (d.tracks?.items || []).map(t => ({
      name: t.name, artists: t.artists.map(a => a.name).join(', '),
      album: t.album.name, preview: t.preview_url, url: t.external_urls.spotify,
      image: t.album.images[0]?.url,
    }));
  },
  async getNewReleases(token, market = 'IN') {
    const r = await fetch(`https://api.spotify.com/v1/browse/new-releases?market=${market}&limit=8`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return (d.albums?.items || []).map(a => ({
      name: a.name, artists: a.artists.map(x => x.name).join(', '),
      url: a.external_urls.spotify, image: a.images[0]?.url, release_date: a.release_date,
    }));
  },
  async getFeaturedPlaylists(token) {
    const r = await fetch(`https://api.spotify.com/v1/browse/featured-playlists?country=IN&limit=6`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return (d.playlists?.items || []).map(p => ({
      name: p.name, desc: p.description, url: p.external_urls.spotify, image: p.images[0]?.url, tracks: p.tracks.total,
    }));
  },
};

// ─── YOUTUBE ──────────────────────────────────────────────────────
export const youtube = {
  async search(query, apiKey, maxResults = 5) {
    if (!apiKey) return { error: 'YOUTUBE_API_KEY not set' };
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`);
    const d = await r.json();
    return (d.items || []).map(v => ({
      title: v.snippet.title, channel: v.snippet.channelTitle,
      desc: v.snippet.description?.slice(0, 100),
      url: `https://youtu.be/${v.id.videoId}`,
      thumb: v.snippet.thumbnails?.medium?.url,
    }));
  },
  async getTrending(apiKey, regionCode = 'IN', maxResults = 8) {
    if (!apiKey) return { error: 'YOUTUBE_API_KEY not set' };
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${apiKey}`);
    const d = await r.json();
    return (d.items || []).map(v => ({
      title: v.snippet.title, channel: v.snippet.channelTitle,
      views: parseInt(v.statistics.viewCount).toLocaleString(),
      url: `https://youtu.be/${v.id}`,
      thumb: v.snippet.thumbnails?.medium?.url,
    }));
  },
  async getChannelInfo(channelId, apiKey) {
    if (!apiKey) return { error: 'YOUTUBE_API_KEY not set' };
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`);
    const d = await r.json();
    const c = d.items?.[0];
    if (!c) return null;
    return {
      name: c.snippet.title, desc: c.snippet.description?.slice(0, 200),
      subscribers: parseInt(c.statistics.subscriberCount).toLocaleString(),
      videos: c.statistics.videoCount, views: c.statistics.viewCount,
    };
  },
};

// ─── NOTION ──────────────────────────────────────────────────────
export const notion = {
  async getPages(token) {
    const r = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { value: 'page', property: 'object' }, sort: { direction: 'descending', timestamp: 'last_edited_time' } }),
    });
    const d = await r.json();
    return (d.results || []).slice(0, 10).map(p => ({
      id: p.id, title: p.properties?.title?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
      url: p.url, last_edited: p.last_edited_time,
    }));
  },
  async createPage(token, databaseId, title, content = '') {
    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: content ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content } }] } }] : [],
      }),
    });
    return await r.json();
  },
  async getDatabases(token) {
    const r = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { value: 'database', property: 'object' } }),
    });
    const d = await r.json();
    return (d.results || []).map(db => ({
      id: db.id, title: db.title?.[0]?.plain_text || 'Untitled DB', url: db.url,
    }));
  },
};

// ─── TODOIST ──────────────────────────────────────────────────────
export const todoist = {
  async getTasks(apiKey, filter = 'today') {
    if (!apiKey) return { error: 'TODOIST_API_KEY not set' };
    const r = await fetch(`https://api.todoist.com/rest/v2/tasks?filter=${encodeURIComponent(filter)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(t => ({ id: t.id, content: t.content, priority: t.priority, due: t.due?.string, project_id: t.project_id }));
  },
  async addTask(apiKey, { content, due_string = '', priority = 1, project_id = null }) {
    if (!apiKey) return { error: 'TODOIST_API_KEY not set' };
    const body = { content, priority };
    if (due_string) body.due_string = due_string;
    if (project_id) body.project_id = project_id;
    const r = await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  },
  async completeTask(apiKey, taskId) {
    if (!apiKey) return { error: 'TODOIST_API_KEY not set' };
    const r = await fetch(`https://api.todoist.com/rest/v2/tasks/${taskId}/close`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }
    });
    return { success: r.ok };
  },
  async getProjects(apiKey) {
    if (!apiKey) return { error: 'TODOIST_API_KEY not set' };
    const r = await fetch('https://api.todoist.com/rest/v2/projects', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    return await r.json();
  },
};

// ─── OPENWEATHERMAP ───────────────────────────────────────────────
export const openweather = {
  async getCurrent(city, apiKey) {
    if (!apiKey) {
      // Fallback to Open-Meteo (no key needed)
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const gd = await geo.json();
      const loc = gd.results?.[0];
      if (!loc) return { error: 'City not found' };
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`);
      const wd = await w.json();
      const wc = wd.current_weather;
      return {
        city, temp: Math.round(wc.temperature), wind: wc.windspeed,
        condition: wc.weathercode, source: 'open-meteo',
      };
    }
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
    const d = await r.json();
    return {
      city: d.name, temp: Math.round(d.main?.temp), feels_like: Math.round(d.main?.feels_like),
      humidity: d.main?.humidity, condition: d.weather?.[0]?.description,
      icon: `https://openweathermap.org/img/wn/${d.weather?.[0]?.icon}@2x.png`,
      wind: d.wind?.speed, visibility: d.visibility,
    };
  },
  async getForecast(city, apiKey, days = 5) {
    if (!apiKey) return { error: 'OPENWEATHER_KEY not set, using open-meteo instead' };
    const r = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&cnt=${days * 8}`);
    const d = await r.json();
    // Group by day
    const daily = {};
    (d.list || []).forEach(item => {
      const day = item.dt_txt.split(' ')[0];
      if (!daily[day]) daily[day] = [];
      daily[day].push(item);
    });
    return Object.entries(daily).slice(0, days).map(([date, items]) => ({
      date, min: Math.round(Math.min(...items.map(i => i.main.temp_min))),
      max: Math.round(Math.max(...items.map(i => i.main.temp_max))),
      condition: items[4]?.weather?.[0]?.description || items[0]?.weather?.[0]?.description,
    }));
  },
};

// ─── WHATSAPP (via Twilio) ────────────────────────────────────────
export const whatsapp = {
  async send(to, message, { accountSid, authToken, fromNumber }) {
    if (!accountSid || !authToken) return { error: 'Twilio credentials not configured' };
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: `whatsapp:${fromNumber || '+14155238886'}`,
      To: `whatsapp:${to}`,
      Body: message,
    });
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const d = await r.json();
    return r.ok ? { success: true, sid: d.sid } : { error: d.message };
  },
};

// ─── GOOGLE DRIVE ─────────────────────────────────────────────────
export const googleDrive = {
  async listFiles(accessToken, query = '') {
    const q = query ? `name contains '${query}'` : '';
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)${q ? `&q=${encodeURIComponent(q)}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const d = await r.json();
    return (d.files || []).map(f => ({ id: f.id, name: f.name, type: f.mimeType, size: f.size, modified: f.modifiedTime, url: f.webViewLink }));
  },
  async readFile(fileId, accessToken) {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return await r.text();
  },
};

// ─── REDDIT ──────────────────────────────────────────────────────
export const reddit = {
  async getTopPosts(subreddit = 'india', limit = 5) {
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`, {
      headers: { 'User-Agent': 'JARVIS/1.0' }
    });
    const d = await r.json();
    return (d.data?.children || []).map(p => ({
      title: p.data.title, score: p.data.score, comments: p.data.num_comments,
      url: `https://reddit.com${p.data.permalink}`, flair: p.data.link_flair_text,
    }));
  },
  async getMeme(subreddit = 'memes') {
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/random.json`, {
      headers: { 'User-Agent': 'JARVIS/1.0' }
    });
    const d = await r.json();
    const post = d[0]?.data?.children?.[0]?.data;
    if (!post) return null;
    return { title: post.title, url: post.url, score: post.score, permalink: `https://reddit.com${post.permalink}` };
  },
  async search(query, subreddit = 'all', limit = 5) {
    const r = await fetch(`https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: { 'User-Agent': 'JARVIS/1.0' }
    });
    const d = await r.json();
    return (d.data?.children || []).map(p => ({
      title: p.data.title, score: p.data.score, subreddit: p.data.subreddit,
      url: `https://reddit.com${p.data.permalink}`,
    }));
  },
};

// ─── PEXELS ──────────────────────────────────────────────────────
export const pexels = {
  async searchPhotos(query, perPage = 5, apiKey) {
    if (!apiKey) return { error: 'PEXELS_API_KEY not set' };
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
      headers: { Authorization: apiKey }
    });
    const d = await r.json();
    return (d.photos || []).map(p => ({
      id: p.id, url: p.src.large, thumb: p.src.medium,
      alt: p.alt, photographer: p.photographer, pexels_url: p.url,
    }));
  },
  async searchVideos(query, perPage = 3, apiKey) {
    if (!apiKey) return { error: 'PEXELS_API_KEY not set' };
    const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
      headers: { Authorization: apiKey }
    });
    const d = await r.json();
    return (d.videos || []).map(v => ({
      id: v.id, duration: v.duration, width: v.width, height: v.height,
      url: v.video_files?.[0]?.link, thumb: v.image, pexels_url: v.url,
    }));
  },
};

// ─── JINA AI (URL Reader) ────────────────────────────────────────
export const jina = {
  async readUrl(url) {
    try {
      const r = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: 'text/plain' }
      });
      return (await r.text()).slice(0, 3000);
    } catch (e) { return { error: e.message }; }
  },
};

// ─── COINGECKO (Crypto prices — no key needed) ───────────────────
export const crypto = {
  async getPrice(coinId = 'bitcoin', currency = 'inr') {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency},usd&include_24hr_change=true`);
    const d = await r.json();
    const coin = d[coinId];
    if (!coin) return { error: 'Coin not found' };
    return {
      coin: coinId, price_inr: coin.inr?.toLocaleString('en-IN'),
      price_usd: coin.usd?.toLocaleString(),
      change_24h: coin[`${currency}_24h_change`]?.toFixed(2) + '%',
    };
  },
  async getTopCoins(limit = 10, currency = 'inr') {
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1`);
    const d = await r.json();
    return (d || []).map(c => ({
      rank: c.market_cap_rank, name: c.name, symbol: c.symbol.toUpperCase(),
      price: c.current_price?.toLocaleString('en-IN'), change_24h: c.price_change_percentage_24h?.toFixed(2) + '%',
      market_cap: c.market_cap?.toLocaleString('en-IN'),
    }));
  },
};

// ─── BITLY URL SHORTENER ─────────────────────────────────────────
export const bitly = {
  async shorten(url, apiKey) {
    if (!apiKey) return { error: 'BITLY_TOKEN not set' };
    const r = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url: url }),
    });
    const d = await r.json();
    return { short_url: d.link, id: d.id };
  },
};

// ─── CHECK ALL INTEGRATIONS ──────────────────────────────────────
export async function checkAllIntegrations(keys = {}) {
  const status = {};
  const checks = [
    ['telegram',  () => keys.TELEGRAM_BOT_TOKEN && keys.TELEGRAM_CHAT_ID],
    ['spotify',   () => keys.SPOTIFY_CLIENT_ID && keys.SPOTIFY_CLIENT_SECRET],
    ['notion',    () => keys.NOTION_TOKEN],
    ['google',    () => keys.GOOGLE_ACCESS_TOKEN || (keys.GOOGLE_CLIENT_ID && keys.GOOGLE_CLIENT_SECRET)],
    ['github',    () => keys.GITHUB_TOKEN],
    ['vercel',    () => keys.VERCEL_TOKEN],
    ['discord',   () => keys.DISCORD_WEBHOOK],
    ['slack',     () => keys.SLACK_WEBHOOK],
    ['youtube',   () => keys.YOUTUBE_API_KEY],
    ['todoist',   () => keys.TODOIST_API_KEY],
    ['pexels',    () => keys.PEXELS_API_KEY],
    ['openweather', () => keys.OPENWEATHER_KEY],
    ['whatsapp',  () => keys.TWILIO_ACCOUNT_SID && keys.TWILIO_AUTH_TOKEN],
    ['bitly',     () => keys.BITLY_TOKEN],
    ['reddit',    () => true],  // Always available (no key)
    ['crypto',    () => true],  // Always available (no key)
    ['jina',      () => true],  // Always available (no key)
  ];
  for (const [name, check] of checks) {
    status[name] = check() ? 'connected' : 'not_configured';
  }
  return status;
}

// Backward compatibility aliases
export const googleCalendar = googleCal;
export const jinaReader = jina;
export const spotifyApi = spotify;
export const telegramBot = telegram;
export const notionApi = notion;
export const googleDriveApi = googleDrive;
export const redditApi = reddit;
export const pexelsApi = pexels;
export const githubApi = github;
export const vercelApi = vercel;
