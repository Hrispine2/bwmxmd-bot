const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const s = require(__dirname + "/../config");
const XMD = require('../adams/xmd');
const BOT_NAME = s.BOT || 'BWM XMD';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { formatAudio } = require('../adams/lib/botFunctions');

// Re-mux via temp files with -movflags +faststart (moves moov atom to front).
// Using temp files is far more reliable than piping for large MP4 buffers.
function faststartBuffer(inputBuffer) {
  return new Promise((resolve) => {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2);
    const tmpIn  = path.join(os.tmpdir(), `bwm_in_${id}.mp4`);
    const tmpOut = path.join(os.tmpdir(), `bwm_out_${id}.mp4`);
    const cleanup = () => { try { fs.unlinkSync(tmpIn); } catch {} try { fs.unlinkSync(tmpOut); } catch {} };
    try {
      fs.writeFileSync(tmpIn, inputBuffer);
      execFile(ffmpegPath, ['-y', '-i', tmpIn, '-c', 'copy', '-movflags', '+faststart', tmpOut], { timeout: 90000 }, (err) => {
        if (err) {
          console.error('[BWM] ffmpeg faststart error:', err.message);
          cleanup();
          return resolve(inputBuffer);
        }
        try {
          const result = fs.readFileSync(tmpOut);
          cleanup();
          resolve(result);
        } catch (readErr) {
          console.error('[BWM] ffmpeg output read error:', readErr.message);
          cleanup();
          resolve(inputBuffer);
        }
      });
    } catch (writeErr) {
      console.error('[BWM] ffmpeg temp write error:', writeErr.message);
      cleanup();
      resolve(inputBuffer);
    }
  });
}


const _AK = XMD.GIFTED.AK;
const _AB = XMD.GIFTED.DOWNLOAD_BASE;
const _ex = (d) => d?.result?.download_url || d?.result?.downloadUrl || d?.result?.url || d?.download_url || d?.url || d?.link;

// Audio endpoints — YOUR SPECIFIED APIS AT THE TOP (FASTEST PRIORITY)
// savetubemp3 and ytmp3v2 as requested
const audioApis = [
  { id: 1, fn: (u) => `${_AB}/savetubemp3?apikey=${_AK}&url=${encodeURIComponent(u)}`, extract: _ex },
  { id: 2, fn: (u) => `${_AB}/ytmp3v2?apikey=${_AK}&url=${encodeURIComponent(u)}&quality=128`, extract: _ex },
  { id: 3, fn: (u) => `${_AB}/dlmp3?apikey=${_AK}&url=${encodeURIComponent(u)}`, extract: _ex },
  { id: 4, fn: (u) => `${_AB}/ytmp3?apikey=${_AK}&url=${encodeURIComponent(u)}&quality=128kbps`, extract: _ex },
  { id: 5, fn: (u) => `${_AB}/yta?apikey=${_AK}&url=${encodeURIComponent(u)}`, extract: _ex },
  { id: 6, fn: (u) => `${_AB}/ytdl?apikey=${_AK}&url=${encodeURIComponent(u)}`, extract: (d) => d?.result?.audio_url || d?.result?.audio?.url || _ex(d) },
];

// Video endpoints — apiskeith/video primary (savetube CDN, verified working)
// apiskeith-video → apiskeith-ytmp4 → gifted-ytmp4v2 → gifted-dlmp4 → gifted-ytdl
const _AK2 = 'apis.keithsite.top';
const _exStr = (d) => (typeof d?.result === 'string' ? d.result : null) || d?.result?.url || d?.result?.download_url || d?.download_url || d?.url;
const videoApis = [
  { id: 1, fn: (u) => `https://${_AK2}/download/video?url=${encodeURIComponent(u)}`,                extract: _exStr },
  { id: 2, fn: (u) => `https://${_AK2}/download/ytmp4?url=${encodeURIComponent(u)}&quality=360`,    extract: _exStr },
  { id: 3, fn: (u) => `${_AB}/ytmp4v2?apikey=${_AK}&url=${encodeURIComponent(u)}&quality=360`,      extract: (d) => d?.result?.download_url || _ex(d) },
  { id: 4, fn: (u) => `${_AB}/dlmp4?apikey=${_AK}&url=${encodeURIComponent(u)}&quality=360`,        extract: (d) => d?.result?.download_url || _ex(d) },
  { id: 5, fn: (u) => `${_AB}/ytdl?apikey=${_AK}&url=${encodeURIComponent(u)}`,                     extract: (d) => d?.result?.video_url || d?.result?.video?.url || _ex(d) },
];

// Fire all endpoints in parallel and collect every working URL in arrival order.
// This gives us multiple URLs to try when sending — if the fastest one fails (e.g.
// the remote server returns 500 on actual download), we fall through to the next.
async function collectAllUrls(apiList, videoUrl, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const urls = [];
    let pending = apiList.length;

    for (const api of apiList) {
      const apiUrl = api.fn(videoUrl);
      axios.get(apiUrl, { timeout: timeoutMs })
        .then(res => {
          const data = res.data;
          if (data?.success === false || data?.status === false || data?.status === 403 || data?.status === 400) return;
          const dlUrl = api.extract(data);
          if (dlUrl && typeof dlUrl === 'string' && dlUrl.startsWith('http')) {
            urls.push(dlUrl);
          }
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          if (pending === 0) resolve(urls);
        });
    }
  });
}

// Get the first working URL quickly (race), then keep collecting the rest in the
// background so they're available as fallbacks when sending.
async function getUrlsWithEarlyReturn(apiList, videoUrl, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const urls = [];
    let pending = apiList.length;
    let firstSent = false;
    let timer = null;

    const tryResolve = () => {
      if (pending === 0) {
        if (timer) clearTimeout(timer);
        resolve(urls);
      }
    };

    for (const api of apiList) {
      const apiUrl = api.fn(videoUrl);
      axios.get(apiUrl, { timeout: timeoutMs })
        .then(res => {
          const data = res.data;
          if (data?.success === false || data?.status === false || data?.status === 403 || data?.status === 400) return;
          const dlUrl = api.extract(data);
          if (dlUrl && typeof dlUrl === 'string' && dlUrl.startsWith('http')) {
            urls.push(dlUrl);
            // On first URL, schedule a short wait (2s) for more URLs to arrive,
            // then resolve with whatever we have — gives fast delivery but still
            // collects a few fallback URLs before handing off to the sender.
            if (!firstSent) {
              firstSent = true;
              timer = setTimeout(() => resolve(urls), 3000);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          tryResolve();
        });
    }
  });
}

const extractVideoId = (url) => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
};

async function searchVideo(q) {
  let videoUrl, videoTitle, videoThumbnail, videoDuration, videoViews, videoChannel, videoId;

  if (q.match(/(youtube\.com|youtu\.be)/i)) {
    videoUrl = q;
    videoId = extractVideoId(q);
    if (!videoId) return null;
    videoTitle = "YouTube Media";
    videoThumbnail = XMD.EXTERNAL.YOUTUBE_THUMB(videoId);
    videoDuration = "Unknown";
    videoViews = "Unknown";
    videoChannel = "Unknown";
  } else {
    let videos;
    try {
      const r1 = await axios.get(`https://yts.gifted.co.ke/?q=${encodeURIComponent(q)}`, { timeout: 15000 });
      videos = r1.data?.videos || (Array.isArray(r1.data) ? r1.data : r1.data?.result);
    } catch {
      try {
        const r2 = await axios.get(XMD.SEARCH_EXT.YTS_BACKUP(q), { timeout: 15000 });
        videos = Array.isArray(r2.data) ? r2.data : r2.data?.result;
      } catch {
        const r3 = await axios.get(XMD.SEARCH_EXT.YTS_QUERY(q), { timeout: 15000 });
        videos = Array.isArray(r3.data) ? r3.data : r3.data?.result;
      }
    }
    if (!Array.isArray(videos) || videos.length === 0) return null;
    const v = videos[0];
    videoUrl = v.url;
    videoId = v.id || extractVideoId(v.url);
    videoTitle = v.name || v.title;
    videoThumbnail = v.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    videoDuration = v.duration || "Unknown";
    videoViews = v.views || "Unknown";
    videoChannel = v.author || v.channel || "Unknown";
  }

  return { videoUrl, videoTitle, videoThumbnail, videoDuration, videoViews, videoChannel, videoId };
}

// ─── AUDIO COMMAND ───────────────────────────────────────────────────────────

bwmxmd({
  pattern: "play",
  aliases: ["song", "music", "yta", "audio"],
  category: "Downloader",
  description: "Search and download audio from YouTube"
},
async (from, client, conText) => {
  const { q, mek, reply, deviceMode, botname } = conText;
  if (!q) return reply("Please provide a search query or YouTube URL");

  const androidContextInfo = deviceMode !== 'iPhone' ? XMD.getContextInfo(botname) : undefined;

  try {
    const info = await searchVideo(q);
    if (!info) return reply("❌ No results found for: " + q);

    const { videoUrl, videoTitle, videoThumbnail, videoDuration, videoViews, videoChannel, videoId } = info;

    await client.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    const infoPayload = {
      text: `🎵 *Downloading audio...*\n\n*${videoTitle}*\n🎬 ${videoChannel} | ⏱️ ${videoDuration}\n\n_Please wait..._`
    };
    if (androidContextInfo) infoPayload.contextInfo = androidContextInfo;
    await client.sendMessage(from, infoPayload, { quoted: mek });

    const urls = await getUrlsWithEarlyReturn(audioApis, videoUrl);
    if (!urls.length) {
      await client.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ Failed to download audio. Please try again.");
    }

    // Fully buffer the audio then re-encode via ffmpeg temp files so WhatsApp
    // always receives a clean, self-contained MP3 it can play — never a raw URL
    // that may expire or fail after delivery.
    const WA_AUDIO_LIMIT = 64 * 1024 * 1024; // 64 MB
    let audioBuffer = null;

    for (let i = 0; i < urls.length; i++) {
      try {
        console.log(`[BWM] Buffering audio from URL ${i + 1}...`);
        const dlRes = await axios.get(urls[i], {
          responseType: 'arraybuffer',
          timeout: 180000,
          maxContentLength: 2 * 1024 * 1024 * 1024
        });
        const raw = Buffer.from(dlRes.data);
        if (!raw || raw.length < 10240) {
          console.error(`[BWM] Audio URL ${i + 1} returned too-small response (${raw?.length} bytes), skipping`);
          continue;
        }
        console.log(`[BWM] Audio buffered: ${(raw.length / 1024 / 1024).toFixed(1)} MB — re-encoding...`);
        audioBuffer = await formatAudio(raw);
        console.log(`[BWM] Audio encoded: ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB`);
        break;
      } catch (dlErr) {
        console.error(`[BWM] Audio buffer/encode failed for URL ${i + 1}: ${dlErr.message}${i + 1 < urls.length ? ', trying next...' : ''}`);
      }
    }

    if (!audioBuffer || audioBuffer.length < 10240) {
      await client.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ Failed to download audio. All sources failed — please try again.");
    }

    const sendAsDocument = audioBuffer.length > WA_AUDIO_LIMIT;

    let sent = false;
    try {
      if (sendAsDocument) {
        const safeTitle = videoTitle.replace(/[^\w\s.-]/gi, '').trim() || 'audio';
        const docPayload = {
          document: audioBuffer,
          mimetype: "audio/mpeg",
          fileName: `${safeTitle}.mp3`,
          caption: `*${videoTitle}*\n🎬 ${videoChannel} | ⏱️ ${videoDuration}\n\n_File too large for inline playback — download to listen_`
        };
        await client.sendMessage(from, docPayload);
        sent = true;
      } else {
        const audioPayload = {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false
        };
        if (deviceMode !== 'iPhone') {
          audioPayload.contextInfo = {
            externalAdReply: {
              title: videoTitle,
              body: `🎬 ${videoChannel} | ⏱️ ${videoDuration}`,
              thumbnailUrl: videoThumbnail,
              sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: false
            }
          };
        }
        await client.sendMessage(from, audioPayload);
        sent = true;
      }
    } catch (e) {
      console.error(`[BWM] Audio send failed: ${e.message}`);
    }

    if (!sent) {
      await client.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ Failed to send audio. Please try again.");
    }

    await client.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (error) {
    console.error("[BWM] Audio command error:", error.message);
    await client.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
    reply("❌ Failed to send audio. Please try again.");
  }
});

// ─── VIDEO COMMAND ────────────────────────────────────────────────────────────

bwmxmd({
  pattern: "video",
  aliases: ["ytmp4", "ytv", "vid"],
  category: "Downloader",
  description: "Search and download video from YouTube"
},
async (from, client, conText) => {
  const { q, mek, reply, deviceMode, botname } = conText;
  if (!q) return reply("Please provide a search query or YouTube URL");

  const androidContextInfo = deviceMode !== 'iPhone' ? XMD.getContextInfo(botname) : undefined;

  try {
    const info = await searchVideo(q);
    if (!info) return reply("❌ No results found for: " + q);

    const { videoUrl, videoTitle, videoThumbnail, videoDuration, videoViews, videoChannel, videoId } = info;

    await client.sendMessage(from, { react: { text: "⏳", key: mek.key } });
    const infoPayload = {
      text: `🎬 *Downloading video...*\n\n*${videoTitle}*\n🎬 ${videoChannel} | ⏱️ ${videoDuration}\n\n_Please wait..._`
    };
    if (androidContextInfo) infoPayload.contextInfo = androidContextInfo;
    await client.sendMessage(from, infoPayload, { quoted: mek });

    // Collect all working URLs (with 2s early-return after first arrives)
    const urls = await getUrlsWithEarlyReturn(videoApis, videoUrl);
    if (!urls.length) {
      await client.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ Failed to download video. Please try again.");
    }

    const fileName = `${videoTitle}`.replace(/[^\w\s.-]/gi, '').trim() || 'video';

    // Try each URL in order — fully buffer the video before handing to Baileys
    // so WhatsApp always receives a complete MP4 it can play, not a stream/redirect
    const WA_VIDEO_LIMIT = 64 * 1024 * 1024; // 64 MB
    let videoBuffer = null;
    let fileSizeBytes = 0;
    let sendAsDocument = false;
    let chosenUrl = urls[0];

    for (let i = 0; i < urls.length; i++) {
      const tryUrl = urls[i];
      try {
        // Quick HEAD first to know size and confirm URL is alive
        try {
          const head = await axios.head(tryUrl, { timeout: 8000, maxRedirects: 5 });
          const size = parseInt(head.headers['content-length'] || '0', 10);
          const type = (head.headers['content-type'] || '').toLowerCase();
          console.log(`[BWM] Video URL ${i + 1}: ${(size / 1024 / 1024).toFixed(1)} MB | ${type}`);
          fileSizeBytes = size;
          if (size > 0 && size > WA_VIDEO_LIMIT) sendAsDocument = true;
        } catch { /* HEAD not supported — proceed to download anyway */ }

        // Full buffer download — this is what makes it play on WhatsApp
        const dlRes = await axios.get(tryUrl, {
          responseType: 'arraybuffer',
          timeout: 180000,
          maxContentLength: 2 * 1024 * 1024 * 1024
        });
        videoBuffer = Buffer.from(dlRes.data);
        chosenUrl = tryUrl;
        const actualMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
        console.log(`[BWM] Video buffered from URL ${i + 1}: ${actualMB} MB`);
        if (videoBuffer.length > WA_VIDEO_LIMIT) sendAsDocument = true;
        // Re-mux with faststart so WhatsApp can play inline (moov atom at start)
        if (!sendAsDocument) {
          console.log('[BWM] Applying faststart mux...');
          videoBuffer = await faststartBuffer(videoBuffer);
          console.log(`[BWM] Faststart done: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);
        }
        break; // success — stop trying other URLs
      } catch (dlErr) {
        console.error(`[BWM] Buffer failed for URL ${i + 1}: ${dlErr.message}${i + 1 < urls.length ? ', trying next URL...' : ', no more URLs'}`);
      }
    }

    if (!videoBuffer) {
      await client.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ Failed to download video. All sources failed — please try again.");
    }

    const mediaSrc = videoBuffer;

    let sent = false;

    if (sendAsDocument) {
      // Large file — send as downloadable document (WhatsApp supports up to ~2 GB for docs)
      console.log(`[BWM] Sending as document (large file)`);
      const sizeLabel = fileSizeBytes ? ` • ${(fileSizeBytes / 1024 / 1024).toFixed(0)} MB` : '';
      try {
        const docPayload = {
          document: mediaSrc,
          mimetype: "video/mp4",
          fileName: `${fileName}.mp4`,
          caption: `*${videoTitle}*\n🎬 ${videoChannel} | ⏱️ ${videoDuration}${sizeLabel}\n\n_File too large for inline playback — download to watch_`
        };
        if (androidContextInfo) docPayload.contextInfo = androidContextInfo;
        await client.sendMessage(from, docPayload);
        sent = true;
      } catch (e) {
        console.error(`[BWM] Document send failed: ${e.message}`);
      }
    } else {
      // Normal size — send as playable video with info card, fallback to plain
      const videoPayload = {
        video: mediaSrc,
        mimetype: "video/mp4",
        caption: `*${videoTitle}*`,
        fileName: `${fileName}.mp4`,
        gifPlayback: false
      };
      if (androidContextInfo) videoPayload.contextInfo = androidContextInfo;
      try {
        await client.sendMessage(from, videoPayload);
        sent = true;
      } catch (e1) {
        console.error(`[BWM] Video send failed: ${e1.message}`);
      }
    }

    if (!sent) {
      await client.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ Failed to send video. Please try again.");
    }

    await client.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (error) {
    console.error("[BWM] Video command error:", error.message);
    await client.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
    reply("❌ Failed to send video. Please try again.");
  }
});
