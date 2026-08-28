const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// Helper: call a Gifted AI chat endpoint and return the text result
async function giftedChat(urlFn, question) {
  const res = await axios.get(urlFn(question), { timeout: 20000 });
  const d = res.data;
  if (!d?.success) throw new Error(d?.message || 'API error');
  if (typeof d.result === 'string') return d.result;
  return JSON.stringify(d.result);
}

// ─── BWM AI ───────────────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'bwmai',
  aliases: ['gai', 'xmdai'],
  category: 'AI',
  description: 'Chat with BWM AI'
}, async (from, client, conText) => {
  const { q, mek, reply, react } = conText;
  if (!q) return reply('🤖 Ask me anything!\n\nExample: !bwmai What is JavaScript?');
  try {
    await react('⏳');
    const answer = await giftedChat(XMD.GIFTED.AI.GIFTED, q);
    await client.sendMessage(from, { text: answer }, { quoted: mek });
    await react('✅');
  } catch (e) {
    console.error('[BWM] bwmai error:', e.message);
    await react('❌');
    reply('❌ AI failed. Please try again.');
  }
});

// ─── GPT-4O ──────────────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'gpt4o',
  aliases: ['gpt4', 'chatgpt4o'],
  category: 'AI',
  description: 'Chat with GPT-4o model'
}, async (from, client, conText) => {
  const { q, mek, reply, react } = conText;
  if (!q) return reply('🤖 Ask GPT-4o anything!\n\nExample: !gpt4o Explain quantum computing');
  try {
    await react('⏳');
    const answer = await giftedChat(XMD.GIFTED.AI.GPT4O, q);
    await client.sendMessage(from, { text: `🤖 *GPT-4o*\n\n${answer}` }, { quoted: mek });
    await react('✅');
  } catch (e) {
    console.error('[BWM] gpt4o error:', e.message);
    await react('❌');
    reply('❌ GPT-4o failed. Please try again.');
  }
});

// ─── LETMEGPT ────────────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'letmegpt',
  aliases: ['letme', 'lgpt'],
  category: 'AI',
  description: 'Chat with LetMeGpt model'
}, async (from, client, conText) => {
  const { q, mek, reply, react } = conText;
  if (!q) return reply('🤖 Ask LetMeGpt anything!\n\nExample: !letmegpt How do I learn Python?');
  try {
    await react('⏳');
    const answer = await giftedChat(XMD.GIFTED.AI.LETMEGPT, q);
    await client.sendMessage(from, { text: `🤖 *LetMeGpt*\n\n${answer}` }, { quoted: mek });
    await react('✅');
  } catch (e) {
    console.error('[BWM] letmegpt error:', e.message);
    await react('❌');
    reply('❌ LetMeGpt failed. Please try again.');
  }
});

// ─── POLLINATIONS AI ─────────────────────────────────────────────────────────
bwmxmd({
  pattern: 'pollinations',
  aliases: ['poll', 'poliai'],
  category: 'AI',
  description: 'Chat with Pollinations AI'
}, async (from, client, conText) => {
  const { q, mek, reply, react } = conText;
  if (!q) return reply('🤖 Ask Pollinations AI anything!\n\nExample: !pollinations Write a poem about space');
  try {
    await react('⏳');
    const answer = await giftedChat(XMD.GIFTED.AI.POLLINATIONS, q);
    await client.sendMessage(from, { text: `🤖 *Pollinations AI*\n\n${answer}` }, { quoted: mek });
    await react('✅');
  } catch (e) {
    console.error('[BWM] pollinations error:', e.message);
    await react('❌');
    reply('❌ Pollinations AI failed. Please try again.');
  }
});

// ─── YOUTUBE TRANSCRIPT ───────────────────────────────────────────────────────
bwmxmd({
  pattern: 'transcript',
  aliases: ['ytt', 'yttext', 'subtitles'],
  category: 'AI',
  description: 'Get transcript/subtitles of a YouTube video'
}, async (from, client, conText) => {
  const { q, mek, reply, react } = conText;
  if (!q) return reply('📝 Provide a YouTube URL.\n\nExample: !transcript https://youtube.com/watch?v=...');
  const isYtUrl = q.match(/(youtube\.com|youtu\.be)/i);
  if (!isYtUrl) return reply('❌ Please provide a valid YouTube URL.');
  try {
    await react('⏳');
    const res = await axios.get(XMD.GIFTED.AI.TRANSCRIPT(q), { timeout: 25000 });
    const d = res.data;
    if (!d?.success || !d?.result) throw new Error('No transcript returned');
    const text = typeof d.result === 'string' ? d.result : JSON.stringify(d.result);
    const trimmed = text.length > 3500 ? text.slice(0, 3500) + '\n\n_[Transcript trimmed — too long]_' : text;
    await client.sendMessage(from, {
      text: `📝 *YouTube Transcript*\n\n${trimmed}`
    }, { quoted: mek });
    await react('✅');
  } catch (e) {
    console.error('[BWM] transcript error:', e.message);
    await react('❌');
    reply('❌ Could not fetch transcript. Make sure the video has subtitles enabled.');
  }
});
