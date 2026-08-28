const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

async function sportsGet(urlFn, ...args) {
    const res = await axios.get(urlFn(...args), { timeout: 20000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API returned failure');
    return d?.result ?? d?.results ?? d?.data ?? d;
}

async function sportsErr(client, from, mek, label, e) {
    console.error(`[BWM Sports] ${label}:`, e.message);
    await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
    await client.sendMessage(from, { text: `❌ Could not fetch *${label}*. Try again.` }, { quoted: mek });
}

// Format a match score line
function fmtMatch(r, emoji) {
    const score = (r.homeScore !== undefined && r.awayScore !== undefined)
        ? `${r.homeScore} - ${r.awayScore}` : 'vs';
    const ht = r.halfTimeScore ? ` _(HT: ${r.halfTimeScore})_` : '';
    const status = r.status && r.status !== 'Unknown' ? ` [${r.status}]` : '';
    const time = r.time || r.date || '';
    return `${emoji || '⚽'} *${r.homeTeam}* ${score} *${r.awayTeam}*${ht}${status}` +
        (r.league ? `\n   🏆 ${r.league}` : '') +
        (time ? `\n   ⏱️ ${time}` : '');
}

// ─── LIVE SPORTS ──────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'livesports', aliases: ['sportslive', 'livematches', 'matchlive'],
    category: 'Sports', description: 'Get live sports matches (optional: football, basketball, tennis...)',
    emoji: '🏟️', use: '[category]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const cat = (q || '').trim() || null;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await sportsGet(XMD.GIFTED.SPORTS.LIVE, cat);
        const matches = d?.matches || (Array.isArray(d) ? d : []);
        const total = d?.totalMatches ?? matches.length;
        const category = d?.category || cat || 'All Sports';
        if (!matches.length) {
            await client.sendMessage(from, {
                text: `🏟️ *Live Sports: ${category}*\n\n⚠️ No live matches right now.`
            }, { quoted: mek });
        } else {
            const cap = `🏟️ *Live Matches — ${category.toUpperCase()}* (${total} total)\n\n` +
                matches.slice(0, 10).map(r => fmtMatch(r, '🔴')).join('\n\n') +
                (matches.length > 10 ? `\n\n_...and ${matches.length - 10} more_` : '');
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Live Sports', e); }
});

// ─── SPORTS CATEGORIES ────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'sportscats', aliases: ['sportcategories', 'sportscat', 'categories'],
    category: 'Sports', description: 'Get all available sports categories and live match counts',
    emoji: '📋'
}, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const cats = await sportsGet(XMD.GIFTED.SPORTS.CATEGORIES);
        const list = Array.isArray(cats) ? cats : [cats];
        const cap = `📋 *Available Sports Categories*\n\n` +
            list.map((c, i) =>
                `*${i + 1}.* ${(c.category || c.name || 'Unknown').toUpperCase()}\n` +
                `   🔴 Live: ${c.matchCount ?? c.liveCount ?? 'N/A'}`
            ).join('\n\n') +
            `\n\n_Use !livesports <category> for live matches_`;
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Sports Categories', e); }
});

// ─── FOOTBALL LIVE ────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'flive', aliases: ['footballlive', 'footballscore', 'footy'],
    category: 'Sports', description: 'Get football live scores',
    emoji: '⚽'
}, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await sportsGet(XMD.GIFTED.SPORTS.FOOTBALL_LIVE);
        const matches = d?.matches || [];
        const total = d?.totalMatches ?? matches.length;
        if (!matches.length) {
            return reply('⚽ No live football matches right now.');
        }
        const cap = `⚽ *Football Live Scores* (${total} matches)\n\n` +
            matches.slice(0, 10).map(r => fmtMatch(r, '⚽')).join('\n\n') +
            (matches.length > 10 ? `\n\n_...and ${matches.length - 10} more_` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Football Live', e); }
});

bwmxmd({
    pattern: 'flive2', aliases: ['footballlive2', 'footballscore2', 'footy2'],
    category: 'Sports', description: 'Get football live scores (alternate source)',
    emoji: '⚽'
}, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await sportsGet(XMD.GIFTED.SPORTS.FOOTBALL_LIVE2);
        const matches = d?.matches || [];
        const total = d?.totalMatches ?? matches.length;
        if (!matches.length) {
            return reply('⚽ No live football matches right now (source 2).');
        }
        const cap = `⚽ *Football Live Scores V2* (${total} matches)\n\n` +
            matches.slice(0, 10).map(r => fmtMatch(r, '⚽')).join('\n\n') +
            (matches.length > 10 ? `\n\n_...and ${matches.length - 10} more_` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Football Live V2', e); }
});

// ─── FOOTBALL PREDICTIONS ─────────────────────────────────────────────────────

bwmxmd({
    pattern: 'predictions', aliases: ['predict', 'footballpredict', 'fpred'],
    category: 'Sports', description: 'Get football match predictions (optional: date YYYY-MM-DD)',
    emoji: '🔮', use: '[date]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const date = (q || '').trim() || null;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const preds = await sportsGet(XMD.GIFTED.SPORTS.FOOTBALL_PREDICT, date);
        const list = Array.isArray(preds) ? preds : [preds];
        if (!list.length) return reply('🔮 No predictions available right now.');
        const cap = `🔮 *Football Predictions*${date ? ` — ${date}` : ''}\n\n` +
            list.slice(0, 10).map((p, i) => {
                const ft = p.predictions?.fulltime;
                const ov = p.predictions?.over_2_5;
                const result = p.result ? `✅ Result: *${p.result}*` : '⏳ Upcoming';
                return `*${i + 1}.* ${p.match || 'Unknown Match'}\n` +
                    `   🏆 ${p.league || 'Unknown League'}\n` +
                    `   ⏰ ${p.time || 'TBD'}\n` +
                    (ft ? `   🎯 Home: ${ft.home?.toFixed(0)}% | Draw: ${ft.draw?.toFixed(0)}% | Away: ${ft.away?.toFixed(0)}%\n` : '') +
                    (ov ? `   📊 Over 2.5: ${ov.yes?.toFixed(0)}% | Under: ${ov.no?.toFixed(0)}%\n` : '') +
                    `   ${result}`;
            }).join('\n\n') +
            (list.length > 10 ? `\n\n_...and ${list.length - 10} more predictions_` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Predictions', e); }
});

// ─── FOOTBALL STREAMING ───────────────────────────────────────────────────────

bwmxmd({
    pattern: 'fstream', aliases: ['footballstream', 'watchfootball', 'streamfootball'],
    category: 'Sports', description: 'Get football streaming match links (optional: league name)',
    emoji: '📡', use: '[league]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const league = (q || '').trim() || null;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await sportsGet(XMD.GIFTED.SPORTS.FOOTBALL_STREAM, league);
        const matches = d?.matches || (Array.isArray(d) ? d : []);
        const total = d?.totalMatches ?? matches.length;
        if (!matches.length) return reply('📡 No streaming matches available right now.');
        const cap = `📡 *Football Streaming* (${total} matches)\n\n` +
            matches.slice(0, 8).map((r, i) => {
                const score = (r.homeScore !== undefined && r.awayScore !== undefined)
                    ? `${r.homeScore} - ${r.awayScore}` : 'vs';
                const streams = r.streams || r.streamLinks || r.links || [];
                const streamInfo = Array.isArray(streams) && streams.length
                    ? `\n   📺 Streams: ${streams.length} available`
                    : (r.streamUrl || r.url ? `\n   📺 ${r.streamUrl || r.url}` : '');
                return `*${i + 1}.* ⚽ *${r.homeTeam}* ${score} *${r.awayTeam}*` +
                    (r.league || r.competition ? `\n   🏆 ${r.league || r.competition}` : '') +
                    streamInfo;
            }).join('\n\n') +
            (matches.length > 8 ? `\n\n_...and ${matches.length - 8} more_` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Football Streaming', e); }
});

// ─── FOOTBALL NEWS ────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'fnews', aliases: ['footballnews', 'soccernews', 'sportnews'],
    category: 'Sports', description: 'Get latest football news',
    emoji: '📰', use: '[tag]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const tag = (q || '').trim() || null;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await sportsGet(XMD.GIFTED.SPORTS.FOOTBALL_NEWS, tag, null);
        const items = d?.items || (Array.isArray(d) ? d : []);
        if (!items.length) return reply('📰 No football news available right now.');
        const cap = `📰 *Football News*${tag ? ` — #${tag}` : ''}\n\n` +
            items.slice(0, 8).map((item, i) =>
                `*${i + 1}.* ${item.title || 'No title'}\n` +
                (item.summary ? `   📝 ${item.summary.slice(0, 120)}...\n` : '') +
                (item.url || item.link ? `   🔗 ${item.url || item.link}` : '')
            ).join('\n\n');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Football News', e); }
});

// ─── BASKETBALL LIVE ──────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'blive', aliases: ['basketballlive', 'basketballscore', 'nbалайв'],
    category: 'Sports', description: 'Get basketball live scores',
    emoji: '🏀'
}, async (from, client, conText) => {
    const { mek, reply } = conText;
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await sportsGet(XMD.GIFTED.SPORTS.BASKETBALL_LIVE);
        const matches = d?.matches || [];
        const total = d?.totalMatches ?? matches.length;
        if (!matches.length) return reply('🏀 No live basketball matches right now.');
        const cap = `🏀 *Basketball Live Scores* (${total} matches)\n\n` +
            matches.slice(0, 10).map(r => fmtMatch(r, '🏀')).join('\n\n') +
            (matches.length > 10 ? `\n\n_...and ${matches.length - 10} more_` : '');
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await sportsErr(client, from, mek, 'Basketball Live', e); }
});
