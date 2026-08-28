const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

const getContactMsg = (contactName, sender) => XMD.getContactMsg(contactName, sender);

function extractBk9Video(bk9Data) {
  if (!bk9Data) return null;
  if (typeof bk9Data === 'string') return bk9Data;
  if (bk9Data.BK9 && typeof bk9Data.BK9 === 'string') return bk9Data.BK9;
  if (bk9Data.video?.noWatermark) return bk9Data.video.noWatermark;
  if (bk9Data.HD) return bk9Data.HD;
  if (bk9Data.SD) return bk9Data.SD;
  if (Array.isArray(bk9Data.formats)) {
    const hdVideo = bk9Data.formats.find(f => f.type === 'video' && f.quality?.toLowerCase().includes('hd') || f.quality?.includes('1080') || f.quality?.includes('720'));
    const anyVideo = bk9Data.formats.find(f => f.type === 'video' && f.url);
    if (hdVideo?.url) return hdVideo.url;
    if (anyVideo?.url) return anyVideo.url;
  }
  if (Array.isArray(bk9Data.BK9)) {
    const vid = bk9Data.BK9.find(x => x.type === 'video' && x.url);
    if (vid?.url) return vid.url;
  }
  if (Array.isArray(bk9Data)) {
    const vid = bk9Data.find(x => (x.type === 'video' || x.type === 'unknown') && x.url);
    if (vid?.url) return vid.url;
  }
  return null;
}

function extractBk9Image(bk9Data) {
  if (!bk9Data) return null;
  if (Array.isArray(bk9Data)) {
    const img = bk9Data.find(x => x.type === 'image' && x.url);
    if (img?.url) return img.url;
  }
  if (Array.isArray(bk9Data.formats)) {
    const img = bk9Data.formats.find(f => f.type === 'image' && f.url);
    if (img?.url) return img.url;
  }
  return null;
}


bwmxmd({
  pattern: "hentaivid",
  aliases: ["nsfwvideo", "nsfwvid"],
  category: "Downloader",
  description: "Download a random video from the list"
},
async (from, client, conText) => {
  const { mek } = conText;

  try {
    const response = await axios.get(XMD.API.DOWNLOAD.HENTAIVID, { timeout: 100000 });
    const videos = response.data?.result;
    if (!Array.isArray(videos) || videos.length === 0) return;

    const pick = videos[Math.floor(Math.random() * videos.length)];
    const videoUrl = pick.media?.video_url || pick.media?.fallback_url;
    if (!videoUrl) return;

    const fileName = `${pick.title}.mp4`.replace(/[^\w\s.-]/gi, '');
    const caption = `🎬 *${pick.title}*\n📁 Category: ${pick.category}\n👁️ Views: ${pick.views_count}\n🔁 Shares: ${pick.share_count}`;

    const contextInfo = {
      externalAdReply: {
        title: pick.title,
        body: `${pick.category} • ${pick.views_count} views`,
        mediaType: 1,
        sourceUrl: pick.link,
        thumbnailUrl: XMD.SFM_FAVICON,
        renderLargerThumbnail: false
      }
    };

    await client.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      fileName,
      caption,
      contextInfo
    }, { quoted: mek });

  } catch (error) {
    console.error("Random video download error:", error);
  }
});
//========================================================================================================================


bwmxmd({
  pattern: "facebook",
  aliases: ["fbdl", "fb"],
  category: "Downloader",
  description: "Download video from Facebook"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) return;

  try {
    let videoUrl = null;

    try {
      const apiUrl = XMD.API.DOWNLOAD.FACEBOOK(q);
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const result = response.data?.result;
      videoUrl = result?.media?.hd || result?.media?.sd || result?.hd || result?.sd || (typeof result === 'string' ? result : null);
    } catch (e) {}

    if (!videoUrl) {
      try {
        const bk9Res = await axios.get(XMD.API.DOWNLOAD.BK9_FACEBOOK(q), { timeout: 15000 });
        if (bk9Res.data?.status && bk9Res.data?.BK9) {
          const bk9 = bk9Res.data.BK9;
          videoUrl = extractBk9Video(bk9);
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      try {
        const gRes = await axios.get(XMD.GIFTED.DOWNLOAD.FACEBOOK(q), { timeout: 15000 });
        const d = gRes.data?.result;
        if (d) videoUrl = d.hd || d.sd || d.video || d.url || d.download || (typeof d === 'string' ? d : null);
      } catch (e) {}
    }

    if (!videoUrl) {
      return reply("❌ No video found for this Facebook link.");
    }

    await client.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: "video/mp4"
    }, { quoted: mek });

  } catch (error) {
    console.error("Facebook download error:", error);
    reply("❌ Failed to download Facebook video.");
  }
});
//======================================================================================================================== 


bwmxmd({
  pattern: "apk",
  aliases: ["aptoide", "apkdl"],
  category: "Downloader",
  description: "Download APK from Aptoide"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q) return;

  try {
    let sent = false;

    try {
      const searchUrl = XMD.API.SEARCH.APTOIDE(q);
      const response = await axios.get(searchUrl, { timeout: 15000 });
      const apps = response.data?.result?.datalist?.list;
      if (Array.isArray(apps) && apps.length > 0) {
        const app = apps[0];
        const file = app.file;
        if (file?.path) {
          const fileName = `${app.name}.apk`.replace(/[^\w\s.-]/gi, '');
          const caption = `📦 *${app.name}*\n🧑‍💻 Developer: ${app.developer?.name || "Unknown"}\n📦 Package: ${app.package}\n📏 Size: ${(file.filesize / 1024 / 1024).toFixed(2)} MB\n⭐ Rating: ${app.stats?.rating?.avg || "N/A"} (${app.stats?.rating?.total || 0} votes)`;

          const contextInfo = {
            externalAdReply: {
              title: app.name,
              body: `${file.vername} • ${app.package}`,
              mediaType: 1,
              sourceUrl: XMD.EXTERNAL.APTOIDE(app.package),
              thumbnailUrl: app.icon,
              renderLargerThumbnail: false
            }
          };

          await client.sendMessage(from, {
            document: { url: file.path },
            mimetype: "application/vnd.android.package-archive",
            fileName,
            caption,
            contextInfo
          }, { quoted: mek });
          sent = true;
        }
      }
    } catch (e) {}

    if (!sent) {
      try {
        const bk9Res = await axios.get(XMD.API.DOWNLOAD.BK9_APK(q), { timeout: 15000 });
        if (bk9Res.data?.status && bk9Res.data?.BK9?.dllink) {
          const apk = bk9Res.data.BK9;
          const fileName = `${apk.name || q}.apk`.replace(/[^\w\s.-]/gi, '');
          const caption = `📦 *${apk.name || q}*\n📦 Package: ${apk.package || q}\n📅 Updated: ${apk.lastup || 'N/A'}`;

          await client.sendMessage(from, {
            document: { url: apk.dllink },
            mimetype: "application/vnd.android.package-archive",
            fileName,
            caption,
            contextInfo: {
              externalAdReply: {
                title: apk.name || q,
                body: apk.package || q,
                mediaType: 1,
                thumbnailUrl: apk.icon,
                renderLargerThumbnail: false
              }
            }
          }, { quoted: mek });
          sent = true;
        }
      } catch (e) {}
    }

    if (!sent) {
      try {
        const gRes = await axios.get(XMD.GIFTED.DOWNLOAD.APKDL(q), { timeout: 20000 });
        const d = gRes.data?.result;
        if (d?.download_url) {
          const fileName = `${d.appname || q}.apk`.replace(/[^\w\s.-]/gi, '');
          await client.sendMessage(from, {
            document: { url: d.download_url },
            mimetype: d.mimetype || 'application/vnd.android.package-archive',
            fileName,
            caption: `📦 *${d.appname || q}*\n👨‍💻 Developer: ${d.developer || 'Unknown'}`,
            contextInfo: { externalAdReply: { title: d.appname || q, body: d.developer || '', mediaType: 1, thumbnailUrl: d.appicon, renderLargerThumbnail: false } }
          }, { quoted: mek });
          sent = true;
        }
      } catch (e) {}
    }

    if (!sent) {
      reply("❌ Could not find or download this APK.");
    }

  } catch (error) {
    console.error("APK download error:", error);
  }
});
//========================================================================================================================


bwmxmd({
  pattern: "porn", 
  aliases: ["xvideo", "xvid"],
  category: "Downloader",
  description: "Download video from videos.com"
},
async (from, client, conText) => {
  const { q, mek } = conText;

  if (!q) return;

  try {
    let videoUrl = q;

    if (!/^https?:\/\/(www\.)?xvideos\.com\//i.test(q)) {
      const searchRes = await axios.get(XMD.API.SEARCH.XVIDEOS(q));
      const results = searchRes.data?.result;
      const topResult = Array.isArray(results) ? results.find(x => x.url?.includes("xvideos.com")) : null;
      if (!topResult?.url) return;
      videoUrl = topResult.url;
    }

    const dlRes = await axios.get(XMD.API.NSFW.XVIDEOS_DL(videoUrl));
    const data = dlRes.data?.result?.data;
    const bestVideo = data?.video_quality?.find(v => v.url && v.mime_type === "video/mp4");

    if (!bestVideo?.url) return;

    const title = (data.title || 'Video').replace(/&colon;/g, ':').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const fileName = `${title}.mp4`.replace(/[^\w\s.-]/gi, '');
    const contextInfo = {
      externalAdReply: {
        title: title,
        body: `Quality: ${bestVideo.type || 'HD'}`,
        mediaType: 1,
        sourceUrl: videoUrl,
        thumbnailUrl: data.image || undefined,
        renderLargerThumbnail: false
      }
    };

    await client.sendMessage(from, {
      video: { url: bestVideo.url },
      mimetype: "video/mp4",
      fileName,
      contextInfo
    }, { quoted: mek });

  } catch (error) {
    console.error("Video site download error:", error);
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "pinterest",
  aliases: ["pindl", "pin"],
  category: "downloader",
  description: "Download media from Pinterest"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) return;

  try {
    let sent = false;

    try {
      const apiUrl = XMD.API.DOWNLOAD.PINDL2(q);
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const result = response.data?.result;

      if (result?.success && Array.isArray(result.medias) && result.medias.length > 0) {
        const title = result.title || "Pinterest Media";
        for (const media of result.medias) {
          const { url, extension, videoAvailable } = media;
          if (!url) continue;
          const fileName = `${title}.${extension}`.replace(/[^\w\s.-]/gi, '');
          const mimetype = extension === "mp4" ? "video/mp4" : "image/jpeg";
          await client.sendMessage(from, {
            [videoAvailable ? "video" : "image"]: { url },
            mimetype,
            fileName
          }, { quoted: mek });
          sent = true;
        }
      }
    } catch (e) {}

    if (!sent) {
      try {
        const altUrl = XMD.API.DOWNLOAD.PINTEREST(q);
        const altResponse = await axios.get(altUrl, { timeout: 15000 });
        const altResult = altResponse.data?.result;
        const mediaUrl = altResult?.url || altResult?.image || altResult?.video || (typeof altResult === 'string' ? altResult : null);
        if (mediaUrl) {
          const isVideo = mediaUrl.includes('.mp4') || altResult?.video;
          await client.sendMessage(from, {
            [isVideo ? "video" : "image"]: { url: mediaUrl },
            mimetype: isVideo ? "video/mp4" : "image/jpeg"
          }, { quoted: mek });
          sent = true;
        }
      } catch (e) {}
    }

    if (!sent) {
      reply("❌ Failed to download Pinterest media.");
    }

  } catch (error) {
    console.error("Pinterest download error:", error);
    reply("❌ Failed to download Pinterest media.");
  }
});


//========================================================================================================================


bwmxmd({
  pattern: "spotify",
  aliases: ["spot", "spdl"],
  category: "Downloader",
  description: "Download track from Spotify"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q) return;

  try {
    const apiUrl = XMD.API.DOWNLOAD.SPOTIFY(q);
    const response = await axios.get(apiUrl, { timeout: 100000 });
    const result = response.data?.result;
    const track = result?.track;

    if (!track?.downloadLink) {
      return reply("❌ Could not find or download this Spotify track.");
    }

    const fileName = `${track.title || track.name || 'Spotify Track'}.mp3`.replace(/[^\w\s.-]/gi, '');
    const contextInfo = {
      externalAdReply: {
        title: track.title || track.name || 'Spotify Track',
        body: `${track.artist || 'Unknown'} • ${track.duration || ''}`,
        mediaType: 1,
        sourceUrl: track.url || q,
        thumbnailUrl: track.thumbnail,
        renderLargerThumbnail: false
      }
    };

    await client.sendMessage(from, {
      audio: { url: track.downloadLink },
      mimetype: "audio/mpeg",
      fileName,
      contextInfo
    }, { quoted: mek });

    await client.sendMessage(from, {
      document: { url: track.downloadLink },
      mimetype: "audio/mpeg",
      fileName,
      contextInfo: {
        ...contextInfo,
        externalAdReply: {
          ...contextInfo.externalAdReply,
          body: "Document version - Powered by Keith API"
        }
      }
    }, { quoted: mek });

  } catch (error) {
    console.error("Spotify download error:", error);
    reply("❌ Failed to download Spotify track.");
  }
});


//========================================================================================================================


bwmxmd({
  pattern: "instagram",
  aliases: ["insta", "igdl", "ig"],
  category: "Downloader",
  description: "Download Instagram media"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) {
    return reply("❌ Provide a valid Instagram URL.");
  }

  try {
    let sent = false;

    try {
      const apiUrl = XMD.API.DOWNLOAD.INSTADL(q);
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const result = response.data?.result;

      if (result && !(typeof result === 'object' && Object.keys(result).length === 0)) {
        const mediaUrl = typeof result === 'string' ? result : (result?.url || result?.video || result?.download || null);
        if (mediaUrl) {
          const isVideo = mediaUrl.includes('.mp4') || !mediaUrl.includes('.jpg');
          await client.sendMessage(from, {
            [isVideo ? "video" : "image"]: { url: mediaUrl },
            mimetype: isVideo ? "video/mp4" : "image/jpeg"
          }, { quoted: mek });
          sent = true;
        }
      }
    } catch (e) {}

    if (!sent) {
      try {
        const bk9Res = await axios.get(XMD.API.DOWNLOAD.BK9_INSTAGRAM(q), { timeout: 15000 });
        if (bk9Res.data?.status && bk9Res.data?.BK9) {
          const bk9 = bk9Res.data.BK9;
          if (Array.isArray(bk9) && bk9.length > 0) {
            for (const item of bk9) {
              if (!item.url) continue;
              const isVideo = item.type === 'video' || item.type === 'unknown' || item.url.includes('.mp4');
              await client.sendMessage(from, {
                [isVideo ? "video" : "image"]: { url: item.url },
                mimetype: isVideo ? "video/mp4" : "image/jpeg"
              }, { quoted: mek });
              sent = true;
            }
          }
        }
      } catch (e) {}
    }

    if (!sent) {
      try {
        const bk9Res2 = await axios.get(XMD.API.DOWNLOAD.BK9_INSTAGRAM2(q), { timeout: 15000 });
        if (bk9Res2.data?.status && bk9Res2.data?.BK9?.formats) {
          const formats = bk9Res2.data.BK9.formats;
          for (const fmt of formats) {
            if (!fmt.url) continue;
            const isVideo = fmt.type === 'video';
            await client.sendMessage(from, {
              [isVideo ? "video" : "image"]: { url: fmt.url },
              mimetype: isVideo ? "video/mp4" : "image/jpeg"
            }, { quoted: mek });
            sent = true;
          }
        }
      } catch (e) {}
    }

    if (!sent) {
      try {
        const gRes = await axios.get(XMD.GIFTED.DOWNLOAD.INSTADL(q), { timeout: 15000 });
        const d = gRes.data?.result;
        const mediaUrl = d?.url || d?.video || d?.image || d?.download || (typeof d === 'string' ? d : null);
        if (mediaUrl) {
          const isVideo = mediaUrl.includes('.mp4') || !mediaUrl.includes('.jpg');
          await client.sendMessage(from, {
            [isVideo ? 'video' : 'image']: { url: mediaUrl },
            mimetype: isVideo ? 'video/mp4' : 'image/jpeg'
          }, { quoted: mek });
          sent = true;
        }
      } catch (e) {}
    }

    if (!sent) {
      reply("❌ No media found for this Instagram link.");
    }

  } catch (error) {
    console.error("Instagram download error:", error);
    reply("❌ Failed to download Instagram media.");
  }
});

//========================================================================================================================


bwmxmd({
  pattern: "mfire",
  aliases: ["mediafire", "mf"],
  category: "Downloader",
  description: "Download file from MediaFire"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) return;

  try {
    let dlLink = null;
    let fileName = 'MediaFire_File';
    let fileSize = 'Unknown size';
    let fileMime = 'application/octet-stream';

    try {
      const apiUrl = XMD.API.DOWNLOAD.MFIRE(q);
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const result = response.data?.result;
      dlLink = result?.dl_link || result?.download || result?.url;
      fileName = result?.fileName || result?.name || result?.filename || fileName;
      fileSize = result?.size || fileSize;
      fileMime = result?.fileType || result?.mime || fileMime;
    } catch (e) {}

    if (!dlLink) {
      try {
        const bk9Res = await axios.get(XMD.API.DOWNLOAD.BK9_MEDIAFIRE(q), { timeout: 15000 });
        if (bk9Res.data?.status && bk9Res.data?.BK9?.link) {
          const bk9 = bk9Res.data.BK9;
          dlLink = bk9.link;
          fileName = bk9.name || fileName;
          fileSize = bk9.size || fileSize;
          fileMime = bk9.mime || fileMime;
        }
      } catch (e) {}
    }

    if (!dlLink) {
      try {
        const gRes = await axios.get(XMD.GIFTED.DOWNLOAD.MEDIAFIRE(q), { timeout: 15000 });
        const d = gRes.data?.result;
        if (d) dlLink = d.url || d.download_url || d.link || (typeof d === 'string' ? d : null);
      } catch (e) {}
    }

    if (!dlLink) {
      return reply("❌ Could not get download link from MediaFire.");
    }

    const cleanName = fileName.replace(/[^\w\s.-]/gi, '');
    const contextInfo = {
      externalAdReply: {
        title: "MediaFire Download",
        body: `${cleanName} • ${fileSize}`,
        mediaType: 1,
        sourceUrl: q,
        renderLargerThumbnail: false
      }
    };

    await client.sendMessage(from, {
      document: { url: dlLink },
      mimetype: fileMime,
      fileName: cleanName,
      contextInfo
    }, { quoted: mek });

  } catch (error) {
    console.error("MediaFire download error:", error);
    reply("❌ Failed to download from MediaFire.");
  }
});

//========================================================================================================================


bwmxmd({
  pattern: "twitter",
  aliases: ["tw", "twt", "xdl"],
  category: "Downloader",
  description: "Download video from Twitter/X"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) return;

  try {
    let videoUrl = null;
    let caption = '';

    try {
      const apiUrl = XMD.API.DOWNLOAD.TWITTER(q);
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const result = response.data?.result;
      if (result) {
        videoUrl = result?.video_hd || result?.video_sd || result?.video || result?.hd || result?.sd || result?.url;
        if (videoUrl && videoUrl.includes('/undefined')) videoUrl = null;
        if (result?.desc) caption = `📝 ${result.desc}`;
      }
    } catch (e) {}

    if (!videoUrl) {
      try {
        const bk9Res = await axios.get(XMD.API.DOWNLOAD.BK9_TWITTER(q), { timeout: 15000 });
        if (bk9Res.data?.status && bk9Res.data?.BK9) {
          const bk9 = bk9Res.data.BK9;
          videoUrl = bk9.HD || bk9.SD;
          if (bk9.caption) caption = `📝 ${bk9.caption}`;
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      try {
        const bk9Res2 = await axios.get(XMD.API.DOWNLOAD.BK9_TWITTER2(q), { timeout: 15000 });
        if (bk9Res2.data?.status && bk9Res2.data?.BK9) {
          const bk9 = bk9Res2.data.BK9;
          if (Array.isArray(bk9.BK9)) {
            const vid = bk9.BK9.find(x => x.type === 'video');
            if (vid?.url) videoUrl = vid.url;
          }
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      try {
        const gRes = await axios.get(XMD.GIFTED.DOWNLOAD.TWITTER(q), { timeout: 15000 });
        const d = gRes.data?.result;
        if (d) videoUrl = d.hd || d.sd || d.video_hd || d.video_sd || d.url || d.video || (typeof d === 'string' ? d : null);
      } catch (e) {}
    }

    if (!videoUrl) {
      return reply("❌ No video found for this Twitter/X link.");
    }

    await client.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      caption
    }, { quoted: mek });

  } catch (error) {
    console.error("Twitter download error:", error);
    reply("❌ Failed to download Twitter video.");
  }
});




//========================================================================================================================
bwmxmd({
  pattern: "soundcloud",
  aliases: ["scdl", "sc"],
  category: "Downloader",
  description: "Download track from SoundCloud"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q) return;

  try {
    let trackUrl = q;
    let trackTitle = q;

    if (!/^https?:\/\/(m\.)?soundcloud\.com\//i.test(q)) {
      const searchRes = await axios.get(XMD.API.SEARCH.SOUNDCLOUD(q));
      const searchResults = searchRes.data?.result?.result;
      const topTrack = Array.isArray(searchResults) ? searchResults.find(x => x.url?.includes("soundcloud.com") && (x.timestamp || x.duration || (x.url && !x.url.includes('/sets/') && !x.url.endsWith('.com') && x.url.split('/').length > 4))) : null;
      if (!topTrack?.url) {
        return reply("❌ No SoundCloud track found for this query.");
      }
      trackUrl = topTrack.url;
      trackTitle = topTrack.title || q;
    }

    const dlRes = await axios.get(XMD.API.DOWNLOAD.SOUNDCLOUD(trackUrl), { timeout: 100000 });
    const dlData = dlRes.data;

    let audioUrl = null;
    let trackInfo = {};

    if (dlData?.data?.medias) {
      const media = dlData.data.medias.find(m => m.audioAvailable && m.url);
      if (media) {
        audioUrl = media.url;
        trackInfo = dlData.data;
      }
    } else if (dlData?.result?.medias) {
      const media = dlData.result.medias.find(m => m.audioAvailable && m.url);
      if (media) {
        audioUrl = media.url;
        trackInfo = dlData.result;
      }
    } else if (dlData?.result?.url || dlData?.result?.download) {
      audioUrl = dlData.result.url || dlData.result.download;
      trackInfo = dlData.result;
    } else if (typeof dlData?.result === 'string') {
      audioUrl = dlData.result;
    }

    if (!audioUrl) {
      return reply("❌ Could not download this SoundCloud track.");
    }

    const title = trackInfo.title || trackTitle;
    const fileName = `${title}.mp3`.replace(/[^\w\s.-]/gi, '');
    const contextInfo = {
      externalAdReply: {
        title: title,
        body: `${trackInfo.duration || ''} • SoundCloud`,
        mediaType: 1,
        sourceUrl: trackInfo.url || trackUrl,
        thumbnailUrl: trackInfo.thumbnail,
        renderLargerThumbnail: false
      }
    };

    await client.sendMessage(from, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName,
      contextInfo
    }, { quoted: mek });

    await client.sendMessage(from, {
      document: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName,
      contextInfo: {
        ...contextInfo,
        externalAdReply: {
          ...contextInfo.externalAdReply,
          body: "Document version - Powered by Keith API"
        }
      }
    }, { quoted: mek });

  } catch (error) {
    console.error("SoundCloud download error:", error);
    reply("❌ Failed to download SoundCloud track.");
  }
});


//========================================================================================================================


bwmxmd({
  pattern: "tiktok",
  aliases: ["ttdl", "tt"],
  category: "Downloader",
  description: "Download video from TikTok"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) {
    return reply("❌ Provide a valid TikTok URL.");
  }

  try {
    let videoUrl = null;

    try {
      const apiUrl = XMD.API.DOWNLOAD.TIKTOKDL3(q);
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const result = response.data?.result;
      if (typeof result === 'string') videoUrl = result;
      else if (result?.downloadUrls?.mp4?.[0]) videoUrl = result.downloadUrls.mp4[0];
      else if (result?.url) videoUrl = result.url;
      else if (result?.video) videoUrl = result.video;
    } catch (e) {}

    if (!videoUrl) {
      try {
        const bk9Res = await axios.get(XMD.API.DOWNLOAD.BK9_TIKTOK(q), { timeout: 15000 });
        if (bk9Res.data?.status && bk9Res.data?.BK9) {
          videoUrl = typeof bk9Res.data.BK9.BK9 === 'string' ? bk9Res.data.BK9.BK9 : extractBk9Video(bk9Res.data.BK9);
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      try {
        const bk9Res2 = await axios.get(XMD.API.DOWNLOAD.BK9_TIKTOK2(q), { timeout: 15000 });
        if (bk9Res2.data?.status && bk9Res2.data?.BK9) {
          videoUrl = bk9Res2.data.BK9.video?.noWatermark || extractBk9Video(bk9Res2.data.BK9);
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      try {
        const bk9Res3 = await axios.get(XMD.API.DOWNLOAD.BK9_TIKTOK3(q), { timeout: 15000 });
        if (bk9Res3.data?.status && bk9Res3.data?.BK9) {
          videoUrl = extractBk9Video(bk9Res3.data.BK9);
        }
      } catch (e) {}
    }

    // Gifted API fallbacks for TikTok (v1–v4)
    const giftedTTUrls = [
      XMD.GIFTED.DOWNLOAD.TIKTOK_V1, XMD.GIFTED.DOWNLOAD.TIKTOK_V2,
      XMD.GIFTED.DOWNLOAD.TIKTOK_V3, XMD.GIFTED.DOWNLOAD.TIKTOK_V4
    ];
    for (const fn of giftedTTUrls) {
      if (videoUrl) break;
      try {
        const r = await axios.get(fn(q), { timeout: 15000 });
        const d = r.data?.result;
        if (!d) continue;
        videoUrl = d.play || d.hdplay || d.wmplay || d.video || d.url ||
          d.download || d.video?.noWatermark || (typeof d === 'string' ? d : null);
      } catch (e) {}
    }

    if (!videoUrl) {
      return reply("❌ No downloadable video found for this TikTok link.");
    }

    await client.sendMessage(
      from,
      {
        video: { url: videoUrl },
        mimetype: "video/mp4"
      },
      { quoted: mek }
    );
  } catch (error) {
    console.error("TikTok download error:", error);
    reply("❌ Failed to download TikTok video.");
  }
});


//========================================================================================================================


bwmxmd({
  pattern: "likee",
  aliases: ["likeedl"],
  category: "Downloader",
  description: "Download video from Likee"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q || !q.startsWith("http")) {
    return reply("❌ Provide a valid Likee URL.");
  }

  try {
    const response = await axios.get(XMD.API.DOWNLOAD.BK9_LIKEE(q), { timeout: 100000 });
    if (!response.data?.status || !response.data?.BK9) {
      return reply("❌ Could not download from this Likee link.");
    }

    const bk9 = response.data.BK9;
    const dlLinks = bk9.downloadLinks;

    if (!Array.isArray(dlLinks) || dlLinks.length === 0) {
      return reply("❌ No video found for this Likee link.");
    }

    const noWatermark = dlLinks.find(x => x.type === 'video_without_watermark');
    const withWatermark = dlLinks.find(x => x.type === 'video_with_watermark');
    const videoUrl = noWatermark?.url || withWatermark?.url || dlLinks[0]?.url;

    if (!videoUrl) {
      return reply("❌ No video found for this Likee link.");
    }

    const caption = bk9.description ? `📝 ${bk9.description}` : '';

    await client.sendMessage(from, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      caption,
      contextInfo: {
        externalAdReply: {
          title: "Likee Video",
          body: `👁️ ${bk9.views || '0'} views • ❤️ ${bk9.likes || '0'} likes`,
          mediaType: 1,
          sourceUrl: q,
          thumbnailUrl: bk9.thumbnail,
          renderLargerThumbnail: false
        }
      }
    }, { quoted: mek });

  } catch (error) {
    console.error("Likee download error:", error);
    reply("❌ Failed to download Likee video.");
  }
});


//========================================================================================================================


bwmxmd({
  pattern: "ringtone",
  aliases: ["ring", "tone"],
  category: "Downloader",
  description: "Search and download ringtones"
},
async (from, client, conText) => {
  const { q, mek, reply } = conText;

  if (!q) {
    return reply("❌ Provide a search query for ringtones. Example: .ringtone Quran");
  }

  try {
    const response = await axios.get(XMD.API.DOWNLOAD.BK9_RINGTONE(q), { timeout: 100000 });
    if (!response.data?.status || !response.data?.BK9) {
      return reply("❌ No ringtones found for this query.");
    }

    const tones = response.data.BK9;
    if (!Array.isArray(tones) || tones.length === 0) {
      return reply("❌ No ringtones found for this query.");
    }

    const pick = tones[0];
    if (!pick.audio) {
      return reply("❌ Could not get ringtone audio.");
    }

    const fileName = `${pick.title || q}.mp3`.replace(/[^\w\s.-]/gi, '');

    await client.sendMessage(from, {
      audio: { url: pick.audio },
      mimetype: "audio/mpeg",
      fileName,
      contextInfo: {
        externalAdReply: {
          title: pick.title || 'Ringtone',
          body: `🔔 Ringtone Download`,
          mediaType: 1,
          sourceUrl: pick.source || '',
          renderLargerThumbnail: false
        }
      }
    }, { quoted: mek });

    if (tones.length > 1) {
      let list = `🔔 *More ringtones for "${q}":*\n\n`;
      const maxShow = Math.min(tones.length, 10);
      for (let i = 1; i < maxShow; i++) {
        list += `${i}. ${tones[i].title}\n`;
      }
      await reply(list);
    }

  } catch (error) {
    console.error("Ringtone download error:", error);
    reply("❌ Failed to download ringtone.");
  }
});


//========================================================================================================================
