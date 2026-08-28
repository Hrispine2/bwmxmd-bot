const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const mime = require('mime-types');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function uploadToUguu(filePath) {
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  const form = new FormData();
  form.append('files[]', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: mimeType
  });
  const res = await axios.post('https://uguu.se/upload.php', form, {
    headers: { ...form.getHeaders(), 'origin': 'https://uguu.se', 'referer': 'https://uguu.se/' }
  });
  if (res.data?.success && res.data?.files?.[0]?.url) return res.data.files[0].url;
  throw new Error('Uguu upload failed');
}

async function getQuotedMediaUrl(client, quotedMsg) {
  const types = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
  for (const t of types) {
    if (quotedMsg[t]) {
      const tmpDir = path.join(__dirname, '..', 'tmp');
      await fs.ensureDir(tmpDir);
      const ext = mime.extension(quotedMsg[t].mimetype || 'application/octet-stream') || 'bin';
      const filePath = path.join(tmpDir, `upload-${Date.now()}.${ext}`);
      const saved = await client.downloadAndSaveMediaMessage(quotedMsg[t], filePath.replace(/\.[^.]+$/, ''));
      return { url: await uploadToUguu(saved), filePath: saved };
    }
  }
  return null;
}

function extractUrl(d) {
  const r = d?.result;
  if (!r) return null;
  if (typeof r === 'string' && r.startsWith('http')) return r;
  return r?.url || r?.image || r?.image_url || r?.output || r?.result || r?.enhanced || r?.data || null;
}

async function toolReact(client, mek, from, fn) {
  try {
    await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    await fn();
    await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
  } catch (e) {
    console.error('[BWM] tools error:', e.message);
    await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

bwmxmd({
  pattern: 'vocalremover', aliases: ['vocals', 'vr'],
  category: 'Tools', description: 'Separate vocals from instrumentals (reply to audio or give URL)'
}, async (from, client, conText) => {
  const { q, mek, reply, quotedMsg } = conText;
  let audioUrl = q;
  let tempFile = null;
  if (!audioUrl && quotedMsg) {
    const media = await getQuotedMediaUrl(client, quotedMsg);
    if (media) { audioUrl = media.url; tempFile = media.filePath; }
  }
  if (!audioUrl) return reply('🎵 Reply to an audio message or provide a URL.\n\nExample: !vocalremover https://example.com/song.mp3');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.VOCAL_REMOVER(audioUrl), { timeout: 120000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const r = d.result;
      const vocals = r?.vocals || r?.vocal || r?.voice;
      const instrumental = r?.instrumental || r?.music || r?.background;
      if (vocals) await client.sendMessage(from, { audio: { url: vocals }, mimetype: 'audio/mpeg', fileName: 'vocals.mp3' }, { quoted: mek });
      if (instrumental) await client.sendMessage(from, { audio: { url: instrumental }, mimetype: 'audio/mpeg', fileName: 'instrumental.mp3' }, { quoted: mek });
      if (!vocals && !instrumental) {
        const url = extractUrl(d);
        if (url) await client.sendMessage(from, { audio: { url }, mimetype: 'audio/mpeg', fileName: 'output.mp3' }, { quoted: mek });
        else throw new Error('No audio URLs in response');
      }
    });
  } catch (e) {
    reply(`❌ Vocal remover failed: ${e.message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile).catch?.(() => {});
  }
});

bwmxmd({
  pattern: 'vocalremoverv2', aliases: ['vrv2', 'vocals2'],
  category: 'Tools', description: 'Separate vocals from instrumentals V2 (supports YouTube, TikTok, direct URLs)'
}, async (from, client, conText) => {
  const { q, mek, reply, quotedMsg } = conText;
  let audioUrl = q;
  let tempFile = null;
  if (!audioUrl && quotedMsg) {
    const media = await getQuotedMediaUrl(client, quotedMsg);
    if (media) { audioUrl = media.url; tempFile = media.filePath; }
  }
  if (!audioUrl) return reply('🎵 Provide a YouTube/TikTok link or audio URL.\n\nExample: !vrv2 https://youtube.com/watch?v=...');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.VOCAL_REMOVER_V2(audioUrl), { timeout: 120000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const r = d.result;
      const vocals = r?.vocals || r?.vocal || r?.voice;
      const instrumental = r?.instrumental || r?.music || r?.background;
      if (vocals) await client.sendMessage(from, { audio: { url: vocals }, mimetype: 'audio/mpeg', fileName: 'vocals.mp3' }, { quoted: mek });
      if (instrumental) await client.sendMessage(from, { audio: { url: instrumental }, mimetype: 'audio/mpeg', fileName: 'instrumental.mp3' }, { quoted: mek });
      if (!vocals && !instrumental) {
        const url = extractUrl(d);
        if (url) await client.sendMessage(from, { audio: { url }, mimetype: 'audio/mpeg', fileName: 'output.mp3' }, { quoted: mek });
        else throw new Error('No audio URLs in response');
      }
    });
  } catch (e) {
    reply(`❌ Vocal remover V2 failed: ${e.message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile).catch?.(() => {});
  }
});

bwmxmd({
  pattern: 'noiseremover', aliases: ['denoise', 'noiseclean'],
  category: 'Tools', description: 'Remove background noise from audio (reply to audio or give URL)'
}, async (from, client, conText) => {
  const { q, mek, reply, quotedMsg } = conText;
  let audioUrl = q;
  let tempFile = null;
  if (!audioUrl && quotedMsg) {
    const media = await getQuotedMediaUrl(client, quotedMsg);
    if (media) { audioUrl = media.url; tempFile = media.filePath; }
  }
  if (!audioUrl) return reply('🎙️ Reply to an audio or provide a URL.\n\nExample: !noiseremover https://example.com/audio.mp3');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.NOISE_REMOVER(audioUrl), { timeout: 60000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const url = d.result?.enhanced || extractUrl(d);
      if (!url) throw new Error('No output URL');
      await client.sendMessage(from, { audio: { url }, mimetype: 'audio/mpeg', fileName: 'cleaned.mp3', caption: '🎙️ *Noise removed!*' }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Noise remover failed: ${e.message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile).catch?.(() => {});
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

async function imgToolCmd(from, client, conText, apiFn, label) {
  const { mek, reply, quotedMsg } = conText;
  if (!quotedMsg?.imageMessage) return reply(`🖼️ Reply to an image to use ${label}.`);
  let tempFile = null;
  try {
    await toolReact(client, mek, from, async () => {
      const media = await getQuotedMediaUrl(client, quotedMsg);
      if (!media) throw new Error('Could not upload image');
      tempFile = media.filePath;
      const res = await axios.get(apiFn(media.url), { timeout: 60000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const url = extractUrl(d);
      if (!url) throw new Error('No image URL in response');
      await client.sendMessage(from, { image: { url }, caption: `✅ *${label}*` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ ${label} failed: ${e.message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch {}
  }
}

bwmxmd({ pattern: 'removebgg', aliases: ['rmbgg', 'bgremoveg'], category: 'Tools', description: 'Remove image background' },
  async (from, client, conText) => imgToolCmd(from, client, conText, XMD.GIFTED.TOOLS.REMOVE_BG, 'Background Removed'));

bwmxmd({ pattern: 'removebgv2', aliases: ['rmbgv2', 'bgremovev2'], category: 'Tools', description: 'Remove image background V2' },
  async (from, client, conText) => imgToolCmd(from, client, conText, XMD.GIFTED.TOOLS.REMOVE_BG_V2, 'Background Removed V2'));

bwmxmd({ pattern: 'remini', aliases: ['enhance', 'hdenihance'], category: 'Tools', description: 'Enhance photo quality with Remini AI' },
  async (from, client, conText) => imgToolCmd(from, client, conText, XMD.GIFTED.TOOLS.REMINI, 'Remini Enhanced'));

bwmxmd({ pattern: 'upscaleimg', aliases: ['imgupscale', 'upscalepic'], category: 'Tools', description: 'Upscale image using AI' },
  async (from, client, conText) => imgToolCmd(from, client, conText, (url) => XMD.GIFTED.TOOLS.IMG_UPSCALER(url), 'Image Upscaled'));

bwmxmd({ pattern: 'enhanceimg', aliases: ['imgenhance', 'enhancepic'], category: 'Tools', description: 'Enhance image quality with AI' },
  async (from, client, conText) => imgToolCmd(from, client, conText, XMD.GIFTED.TOOLS.IMG_ENHANCER, 'Image Enhanced'));

bwmxmd({ pattern: 'watermarkremove', aliases: ['rmwatermark', 'rmwm'], category: 'Tools', description: 'Remove watermark from image' },
  async (from, client, conText) => imgToolCmd(from, client, conText, XMD.GIFTED.TOOLS.WATERMARK_RM, 'Watermark Removed'));

bwmxmd({ pattern: 'magiceraser', aliases: ['eraseobj', 'objremove'], category: 'Tools', description: 'Remove objects from image with AI' },
  async (from, client, conText) => imgToolCmd(from, client, conText, XMD.GIFTED.TOOLS.MAGIC_ERASER, 'Object Erased'));

bwmxmd({
  pattern: 'ocr', aliases: ['readimg', 'extracttext', 'img2text'],
  category: 'Tools', description: 'Extract text from an image (OCR)'
}, async (from, client, conText) => {
  const { mek, reply, quotedMsg } = conText;
  if (!quotedMsg?.imageMessage) return reply('🖼️ Reply to an image to extract its text.');
  let tempFile = null;
  try {
    await toolReact(client, mek, from, async () => {
      const media = await getQuotedMediaUrl(client, quotedMsg);
      if (!media) throw new Error('Could not upload image');
      tempFile = media.filePath;
      const res = await axios.get(XMD.GIFTED.TOOLS.OCR(media.url), { timeout: 30000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const text = d.result?.text || d.result?.data || (typeof d.result === 'string' ? d.result : null);
      if (!text) throw new Error('No text found in image');
      await client.sendMessage(from, { text: `📝 *Extracted Text:*\n\n${text}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ OCR failed: ${e.message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch {}
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENSHOT TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

async function ssCmd(from, client, conText, apiFn, label) {
  const { q, mek, reply } = conText;
  if (!q) return reply(`🌐 Provide a website URL.\n\nExample: !${conText.command} https://example.com`);
  const url = q.startsWith('http') ? q : 'https://' + q;
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(apiFn(url), { timeout: 30000, responseType: 'arraybuffer' });
      const buf = Buffer.from(res.data);
      if (buf.length < 1000) throw new Error('Screenshot failed or page unreachable');
      await client.sendMessage(from, { image: buf, caption: `📸 *${label}*\n🌐 ${url}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Screenshot failed: ${e.message}`);
  }
}

bwmxmd({ pattern: 'ss', aliases: ['screenshot', 'webss'], category: 'Tools', description: 'Full screenshot of a website' },
  async (from, client, conText) => ssCmd(from, client, conText, XMD.GIFTED.TOOLS.SS_FULL, 'Full Screenshot'));

bwmxmd({ pattern: 'ssphone', aliases: ['ssmobile', 'mobiless'], category: 'Tools', description: 'Mobile view screenshot of a website' },
  async (from, client, conText) => ssCmd(from, client, conText, XMD.GIFTED.TOOLS.SS_PHONE, 'Mobile Screenshot'));

bwmxmd({ pattern: 'sstab', aliases: ['sstablet', 'tabss'], category: 'Tools', description: 'Tablet view screenshot of a website' },
  async (from, client, conText) => ssCmd(from, client, conText, XMD.GIFTED.TOOLS.SS_TAB, 'Tablet Screenshot'));

bwmxmd({ pattern: 'sspc', aliases: ['ssdesktop', 'deskss'], category: 'Tools', description: 'Desktop view screenshot of a website' },
  async (from, client, conText) => ssCmd(from, client, conText, XMD.GIFTED.TOOLS.SS_PC, 'Desktop Screenshot'));

// ═══════════════════════════════════════════════════════════════════════════════
// ENCODE / DECODE
// ═══════════════════════════════════════════════════════════════════════════════

async function encodeCmd(from, client, conText, apiFn, label) {
  const { q, mek, reply } = conText;
  if (!q) return reply(`🔐 Provide text.\n\nExample: !${conText.command} Hello World`);
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(apiFn(q), { timeout: 15000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const out = typeof d.result === 'string' ? d.result : d.result?.data || d.result?.result || JSON.stringify(d.result);
      await client.sendMessage(from, { text: `🔐 *${label}*\n\n${out}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ ${label} failed: ${e.message}`);
  }
}

bwmxmd({ pattern: 'ebinary', aliases: ['encode2binary', 'tobinary'], category: 'Tools', description: 'Encode text to binary' },
  async (from, client, conText) => encodeCmd(from, client, conText, XMD.GIFTED.TOOLS.EBINARY, 'Encoded to Binary'));

bwmxmd({ pattern: 'dbinary', aliases: ['decode2binary', 'frombinary'], category: 'Tools', description: 'Decode binary to text' },
  async (from, client, conText) => encodeCmd(from, client, conText, XMD.GIFTED.TOOLS.DBINARY, 'Decoded from Binary'));

bwmxmd({ pattern: 'ebase64', aliases: ['ebase', 'tobase64'], category: 'Tools', description: 'Encode text to Base64' },
  async (from, client, conText) => encodeCmd(from, client, conText, XMD.GIFTED.TOOLS.EBASE64, 'Encoded to Base64'));

bwmxmd({ pattern: 'dbase64', aliases: ['dbase', 'frombase64'], category: 'Tools', description: 'Decode Base64 to text' },
  async (from, client, conText) => encodeCmd(from, client, conText, XMD.GIFTED.TOOLS.DBASE64, 'Decoded from Base64'));

// ═══════════════════════════════════════════════════════════════════════════════
// FUN / CREATIVE TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

bwmxmd({
  pattern: 'ttp', aliases: ['text2pic', 'textpic'],
  category: 'Tools', description: 'Generate a sticker from text'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('✏️ Provide text.\n\nExample: !ttp Hello World');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.TTP(q), { timeout: 20000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const url = extractUrl(d);
      if (!url) throw new Error('No image URL');
      await client.sendMessage(from, { sticker: { url } }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Text to sticker failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'fancy', aliases: ['fancytext', 'styletext'],
  category: 'Tools', description: 'Convert text into fancy stylized fonts'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('✨ Provide text.\n\nExample: !fancy Hello World');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.FANCY(q), { timeout: 15000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const styles = d.result;
      const list = Array.isArray(styles) ? styles.join('\n') : typeof styles === 'object' ? Object.values(styles).join('\n') : styles;
      await client.sendMessage(from, { text: `✨ *Fancy Text Styles for:* _${q}_\n\n${list}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Fancy text failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'fancyv2', aliases: ['fancytext2', 'morestyles'],
  category: 'Tools', description: 'More fancy text styles (V2)'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('✨ Provide text.\n\nExample: !fancyv2 Hello World');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.FANCY_V2(q), { timeout: 15000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const styles = d.result;
      const list = Array.isArray(styles) ? styles.join('\n') : typeof styles === 'object' ? Object.values(styles).join('\n') : styles;
      await client.sendMessage(from, { text: `✨ *More Fancy Styles for:* _${q}_\n\n${list}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Fancy text V2 failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'emojimix', aliases: ['mixemoji', 'emojicombine'],
  category: 'Tools', description: 'Combine two emojis into one image\n\nExample: !emojimix 😀 🔥'
}, async (from, client, conText) => {
  const { arg, mek, reply } = conText;
  const [e1, e2] = (arg || []).filter(Boolean);
  if (!e1 || !e2) return reply('😀+🔥 Provide two emojis.\n\nExample: !emojimix 😀 🔥');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.EMOJIMIX(e1, e2), { timeout: 15000, responseType: 'arraybuffer' });
      const buf = Buffer.from(res.data);
      if (buf.length < 500) throw new Error('Empty image response');
      await client.sendMessage(from, { image: buf, caption: `${e1} + ${e2} = 🎨` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Emoji mix failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'createqr', aliases: ['qr', 'makeqr', 'qrcode'],
  category: 'Tools', description: 'Create a QR code for any text or URL'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('📱 Provide text or URL.\n\nExample: !qr https://github.com');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.CREATE_QR(q), { timeout: 15000, responseType: 'arraybuffer' });
      const buf = Buffer.from(res.data);
      if (buf.length < 500) throw new Error('Empty QR response');
      await client.sendMessage(from, { image: buf, caption: `📱 *QR Code*\n\n${q}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ QR creation failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'readqr', aliases: ['qrscan', 'scanqr', 'decodeqr'],
  category: 'Tools', description: 'Read/scan a QR code from an image (reply to image)'
}, async (from, client, conText) => {
  const { mek, reply, quotedMsg } = conText;
  if (!quotedMsg?.imageMessage) return reply('📱 Reply to an image containing a QR code.');
  let tempFile = null;
  try {
    await toolReact(client, mek, from, async () => {
      const media = await getQuotedMediaUrl(client, quotedMsg);
      if (!media) throw new Error('Could not upload image');
      tempFile = media.filePath;
      const res = await axios.get(XMD.GIFTED.TOOLS.READ_QR(media.url), { timeout: 15000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'QR read failed');
      const data = d.result?.data || d.result?.text || (typeof d.result === 'string' ? d.result : null);
      if (!data) throw new Error('Could not read QR code');
      await client.sendMessage(from, { text: `📱 *QR Code Data:*\n\n${data}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ QR scan failed: ${e.message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch {}
  }
});

bwmxmd({
  pattern: 'carbon', aliases: ['codeimg', 'codebeautify', 'codepic'],
  category: 'Tools', description: 'Generate a beautiful code image'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('💻 Provide code.\n\nExample: !carbon console.log("Hello World")');
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.CARBON(q), { timeout: 20000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const url = extractUrl(d);
      if (!url) throw new Error('No image URL');
      await client.sendMessage(from, { image: { url }, caption: '💻 *Code Image*' }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Carbon failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'quotegen', aliases: ['quotepic', 'qgen'],
  category: 'Tools', description: 'Generate a quote card image\n\nExample: !quotegen Your quote here | YourName'
}, async (from, client, conText) => {
  const { q, mek, reply, pushName } = conText;
  if (!q) return reply('💬 Provide a quote.\n\nExample: !quotegen Life is beautiful | Ibrahim\n\nOr just: !quotegen Life is beautiful');
  const [text, name] = q.split('|').map(s => s.trim());
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.QUOTE_GEN(text, name || pushName), { timeout: 20000, responseType: 'arraybuffer' });
      const buf = Buffer.from(res.data);
      if (buf.length < 500) throw new Error('Empty image');
      await client.sendMessage(from, { image: buf, caption: `💬 "${text}"\n— ${name || pushName}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Quote generator failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'canvascard', aliases: ['card', 'gencard'],
  category: 'Tools', description: 'Generate a canvas card (spotify, youtube, google, etc)\n\nExample: !canvascard spotify | Song Title | Artist Name'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('🎨 Usage: !canvascard <type> | <title> | <text>\n\nTypes: spotify, youtube, google, tiktok, duckduckgo, brave, applemusic, soundcloud, pinterest, playstore, happymod, weather, image\n\nExample: !canvascard spotify | Blinding Lights | The Weeknd');
  const parts = q.split('|').map(s => s.trim());
  const [typeOrTitle, titleOrText, text] = parts;
  const validTypes = ['spotify','youtube','google','tiktok','duckduckgo','brave','applemusic','soundcloud','pinterest','playstore','happymod','apkpure','unsplash','wallpaper','wattpad','weather','sticker','lyrics','shazam','web','image'];
  let cardType = 'spotify', title = typeOrTitle, cardText = titleOrText || '';
  if (validTypes.includes(typeOrTitle.toLowerCase())) {
    cardType = typeOrTitle.toLowerCase();
    title = titleOrText || 'BWM XMD';
    cardText = text || '';
  }
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.CANVAS_CARD(title, cardType, cardText), { timeout: 20000, responseType: 'arraybuffer' });
      const buf = Buffer.from(res.data);
      if (buf.length < 500) throw new Error('Empty card image');
      await client.sendMessage(from, { image: buf, caption: `🎨 *${cardType.toUpperCase()} Card*\n${title}` }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Canvas card failed: ${e.message}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEB / NETWORK TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

bwmxmd({
  pattern: 'dnschecker', aliases: ['dns', 'dnscheck', 'dnsrecords'],
  category: 'Tools', description: 'Check DNS records of a domain'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('🌐 Provide a domain.\n\nExample: !dns google.com');
  const domain = q.replace(/^https?:\/\//, '').split('/')[0];
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.DNS_CHECKER(domain), { timeout: 15000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const records = d.result;
      let out = `🌐 *DNS Records for ${domain}*\n\n`;
      if (Array.isArray(records)) {
        records.slice(0, 20).forEach(r => {
          out += `*${r.type || '?'}*: ${r.value || r.address || r.target || JSON.stringify(r)}\n`;
        });
      } else {
        out += JSON.stringify(records, null, 2);
      }
      await client.sendMessage(from, { text: out }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ DNS check failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'web2zip', aliases: ['webzip', 'websitezip'],
  category: 'Tools', description: 'Download a website as a ZIP file'
}, async (from, client, conText) => {
  const { q, mek, reply } = conText;
  if (!q) return reply('🌐 Provide a website URL.\n\nExample: !web2zip https://example.com');
  const url = q.startsWith('http') ? q : 'https://' + q;
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.WEB2ZIP(url), { timeout: 30000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const zipUrl = d.result?.zipUrl || d.result?.zip || d.result?.url || (typeof d.result === 'string' ? d.result : null);
      if (!zipUrl) throw new Error('No ZIP URL returned');
      await client.sendMessage(from, {
        document: { url: zipUrl },
        mimetype: 'application/zip',
        fileName: `${new URL(url).hostname}.zip`,
        caption: `🗜️ *Website ZIP*\n🌐 ${url}`
      }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Web2Zip failed: ${e.message}`);
  }
});

bwmxmd({
  pattern: 'freeproxy', aliases: ['proxies', 'getproxy'],
  category: 'Tools', description: 'Get a list of free proxies'
}, async (from, client, conText) => {
  const { mek, reply } = conText;
  try {
    await toolReact(client, mek, from, async () => {
      const res = await axios.get(XMD.GIFTED.TOOLS.FREE_PROXY(), { timeout: 15000 });
      const d = res.data;
      if (!d?.success) throw new Error(d?.message || 'API error');
      const list = Array.isArray(d.result) ? d.result : (d.result?.proxies || []);
      if (!list.length) throw new Error('No proxies returned');
      let out = `🔒 *Free Proxies*\n\n`;
      list.slice(0, 15).forEach((p, i) => {
        const proxy = typeof p === 'string' ? p : `${p.ip || p.host}:${p.port}`;
        out += `${i + 1}. \`${proxy}\`\n`;
      });
      await client.sendMessage(from, { text: out }, { quoted: mek });
    });
  } catch (e) {
    reply(`❌ Free proxy fetch failed: ${e.message}`);
  }
});
