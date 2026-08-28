const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');
const axios = require('axios');

// ─── CHECK GIFTED API KEY ─────────────────────────────────────────────────────
bwmxmd({
  pattern: 'checkapikey',
  fromMe: false,
  desc: 'Check the status, plan, and usage of the bot API key',
  category: 'tools',
}, async (from, client, conText) => {
  const { mek, reply, q } = conText;
  const key = (q || '').trim() || XMD.GIFTED.AK;

  reply('⏳ Checking API key...');
  try {
    const res = await axios.get(XMD.GIFTED.CHECKAPIKEY(key), { timeout: 10000 });
    const d = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!res.data?.success || !d) return reply('❌ Invalid or unrecognized API key.');

    const limit = d.limit >= 1e+38 ? '∞ Unlimited' : Number(d.limit).toLocaleString();
    const remaining = d.remainingLimit >= 1e+38 ? '∞ Unlimited' : Number(d.remainingLimit).toLocaleString();

    reply(
      `🔑 *API Key Info*\n\n` +
      `👤 Owner: ${d.username}\n` +
      `🗝️ Key: \`${d.apikey}\`\n` +
      `📦 Plan: ${d.plan}\n` +
      `📊 Limit: ${limit}\n` +
      `✅ Used: ${Number(d.used).toLocaleString()}\n` +
      `🔋 Remaining: ${remaining}\n` +
      `📅 Registered: ${d.registeredDate}\n` +
      `⏳ Expires: ${d.expiryDate}\n` +
      `💬 ${d.customMessage || ''}`
    );
  } catch (e) {
    console.error('checkapikey error:', e.message);
    reply('❌ Failed to check the API key. Make sure it is valid.');
  }
});

// ─── GITCLONE ─────────────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'gitclone',
  fromMe: false,
  desc: 'Download a GitHub repository as a ZIP file',
  category: 'downloader',
}, async (from, client, conText) => {
  const { mek, reply, q } = conText;
  if (!q) return reply('❌ Provide a GitHub repository URL.\nExample: *!gitclone* https://github.com/user/repo');

  const url = q.trim();
  if (!url.includes('github.com')) return reply('❌ Please provide a valid GitHub repository URL.');

  reply('⏳ Cloning repository...');
  try {
    const res = await axios.get(XMD.GIFTED.DOWNLOAD.GITCLONE(url), { timeout: 20000 });
    const d = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!d || !d.download_url) return reply('❌ Failed to get download link for this repository.');

    const name = d.name || url.split('/').pop() || 'repo';
    await client.sendMessage(from, {
      document: { url: d.download_url },
      mimetype: 'application/zip',
      fileName: `${name}.zip`,
      caption: `📦 *${name}*\n🔗 Repo: ${url}`
    }, { quoted: mek });

  } catch (e) {
    console.error('gitclone error:', e.message);
    reply('❌ Failed to clone this repository. Make sure the URL is a valid public GitHub repo.');
  }
});

// ─── SNACKDL ──────────────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'snackdl',
  fromMe: false,
  desc: 'Download a video from SnackVideo / Kwai',
  category: 'downloader',
}, async (from, client, conText) => {
  const { mek, reply, q } = conText;
  if (!q) return reply('❌ Provide a SnackVideo or Kwai video URL.\nExample: *!snackdl* https://www.snackvideo.com/video/...');

  const url = q.trim();
  reply('⏳ Downloading Snack video...');
  try {
    const res = await axios.get(XMD.GIFTED.DOWNLOAD.SNACKDL(url), { timeout: 20000 });
    const d = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!d) return reply('❌ Could not fetch video info. Make sure the URL is valid.');

    const videoUrl = d.media || d.url || d.video || d.download || (typeof d === 'string' ? d : null);
    if (!videoUrl) return reply('❌ No downloadable video found for this URL.');

    const caption = `🎬 *${d.title || 'Snack Video'}*\n👤 ${d.author || 'Unknown'}\n📝 ${d.description || ''}`.trim();

    await client.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      caption
    }, { quoted: mek });

  } catch (e) {
    console.error('snackdl error:', e.message);
    reply('❌ Failed to download this Snack video.');
  }
});

// ─── DAILYMOTION ──────────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'dailymotiondl',
  fromMe: false,
  desc: 'Download a video from Dailymotion',
  category: 'downloader',
}, async (from, client, conText) => {
  const { mek, reply, q } = conText;
  if (!q) return reply('❌ Provide a Dailymotion video URL.\nExample: *!dailymotiondl* https://www.dailymotion.com/video/...');

  const url = q.trim();
  if (!url.includes('dailymotion.com')) return reply('❌ Please provide a valid Dailymotion video URL.');

  reply('⏳ Downloading Dailymotion video...');
  try {
    const res = await axios.get(XMD.GIFTED.DOWNLOAD.DAILYMOTION(url), { timeout: 20000 });
    const d = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!d) return reply('❌ Could not fetch video info. Make sure the URL is valid.');

    const videoUrl = d.url || d.video || d.hd || d.sd || d.download || (typeof d === 'string' ? d : null);
    if (!videoUrl) return reply('❌ No downloadable video found for this URL.');

    await client.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      caption: `🎬 *${d.title || 'Dailymotion Video'}*`
    }, { quoted: mek });

  } catch (e) {
    console.error('dailymotiondl error:', e.message);
    reply('❌ Failed to download this Dailymotion video.');
  }
});

// ─── DRAMADASH — TRENDING ─────────────────────────────────────────────────────
bwmxmd({
  pattern: 'drama',
  fromMe: false,
  desc: 'Browse trending dramas on DramaDash',
  category: 'downloader',
}, async (from, client, conText) => {
  const { mek, reply } = conText;
  reply('⏳ Fetching trending dramas...');
  try {
    const res = await axios.get(XMD.GIFTED.DOWNLOAD.DRAMADASH('home'), { timeout: 15000 });
    const list = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!list || !list.length) return reply('❌ No drama results found.');

    const text = list.slice(0, 10).map((d, i) =>
      `*${i + 1}.* ${d.name}\n🆔 ID: ${d.id}\n🎭 ${(d.genres || []).join(', ')}`
    ).join('\n\n');

    reply(`🎬 *Trending Dramas on DramaDash*\n\n${text}\n\n📌 Use *!dramasearch <name>* to search.\n📌 Use *!dramainfo <ID>* for details.`);
  } catch (e) {
    console.error('drama home error:', e.message);
    reply('❌ Failed to fetch drama list.');
  }
});

// ─── DRAMADASH — SEARCH ───────────────────────────────────────────────────────
bwmxmd({
  pattern: 'dramasearch',
  fromMe: false,
  desc: 'Search for dramas on DramaDash',
  category: 'downloader',
}, async (from, client, conText) => {
  const { mek, reply, q } = conText;
  if (!q) return reply('❌ Please provide a search query.\nExample: *!dramasearch* love');

  reply(`⏳ Searching for "${q}"...`);
  try {
    const res = await axios.get(XMD.GIFTED.DOWNLOAD.DRAMADASH('search', q), { timeout: 15000 });
    const list = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!list || !list.length) return reply(`❌ No dramas found for "${q}".`);

    const text = list.slice(0, 10).map((d, i) =>
      `*${i + 1}.* ${d.name}\n🆔 ID: ${d.id}\n🎭 ${(d.genres || []).join(', ')}`
    ).join('\n\n');

    reply(`🎬 *Drama Search: "${q}"*\n\n${text}\n\n📌 Use *!dramainfo <ID>* for episode details.`);
  } catch (e) {
    console.error('dramasearch error:', e.message);
    reply('❌ Failed to search for dramas.');
  }
});

// ─── DRAMADASH — DETAIL ───────────────────────────────────────────────────────
bwmxmd({
  pattern: 'dramainfo',
  fromMe: false,
  desc: 'Get drama details and episode list by ID from DramaDash',
  category: 'downloader',
}, async (from, client, conText) => {
  const { mek, reply, q } = conText;
  if (!q) return reply('❌ Please provide a drama ID.\nExample: *!dramainfo* 6');

  const id = q.trim();
  reply(`⏳ Fetching drama info for ID: ${id}...`);
  try {
    const res = await axios.get(XMD.GIFTED.DOWNLOAD.DRAMADASH('detail', id), { timeout: 15000 });
    const d = res.data?.result ?? res.data?.results ?? res.data?.data;
    if (!d) return reply('❌ No drama found for this ID. Use *!drama* or *!dramasearch* to find a valid ID.');

    const drama = Array.isArray(d) ? d[0] : d;
    if (!drama) return reply('❌ Drama not found.');

    const episodes = drama.episodes || drama.ep_list || drama.episode_list || [];
    const epText = episodes.length
      ? episodes.slice(0, 20).map((ep, i) =>
          `  EP${ep.episode || ep.number || i + 1}: ${ep.title || ep.name || 'Episode ' + (i + 1)}`
        ).join('\n')
      : 'No episode list available.';

    const genres = (drama.genres || []).join(', ') || 'N/A';
    const synopsis = drama.synopsis || drama.description || drama.summary || 'N/A';
    const text = `🎬 *${drama.name || drama.title}*\n🎭 Genres: ${genres}\n📝 ${synopsis.slice(0, 200)}${synopsis.length > 200 ? '...' : ''}\n\n📺 *Episodes:*\n${epText}`;

    const poster = drama.poster || drama.thumbnail || drama.image;
    if (poster) {
      await client.sendMessage(from, {
        image: { url: poster },
        caption: text
      }, { quoted: mek });
    } else {
      reply(text);
    }
  } catch (e) {
    console.error('dramainfo error:', e.message);
    reply('❌ Failed to get drama info. Make sure the ID is valid.');
  }
});
