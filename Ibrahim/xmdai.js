const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');
const XMD = require('../adams/xmd');
const {
  saveConversation,
  getConversationHistory,
  clearConversationHistory
} = require('../adams/database/gpt');

const XMD_SYSTEM = `[System: You are XMD, a smart WhatsApp AI assistant created by Ibrahim Adams. Reply in plain text only — no markdown, no asterisks, no headers. Keep replies short and conversational since this is WhatsApp. Only say your name or creator when directly asked. Remember the conversation context and refer back to it naturally.]`;

async function askXMD(userJid, question) {
  // Build context from last conversation
  const history = await getConversationHistory(userJid, 3);
  let context = '';
  if (history.length > 0) {
    const last = history[0];
    context = `Previous:\nYou: ${last.user}\nXMD: ${last.ai}\n\nNow: `;
  }

  const fullQuery = `${XMD_SYSTEM}\n\n${context}${question}`;

  // 1. Gifted AI
  try {
    const res = await axios.get(XMD.GIFTED.AI.GIFTED(fullQuery), { timeout: 15000 });
    if (res.data?.success && res.data?.result) return res.data.result;
  } catch (e) {}

  // 2. GPT-4o via Gifted
  try {
    const res = await axios.get(XMD.GIFTED.AI.GPT4O(fullQuery), { timeout: 15000 });
    if (res.data?.success && res.data?.result) return res.data.result;
  } catch (e) {}

  // 3. Pollinations via Gifted
  try {
    const res = await axios.get(XMD.GIFTED.AI.POLLINATIONS(fullQuery), { timeout: 15000 });
    if (res.data?.success && res.data?.result) return res.data.result;
  } catch (e) {}

  // 4. BK9 Gemini
  try {
    const res = await axios.get(`https://api.bk9.dev/ai/gemini?q=${encodeURIComponent(fullQuery)}`, { timeout: 15000 });
    if (res.data?.status && res.data?.BK9) return res.data.BK9;
  } catch (e) {}

  // 5. BK9 Llama
  try {
    const res = await axios.get(`https://api.bk9.dev/ai/llama?q=${encodeURIComponent(fullQuery)}`, { timeout: 15000 });
    if (res.data?.status && res.data?.BK9) return res.data.BK9;
  } catch (e) {}

  // 6. Keith API fallback
  try {
    const res = await axios.get(XMD.API.AI.GPT(context + question), { timeout: 15000 });
    if (res.data?.status && res.data?.result) return res.data.result;
  } catch (e) {}

  return null;
}

// ── Main XMD chat command ──────────────────────────────────────────────────
bwmxmd({
  pattern: 'xmd',
  aliases: ['claude', 'xmdai'],
  category: 'AI',
  description: 'Chat with XMD AI — remembers the conversation'
}, async (from, client, conText) => {
  const { reply, react, arg, sender, pushName } = conText;

  if (!arg || arg.length === 0) {
    return reply(`🤖 XMD AI\n\nHey ${pushName}! Ask me anything.\n\nExample: .xmd what is JavaScript?\n\nI remember our conversation so feel free to follow up.`);
  }

  const question = arg.join(' ');
  await react('⏳');

  try {
    const answer = await askXMD(sender, question);
    if (answer) {
      await saveConversation(sender, question, answer);
      await react('✅');
      await reply(answer);
    } else {
      await react('❌');
      await reply('❌ XMD could not get a response right now. Try again in a moment.');
    }
  } catch (err) {
    await react('❌');
    await reply(`❌ XMD error: ${(err.message || 'Unknown error').slice(0, 150)}`);
  }
});

// ── Clear conversation history ─────────────────────────────────────────────
bwmxmd({
  pattern: 'xmdclear',
  aliases: ['clearxmd', 'xmdreset'],
  category: 'AI',
  description: 'Clear your XMD conversation history'
}, async (from, client, conText) => {
  const { reply, react, sender, pushName } = conText;

  await react('🗑️');
  const cleared = await clearConversationHistory(sender);
  if (cleared) {
    await reply(`🗑️ Done! Conversation history cleared, ${pushName}. Fresh start!`);
  } else {
    await reply('ℹ️ No conversation history to clear.');
  }
});

// ── View recent exchanges ──────────────────────────────────────────────────
bwmxmd({
  pattern: 'xmdhistory',
  aliases: ['xmdlast'],
  category: 'AI',
  description: 'View your recent XMD conversation'
}, async (from, client, conText) => {
  const { reply, react, sender } = conText;

  await react('📚');
  const history = await getConversationHistory(sender, 3);

  if (!history.length) {
    return reply('📚 No XMD history yet.\n\nStart with: .xmd Hello!');
  }

  let out = '📚 Recent XMD Conversations\n━━━━━━━━━━━━━━━━━━━━\n\n';
  history.slice().reverse().forEach(conv => {
    const q = conv.user.length > 60 ? conv.user.slice(0, 60) + '...' : conv.user;
    const a = conv.ai.length > 80  ? conv.ai.slice(0, 80) + '...'   : conv.ai;
    out += `You: ${q}\nXMD: ${a}\n\n`;
  });
  await reply(out.trim());
});
