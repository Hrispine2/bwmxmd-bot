const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

const AK = XMD.GIFTED?.AK || 'gifted-api_0u5afg56rfg78tr2t';
const GIFTED_ANIME = `https://api.gifted.co.ke/api/anime`;

// ─── API HELPERS ──────────────────────────────────────────────────────────────

// gifted anime — for endpoints that still work (konachan, loli, quotes, random)
async function gifted(ep) {
    const r = await axios.get(`${GIFTED_ANIME}/${ep}?apikey=${AK}`, { timeout: 15000 });
    const d = r.data;
    if (!d?.result) throw new Error('No result from gifted');
    return d.result;
}

// nekos.life — returns { url }
async function nekosLife(cat) {
    const r = await axios.get(`https://nekos.life/api/v2/img/${cat}`, { timeout: 10000 });
    const url = r.data?.url;
    if (!url) throw new Error('No URL from nekos.life');
    return url;
}

// nekos.best — returns { results: [{ url }] }
async function nekosBest(cat) {
    const r = await axios.get(`https://nekos.best/api/v2/${cat}`, {
        timeout: 10000,
        headers: { 'User-Agent': 'PostmanRuntime/7.32.3', 'Accept': '*/*' }
    });
    const url = r.data?.results?.[0]?.url;
    if (!url) throw new Error('No URL from nekos.best');
    return url;
}

// nekos.moe — NSFW random image URL
async function nekosMoe() {
    const r = await axios.get('https://nekos.moe/api/v1/random/image?count=1&nsfw=true', { timeout: 10000 });
    const id = r.data?.images?.[0]?.id;
    if (!id) throw new Error('No image ID from nekos.moe');
    return `https://nekos.moe/image/${id}`;
}

// konachan.net with a tag — returns file_url
async function konachanTag(tag) {
    const r = await axios.get(`https://konachan.net/post.json?limit=5&tags=${encodeURIComponent(tag + ' rating:s')}`, { timeout: 10000 });
    const posts = r.data;
    if (!Array.isArray(posts) || !posts.length) throw new Error('No posts from konachan');
    const post = posts[Math.floor(Math.random() * posts.length)];
    const url = post.file_url;
    if (!url) throw new Error('No file_url in konachan post');
    return url;
}

// ─── SEND HELPER ──────────────────────────────────────────────────────────────

async function animeImgCmd(from, client, conText, fetchFn, caption) {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const url = await fetchFn();
        await client.sendMessage(from, { image: { url }, caption }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error('[BWM Anime]', caption, e.message);
        await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ Failed to fetch anime image. Try again.');
    }
}

// ─── SFW COMMANDS ─────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'neko', aliases: ['nekocat', 'nekopic'],
    category: 'Anime', description: 'Get a random neko (cat-girl) SFW image', emoji: '🐱'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosLife('neko').catch(() => nekosBest('neko')),
        '🐱 *Random Neko*'));

bwmxmd({
    pattern: 'waifu', aliases: ['waifupic', 'randwaifu'],
    category: 'Anime', description: 'Get a random waifu SFW image', emoji: '💗'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosLife('waifu').catch(() => nekosBest('waifu')),
        '💗 *Random Waifu*'));

bwmxmd({
    pattern: 'konachan', aliases: ['kona', 'konachanpic'],
    category: 'Anime', description: 'Get a random Konachan SFW anime image', emoji: '🎌'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => gifted('konachan').catch(() => konachanTag('anime')),
        '🎌 *Konachan Anime Pic*'));

bwmxmd({
    pattern: 'foxgirl', aliases: ['fox', 'kitsune'],
    category: 'Anime', description: 'Get a random fox girl SFW image', emoji: '🦊'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosLife('fox_girl').catch(() => nekosBest('kitsune')),
        '🦊 *Random Fox Girl*'));

// ─── ANIME INFO ───────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'animerandom', aliases: ['randanime', 'animex'],
    category: 'Anime', description: 'Get random anime info (title, episodes, status)', emoji: '📺'
}, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const data = await gifted('random');
        const thumb = data.thumbnail || data.image || data.cover || null;
        const cap = `📺 *Random Anime*\n\n` +
            `🎌 *Title:* ${data.title || 'Unknown'}\n` +
            `📡 *Episodes:* ${data.episodes || 'N/A'}\n` +
            `✅ *Status:* ${data.status || 'N/A'}\n` +
            (data.genre ? `🏷️ *Genre:* ${Array.isArray(data.genre) ? data.genre.join(', ') : data.genre}\n` : '') +
            (data.score ? `⭐ *Score:* ${data.score}\n` : '') +
            (data.synopsis ? `\n📝 ${data.synopsis.slice(0, 300)}...` : '');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error('[BWM Anime] animerandom:', e.message);
        await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ Could not fetch anime info. Try again.');
    }
});

// ─── ANIME QUOTES ─────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'animequote', aliases: ['aquote', 'animesay'],
    category: 'Anime', description: 'Get a random anime quote', emoji: '💬'
}, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const data = await gifted('quotes');
        const text = `💬 *Anime Quote*\n\n` +
            `_"${data.quote || data}"_\n\n` +
            `— *${data.character || 'Unknown'}*` +
            (data.show ? ` _(${data.show})_` : '');
        await client.sendMessage(from, { text }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error('[BWM Anime] animequote:', e.message);
        await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply('❌ Could not fetch anime quote. Try again.');
    }
});

// ─── NSFW COMMANDS ────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'animeloli', aliases: ['loli', 'loliimg'],
    category: 'Anime', description: 'Get a random loli NSFW anime image', emoji: '🔞'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => gifted('loli'),
        '🔞 *Random Loli*'));

bwmxmd({
    pattern: 'animemilf', aliases: ['milf', 'milfpic'],
    category: 'Anime', description: 'Get a random milf NSFW anime image', emoji: '🔞'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosMoe(),
        '🔞 *Random Milf*'));

bwmxmd({
    pattern: 'hwaifu', aliases: ['nsfwwaifu', 'waifunsfw'],
    category: 'Anime', description: 'Get a random waifu NSFW anime image', emoji: '🔞'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosMoe(),
        '🔞 *NSFW Waifu*'));

bwmxmd({
    pattern: 'hneko', aliases: ['nsfwneko', 'nekonsfw'],
    category: 'Anime', description: 'Get a random neko NSFW anime image', emoji: '🔞'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosMoe(),
        '🔞 *NSFW Neko*'));

bwmxmd({
    pattern: 'megumin', aliases: ['meguminpic', 'megu'],
    category: 'Anime', description: 'Get a random Megumin anime image', emoji: '💥'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => konachanTag('megumin').catch(() => konachanTag('anime girl')),
        '💥 *Random Megumin*'));

bwmxmd({
    pattern: 'awoo', aliases: ['awoopic', 'awooimg'],
    category: 'Anime', description: 'Get a random Awoo SFW anime image', emoji: '🐺'
}, async (from, client, conText) =>
    animeImgCmd(from, client, conText,
        () => nekosLife('fox_girl').catch(() => nekosBest('kitsune')),
        '🐺 *Random Awoo*'));
