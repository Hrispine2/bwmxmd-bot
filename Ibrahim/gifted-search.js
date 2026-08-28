const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// Fetch from Gifted Search API — handles both 'result' and 'results' keys
async function gSearch(urlFn, ...args) {
    const res = await axios.get(urlFn(...args), { timeout: 25000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API returned failure');
    const data = d?.result ?? d?.results;
    if (data === undefined || data === null) throw new Error('No data returned');
    return data;
}

// Generic error handler
async function searchErr(client, from, mek, label, e) {
    console.error(`[BWM Search] ${label}:`, e.message);
    await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
    await client.sendMessage(from, { text: `❌ Could not fetch *${label}* results. Try again.` }, { quoted: mek });
}

// ─── MUSIC ────────────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'lyrics', aliases: ['lyric', 'songlyrics'],
    category: 'Search', description: 'Search song lyrics',
    emoji: '🎵', use: '<song name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🎵 *Usage:* !lyrics <song name>\nExample: !lyrics Shape of You');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.LYRICS, query);
        const thumb = d.image || d.thumbnail || null;
        const lyricsText = d.lyrics || d.lyric || 'Lyrics not available.';
        const cap = `🎵 *Lyrics*\n\n🎤 *Artist:* ${d.artist || 'Unknown'}\n📀 *Title:* ${d.title || query}\n\n${lyricsText.slice(0, 3500)}`;
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Lyrics', e); }
});

bwmxmd({
    pattern: 'lyricsv2', aliases: ['lyricv2', 'lyric2'],
    category: 'Search', description: 'Search song lyrics (alternate source)',
    emoji: '🎶', use: '<song name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🎶 *Usage:* !lyricsv2 <song name>');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.LYRICS_V2, query);
        const cap = `🎶 *Lyrics V2*\n\n🎤 *Artist:* ${d.artist || 'Unknown'}\n📀 *Title:* ${d.title || query}\n\n${(d.lyrics || d.lyric || 'Not available.').slice(0, 3500)}`;
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Lyrics V2', e); }
});

bwmxmd({
    pattern: 'spotifylyrics', aliases: ['slyrics', 'spotlyrics'],
    category: 'Search', description: 'Search Spotify tracks with lyrics info',
    emoji: '🟢', use: '<song name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🟢 *Usage:* !spotifylyrics <song name>');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.SPOTIFY_LYRICS, query);
        const list = Array.isArray(results) ? results.slice(0, 5) : [results];
        const top = list[0];
        const thumb = top?.thumbnail || top?.image || null;
        const cap = `🟢 *Spotify Lyrics Search*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.title || 'Unknown'}\n` +
                `   🎤 ${r.artist || 'Unknown'} | ⏱️ ${r.duration || 'N/A'}\n` +
                (r.lyricsUrl ? `   📄 ${r.lyricsUrl}\n` : '') +
                (r.url ? `   🔗 ${r.url}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Spotify Lyrics', e); }
});

bwmxmd({
    pattern: 'playlist', aliases: ['spotifyplaylist', 'splaylist'],
    category: 'Search', description: 'Search Spotify playlists',
    emoji: '🎧', use: '<genre or keyword>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🎧 *Usage:* !playlist <genre or keyword>\nExample: !playlist afrobeats');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.SPOTIFY_PLAYLIST, query);
        const list = Array.isArray(results) ? results.slice(0, 6) : [results];
        const top = list[0];
        const thumb = top?.thumbnail || top?.image || null;
        const cap = `🎧 *Spotify Playlists: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.name || r.title || 'Unknown'}\n` +
                `   👤 By: ${r.creator || r.owner || 'Spotify'}\n` +
                (r.url ? `   🔗 ${r.url}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Spotify Playlist', e); }
});

bwmxmd({
    pattern: 'soundcloud', aliases: ['sc', 'scmusic'],
    category: 'Search', description: 'Search SoundCloud tracks',
    emoji: '🔶', use: '<song or artist>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🔶 *Usage:* !soundcloud <song or artist>');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.SOUNDCLOUD, query);
        const list = Array.isArray(results) ? results.slice(0, 5) : [results];
        const top = list[0];
        const thumb = top?.thumbnail || top?.image || top?.artwork || null;
        const cap = `🔶 *SoundCloud: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.title || r.name || 'Unknown'}\n` +
                `   🎤 ${r.artist || r.user || r.uploader || 'Unknown'}\n` +
                (r.url || r.permalink ? `   🔗 ${r.url || r.permalink}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'SoundCloud', e); }
});

bwmxmd({
    pattern: 'hearthis', aliases: ['hearthissearch', 'djset'],
    category: 'Search', description: 'Search DJ sets on hearthis.at',
    emoji: '🎚️', use: '<dj name or query>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🎚️ *Usage:* !hearthis <dj name>\nExample: !hearthis dj ravin');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.HEARTHIS, query);
        const list = Array.isArray(results) ? results.slice(0, 5) : [results];
        const top = list[0];
        const thumb = top?.thumbnail || top?.image || null;
        const cap = `🎚️ *HearThis DJ Sets: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.name || r.title || 'Unknown'}\n` +
                (r.trackCount ? `   🎵 Tracks: ${r.trackCount}\n` : '') +
                (r.url ? `   🔗 ${r.url}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'HearThis', e); }
});

bwmxmd({
    pattern: 'shazam', aliases: ['identify', 'songid'],
    category: 'Search', description: 'Identify music from an audio/video URL',
    emoji: '🎵', use: '<audio/video URL>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const url = (q || '').trim();
    if (!url) return reply('🎵 *Usage:* !shazam <audio/video URL>');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.SHAZAM, url);
        const thumb = d.thumbnail || d.image || d.cover || null;
        const cap = `🎵 *Shazam — Song Identified!*\n\n` +
            `🎤 *Artist:* ${d.artist || d.subtitle || 'Unknown'}\n` +
            `📀 *Title:* ${d.title || d.name || 'Unknown'}\n` +
            (d.album ? `💿 *Album:* ${d.album}\n` : '') +
            (d.genre ? `🏷️ *Genre:* ${d.genre}\n` : '') +
            (d.releaseDate || d.year ? `📅 *Released:* ${d.releaseDate || d.year}\n` : '');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Shazam', e); }
});

bwmxmd({
    pattern: 'chord', aliases: ['chords', 'guitarchord'],
    category: 'Search', description: 'Search song chords/tabs on Gitagram',
    emoji: '🎸', use: '<song name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🎸 *Usage:* !chord <song name>\nExample: !chord Shape of You');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.CHORD, query);
        const cap = `🎸 *Chord: ${d.title || query}*\n\n` +
            `🎤 *Artist:* ${d.artist || 'Unknown'}\n` +
            (d.url ? `🔗 *Source:* ${d.url}\n` : '') +
            (d.lyrics ? `\n${d.lyrics.slice(0, 3000)}` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Chord', e); }
});

// ─── WEB / INFO SEARCH ────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'google', aliases: ['gsearch', 'websearch'],
    category: 'Search', description: 'Search Google',
    emoji: '🔍', use: '<query>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🔍 *Usage:* !google <your search query>');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.GOOGLE, query);
        const list = Array.isArray(results) ? results.slice(0, 5) : [results];
        const cap = `🔍 *Google Results: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.title || 'No title'}\n` +
                `   📝 ${(r.description || r.snippet || 'No description').slice(0, 100)}\n` +
                (r.link || r.url ? `   🔗 ${r.link || r.url}` : '')
            ).join('\n\n');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Google', e); }
});

bwmxmd({
    pattern: 'wiki', aliases: ['wikipedia', 'wikimedia'],
    category: 'Search', description: 'Search Wikipedia/Wikimedia',
    emoji: '📖', use: '<topic>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const title = (q || '').trim();
    if (!title) return reply('📖 *Usage:* !wiki <topic>\nExample: !wiki Naruto');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.WIKIMEDIA, title);
        const thumb = d.thumbnail || d.image || d.cover || null;
        const cap = `📖 *Wikipedia: ${d.title || title}*\n\n` +
            (d.description ? `📝 ${d.description}\n\n` : '') +
            (d.extract ? d.extract.slice(0, 1500) + '...' : 'No summary available.') +
            (d.url ? `\n\n🔗 ${d.url}` : '');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Wikipedia', e); }
});

bwmxmd({
    pattern: 'bible', aliases: ['verse', 'bibleverses'],
    category: 'Search', description: 'Look up a Bible verse (with Swahili & Hindi translation)',
    emoji: '✝️', use: '<book chapter:verse>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const verse = (q || '').trim();
    if (!verse) return reply('✝️ *Usage:* !bible <verse>\nExample: !bible John 3:16');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.BIBLE, verse);
        const sw = d.translations?.swahili || '';
        const hi = d.translations?.hindi || '';
        const cap = `✝️ *Bible Verse*\n\n📖 *${d.verse || verse}*\n\n` +
            `${(d.data || d.text || '').trim()}\n\n` +
            (sw ? `🇰🇪 *Swahili:*\n${sw.trim()}\n\n` : '') +
            (hi ? `🇮🇳 *Hindi:*\n${hi.trim()}` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Bible', e); }
});

bwmxmd({
    pattern: 'define', aliases: ['ud', 'urbandictionary'],
    category: 'Search', description: 'Get Urban Dictionary definition of a word/term',
    emoji: '📚', use: '<word or slang>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const term = (q || '').trim();
    if (!term) return reply('📚 *Usage:* !define <word or slang>\nExample: !define vibe');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.DEFINE, term);
        const d = Array.isArray(results) ? results[0] : results;
        const cap = `📚 *Urban Dictionary: ${term}*\n\n` +
            `📖 *Definition:*\n${(d.definition || 'Not found.').replace(/\[|\]/g, '')}\n\n` +
            (d.example ? `💬 *Example:*\n${d.example.replace(/\[|\]/g, '')}` : '') +
            (d.thumbs_up !== undefined ? `\n\n👍 ${d.thumbs_up} | 👎 ${d.thumbs_down}` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Define', e); }
});

bwmxmd({
    pattern: 'dictionary', aliases: ['dict', 'meaning'],
    category: 'Search', description: 'Get word definition, phonetic & meaning',
    emoji: '📘', use: '<word>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const word = (q || '').trim();
    if (!word) return reply('📘 *Usage:* !dictionary <word>\nExample: !dictionary serendipity');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.DICTIONARY, word);
        const entry = Array.isArray(d) ? d[0] : d;
        const meanings = entry?.meanings || entry?.definitions || [];
        const cap = `📘 *Dictionary: ${entry?.word || word}*\n\n` +
            (entry?.phonetic ? `🔊 *Phonetic:* ${entry.phonetic}\n\n` : '') +
            (meanings.length > 0
                ? meanings.slice(0, 3).map(m =>
                    `📌 *${m.partOfSpeech || m.pos || ''}*\n${(m.definitions || [m])[0]?.definition || m.definition || m}`
                ).join('\n\n')
                : (entry?.definition || entry?.meaning || JSON.stringify(entry).slice(0, 300)));
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Dictionary', e); }
});

bwmxmd({
    pattern: 'weather', aliases: ['forecast', 'temp'],
    category: 'Search', description: 'Get weather details for any city',
    emoji: '🌤️', use: '<city name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const location = (q || '').trim();
    if (!location) return reply('🌤️ *Usage:* !weather <city name>\nExample: !weather Nairobi');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await gSearch(XMD.GIFTED.SEARCH.WEATHER, location);
        const cap = `🌤️ *Weather: ${d.city || d.location || d.name || location}*\n\n` +
            (d.country ? `🌍 *Country:* ${d.country}\n` : '') +
            (d.temperature || d.temp ? `🌡️ *Temperature:* ${d.temperature || d.temp}\n` : '') +
            (d.feels_like ? `🤔 *Feels Like:* ${d.feels_like}\n` : '') +
            (d.description || d.condition || d.weather ? `☁️ *Condition:* ${d.description || d.condition || d.weather}\n` : '') +
            (d.humidity ? `💧 *Humidity:* ${d.humidity}\n` : '') +
            (d.wind || d.wind_speed ? `💨 *Wind:* ${d.wind || d.wind_speed}\n` : '') +
            (d.visibility ? `👁️ *Visibility:* ${d.visibility}\n` : '') +
            (d.sunrise ? `🌅 *Sunrise:* ${d.sunrise}\n` : '') +
            (d.sunset ? `🌇 *Sunset:* ${d.sunset}` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Weather', e); }
});

bwmxmd({
    pattern: 'wattpad', aliases: ['watt', 'wpstory'],
    category: 'Search', description: 'Search stories on Wattpad',
    emoji: '📓', use: '<story title or genre>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('📓 *Usage:* !wattpad <story or genre>\nExample: !wattpad romance');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.WATTPAD, query);
        const list = Array.isArray(results) ? results.slice(0, 5) : [results];
        const top = list[0];
        const thumb = top?.cover || top?.thumbnail || top?.image || null;
        const cap = `📓 *Wattpad: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.title || r.name || 'Unknown'}\n` +
                `   👤 By: ${r.author || r.user || 'Unknown'}\n` +
                (r.reads ? `   👀 Reads: ${r.reads}\n` : '') +
                (r.description ? `   📝 ${r.description.slice(0, 80)}...\n` : '') +
                (r.url || r.link ? `   🔗 ${r.url || r.link}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Wattpad', e); }
});

// ─── APP SEARCH ───────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'playstore', aliases: ['gplay', 'googleplay'],
    category: 'Search', description: 'Search apps on Google Play Store',
    emoji: '▶️', use: '<app name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('▶️ *Usage:* !playstore <app name>\nExample: !playstore WhatsApp');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.PLAYSTORE, query);
        const list = Array.isArray(results) ? results.slice(0, 5) : [results];
        const top = list[0];
        const thumb = top?.img || top?.icon || top?.thumbnail || null;
        const cap = `▶️ *Play Store: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.name || r.title || 'Unknown'}\n` +
                `   👤 Dev: ${r.developer || r.dev || 'Unknown'}\n` +
                (r.rating ? `   ⭐ Rating: ${r.rating}\n` : '') +
                (r.link || r.url ? `   🔗 ${r.link || r.url}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Play Store', e); }
});

bwmxmd({
    pattern: 'happymod', aliases: ['hmod', 'happymodapk'],
    category: 'Search', description: 'Search modded apps on HappyMod',
    emoji: '😊', use: '<app name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('😊 *Usage:* !happymod <app name>\nExample: !happymod Minecraft');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const raw = await gSearch(XMD.GIFTED.SEARCH.HAPPYMOD, query);
        // API returns {source, note, data:[...]} or direct array
        const list = (Array.isArray(raw) ? raw : (raw?.data || [raw])).slice(0, 5);
        if (!list.length) throw new Error('No apps found');
        const top = list[0];
        const thumb = top?.icon || top?.img || top?.thumbnail || null;
        const source = raw?.source ? ` _(via ${raw.source})_` : '';
        const cap = `😊 *HappyMod: ${query}*${source}\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.name || r.title || 'Unknown'}\n` +
                (r.summary || r.description ? `   📝 ${(r.summary || r.description).slice(0, 60)}\n` : '') +
                (r.version ? `   📦 ${r.version}\n` : '') +
                (r.url || r.link ? `   🔗 ${r.url || r.link}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'HappyMod', e); }
});

bwmxmd({
    pattern: 'apkmirror', aliases: ['apkm', 'apkmirrorapp'],
    category: 'Search', description: 'Search apps on APKMirror (via Uptodown)',
    emoji: '📲', use: '<app name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('📲 *Usage:* !apkmirror <app name>\nExample: !apkmirror Instagram');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const raw = await gSearch(XMD.GIFTED.SEARCH.APKMIRROR, query);
        // API may return {status:false, message, suggestion} on upstream failure
        if (raw?.status === false || raw?.message) {
            const suggestion = raw.suggestion || 'https://en.uptodown.com/android';
            return reply(`📲 *APKMirror Search: ${query}*\n\n⚠️ Upstream unavailable. Search directly:\n🔗 ${suggestion}`);
        }
        const list = Array.isArray(raw) ? raw.slice(0, 5) : [raw];
        const top = list[0];
        const thumb = top?.img || top?.icon || top?.thumbnail || null;
        const cap = `📲 *APKMirror: ${query}*\n\n` +
            list.map((r, i) =>
                `*${i + 1}.* ${r.name || r.title || 'Unknown'}\n` +
                `   👤 Dev: ${r.developer || r.dev || 'Unknown'}\n` +
                (r.version ? `   📦 Version: ${r.version}\n` : '') +
                (r.link || r.url ? `   🔗 ${r.link || r.url}` : '')
            ).join('\n\n');
        if (thumb) {
            await client.sendMessage(from, { image: { url: thumb }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'APKMirror', e); }
});

// ─── IMAGE SEARCH ─────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'gimg', aliases: ['googleimage', 'gimagesearch'],
    category: 'Search', description: 'Search any image on Google Images',
    emoji: '🖼️', use: '<search query>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('🖼️ *Usage:* !gimg <query>\nExample: !gimg anime sunset');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.GOOGLE_IMAGE, query);
        const list = Array.isArray(results) ? results : [results];
        const imgUrl = typeof list[0] === 'string' ? list[0] : (list[0]?.url || list[0]?.image || list[0]?.src);
        if (!imgUrl) throw new Error('No image URL found');
        await client.sendMessage(from, { image: { url: imgUrl }, caption: `🖼️ *Google Image: ${query}*` }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Google Image', e); }
});

bwmxmd({
    pattern: 'unsplash', aliases: ['uimg', 'hqimage'],
    category: 'Search', description: 'Search high-quality images on Unsplash',
    emoji: '📷', use: '<search query>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const query = (q || '').trim();
    if (!query) return reply('📷 *Usage:* !unsplash <query>\nExample: !unsplash mountain landscape');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const results = await gSearch(XMD.GIFTED.SEARCH.UNSPLASH, query);
        // Returns array of image URL strings directly
        const list = Array.isArray(results) ? results : [results];
        const imgUrl = typeof list[0] === 'string' ? list[0] : (list[0]?.url || list[0]?.regular || list[0]?.full || list[0]?.src);
        if (!imgUrl) throw new Error('No image URL found');
        await client.sendMessage(from, { image: { url: imgUrl }, caption: `📷 *Unsplash: ${query}*` }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await searchErr(client, from, mek, 'Unsplash', e); }
});
