const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// Fetch from Gifted Fun API and return a random item (or the full result for jokes)
async function getFun(endpoint) {
  const res = await axios.get(XMD.GIFTED.FUN(endpoint), { timeout: 15000 });
  const d = res.data;
  if (!d?.success && d?.success !== undefined) throw new Error('API returned failure');
  const result = d?.result;
  if (!result) throw new Error('No result');
  if (Array.isArray(result)) return result[Math.floor(Math.random() * result.length)];
  return result;
}

// Register a simple fun command that sends a text reply
function funCmd(opts, endpoint, format) {
  bwmxmd(opts, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
      await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
      const data = await getFun(endpoint);
      const text = typeof format === 'function' ? format(data) : `${opts.emoji || '✨'} *${opts.label || opts.pattern}*\n\n${data}`;
      await client.sendMessage(from, { text }, { quoted: mek });
      await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
      console.error(`[BWM] ${opts.pattern} error:`, e.message);
      await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
      reply(`❌ Failed to fetch ${opts.label || opts.pattern}. Please try again.`);
    }
  });
}

// ─── JOKES ───────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'joke', aliases: ['jokes', 'lol'],
  category: 'Fun', description: 'Get a random joke',
  emoji: '😂', label: 'Random Joke'
}, 'jokes', (d) =>
  `😂 *Random Joke*\n\n❓ ${d.setup || d}\n\n😆 ${d.punchline || ''}`
);

// ─── ADVICE ──────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'advice', aliases: ['advise'],
  category: 'Fun', description: 'Get a random piece of advice',
  emoji: '💡', label: 'Advice'
}, 'advice');

// ─── DARE ────────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'dare', aliases: ['dares'],
  category: 'Fun', description: 'Get a random dare',
  emoji: '😈', label: 'Dare'
}, 'dares');

// ─── TRUTH ───────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'truth', aliases: ['truthquote'],
  category: 'Fun', description: 'Get a random truth question',
  emoji: '🤔', label: 'Truth'
}, 'truth');

// ─── PICK UP LINE ─────────────────────────────────────────────────────────────
funCmd({
  pattern: 'pickupline', aliases: ['pickup', 'pul'],
  category: 'Fun', description: 'Get a random pick-up line',
  emoji: '😏', label: 'Pick Up Line'
}, 'pickupline');

// ─── FLIRT ────────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'flirt', aliases: ['flirty'],
  category: 'Fun', description: 'Get a random flirty message',
  emoji: '😍', label: 'Flirt'
}, 'flirt');

// ─── QUOTE ───────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'quote', aliases: ['quotes', 'qod'],
  category: 'Fun', description: 'Get a random quote',
  emoji: '📜', label: 'Quote'
}, 'quotes');

// ─── MOTIVATION ──────────────────────────────────────────────────────────────
funCmd({
  pattern: 'motivation', aliases: ['motivate', 'inspire'],
  category: 'Fun', description: 'Get a random motivational quote',
  emoji: '💪', label: 'Motivation'
}, 'motivation');

// ─── GOODNIGHT ───────────────────────────────────────────────────────────────
funCmd({
  pattern: 'goodnight', aliases: ['gn', 'gnwish'],
  category: 'Fun', description: 'Get a random goodnight wish',
  emoji: '🌙', label: 'Goodnight'
}, 'goodnight');

// ─── LOVE ────────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'lovemsg', aliases: ['love', 'lovequote'],
  category: 'Fun', description: 'Get a random love message',
  emoji: '❤️', label: 'Love'
}, 'love');

// ─── FRIENDSHIP ──────────────────────────────────────────────────────────────
funCmd({
  pattern: 'friendship', aliases: ['friendquote', 'bff'],
  category: 'Fun', description: 'Get a random friendship quote',
  emoji: '🤝', label: 'Friendship'
}, 'friendship');

// ─── HEARTBREAK ──────────────────────────────────────────────────────────────
funCmd({
  pattern: 'heartbreak', aliases: ['hb', 'brokenheart'],
  category: 'Fun', description: 'Get a random heartbreak quote',
  emoji: '💔', label: 'Heartbreak'
}, 'heartbreak');

// ─── SHAYARI ─────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'shayari', aliases: ['poetry'],
  category: 'Fun', description: 'Get a random shayari poem',
  emoji: '🪷', label: 'Shayari'
}, 'shayari');

// ─── GRATITUDE ───────────────────────────────────────────────────────────────
funCmd({
  pattern: 'gratitude', aliases: ['grateful', 'thankful'],
  category: 'Fun', description: 'Get a random gratitude message',
  emoji: '🙏', label: 'Gratitude'
}, 'gratitude');

// ─── THANK YOU ───────────────────────────────────────────────────────────────
funCmd({
  pattern: 'thankyou', aliases: ['ty', 'thanks'],
  category: 'Fun', description: 'Get a random thank you message',
  emoji: '💌', label: 'Thank You'
}, 'thankyou');

// ─── VALENTINE ───────────────────────────────────────────────────────────────
funCmd({
  pattern: 'valentine', aliases: ['valentines', 'vday'],
  category: 'Fun', description: "Get a random Valentine's Day wish",
  emoji: '💝', label: "Valentine's Wish"
}, 'valentines');

// ─── ROSE DAY ────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'roseday', aliases: ['rose'],
  category: 'Fun', description: 'Get a random Rose Day wish',
  emoji: '🌹', label: 'Rose Day'
}, 'roseday');

// ─── CHRISTMAS ───────────────────────────────────────────────────────────────
funCmd({
  pattern: 'christmas', aliases: ['xmas', 'merrychristmas'],
  category: 'Fun', description: 'Get a random Christmas wish',
  emoji: '🎄', label: 'Christmas'
}, 'christmas');

// ─── HALLOWEEN ───────────────────────────────────────────────────────────────
funCmd({
  pattern: 'halloween', aliases: ['spooky'],
  category: 'Fun', description: 'Get a random Halloween wish',
  emoji: '🎃', label: 'Halloween'
}, 'halloween');

// ─── NEW YEAR ────────────────────────────────────────────────────────────────
funCmd({
  pattern: 'newyear', aliases: ['ny', 'happynewyear'],
  category: 'Fun', description: 'Get a random New Year wish',
  emoji: '🎆', label: 'New Year'
}, 'newyear');

// ─── MOTHERS DAY ─────────────────────────────────────────────────────────────
funCmd({
  pattern: 'mothersday', aliases: ['mom', 'motherday'],
  category: 'Fun', description: "Get a random Mother's Day wish",
  emoji: '👩', label: "Mother's Day"
}, 'mothersday');

// ─── FATHERS DAY ─────────────────────────────────────────────────────────────
funCmd({
  pattern: 'fathersday', aliases: ['dad', 'fatherday'],
  category: 'Fun', description: "Get a random Father's Day wish",
  emoji: '👨', label: "Father's Day"
}, 'fathersday');

// ─── GIRLFRIEND'S DAY ────────────────────────────────────────────────────────
funCmd({
  pattern: 'girlfriendsday', aliases: ['gfd', 'gfday'],
  category: 'Fun', description: "Get a random Girlfriend's Day wish",
  emoji: '👸', label: "Girlfriend's Day"
}, 'girlfriendsday');

// ─── BOYFRIEND'S DAY ─────────────────────────────────────────────────────────
funCmd({
  pattern: 'boyfriendsday', aliases: ['bfd', 'bfday'],
  category: 'Fun', description: "Get a random Boyfriend's Day wish",
  emoji: '🤴', label: "Boyfriend's Day"
}, 'boyfriendsday');
