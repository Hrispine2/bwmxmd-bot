const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

const TIMEOUT = 30000;

async function stalkGet(urlFn, ...args) {
    const res = await axios.get(urlFn(...args), { timeout: TIMEOUT });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API returned failure');
    return d?.result ?? d?.results ?? d?.data ?? d;
}

function numFmt(n) {
    if (!n && n !== 0) return 'N/A';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}

async function stalkErr(client, from, mek, label, e) {
    console.error(`[BWM Stalk] ${label}:`, e.message);
    await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
    const msg = e.message?.includes('500') ? `❌ The *${label}* API is currently unavailable. Try again later.`
        : e.message?.includes('timeout') ? `❌ *${label}* request timed out. Try again.`
        : `❌ Could not fetch *${label}*. ${e.message?.slice(0, 60)}`;
    await client.sendMessage(from, { text: msg }, { quoted: mek });
}

// ─── GITHUB STALK ────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'gitstalk', aliases: ['githubstalk', 'github', 'ghstalk'],
    category: 'Stalk', description: 'Stalk a GitHub user profile',
    emoji: '🐱', use: '<username>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const username = (q || '').trim();
    if (!username) return reply('🐱 Please provide a GitHub username.\nExample: *!gitstalk torvalds*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.GITHUB, username);
        const cap =
            `🐱 *GitHub Profile — @${d.username || d.login || username}*\n\n` +
            `👤 *Name:* ${d.name || d.displayName || 'N/A'}\n` +
            `📝 *Bio:* ${d.bio || 'No bio'}\n` +
            `🏢 *Company:* ${d.company || 'N/A'}\n` +
            `📍 *Location:* ${d.location || 'N/A'}\n` +
            `🔗 *Blog:* ${d.blog || d.website || 'N/A'}\n` +
            `📧 *Email:* ${d.email || 'N/A'}\n\n` +
            `📦 *Repos:* ${numFmt(d.public_repos ?? d.repos)}\n` +
            `👥 *Followers:* ${numFmt(d.followers)}\n` +
            `➡️ *Following:* ${numFmt(d.following)}\n` +
            `⭐ *Gists:* ${numFmt(d.public_gists ?? d.gists ?? 0)}\n\n` +
            `🗓️ *Joined:* ${d.created_at ? new Date(d.created_at).toDateString() : d.joined || 'N/A'}\n` +
            `🔗 *Profile:* https://github.com/${d.username || d.login || username}`;
        const pic = d.avatar_url || d.avatar || d.profilePic;
        if (pic) {
            await client.sendMessage(from, { image: { url: pic }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'GitHub Stalk', e); }
});

// ─── TWITTER STALK ───────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'twstalk', aliases: ['twitterstalk', 'twitter', 'xstalk', 'xstalker'],
    category: 'Stalk', description: 'Stalk a Twitter/X user profile',
    emoji: '🐦', use: '<username>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const username = (q || '').trim().replace(/^@/, '');
    if (!username) return reply('🐦 Please provide a Twitter/X username.\nExample: *!twstalk elonmusk*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.TWITTER, username);
        const tweets = d.tweets || [];
        const recentTweet = tweets[0]?.text ? `\n\n💬 *Latest Tweet:*\n_"${tweets[0].text.slice(0, 200)}${tweets[0].text.length > 200 ? '...' : ''}"_` : '';
        const cap =
            `🐦 *Twitter/X — @${d.username || username}*\n\n` +
            `👤 *Name:* ${d.displayName || d.name || 'N/A'}\n` +
            `📝 *Bio:* ${d.bio || 'No bio'}\n` +
            `📍 *Location:* ${d.location || 'N/A'}\n` +
            `🌐 *Website:* ${d.website || 'N/A'}\n` +
            `🗓️ *Joined:* ${d.joined || 'N/A'}\n\n` +
            `👥 *Followers:* ${numFmt(d.followers)}\n` +
            `➡️ *Following:* ${numFmt(d.following)}\n` +
            `🐦 *Tweets:* ${numFmt(d.totalTweets)}\n` +
            `❤️ *Likes:* ${numFmt(d.totalLikes)}\n` +
            `🔗 *Profile:* https://x.com/${d.username || username}` +
            recentTweet;
        const pic = d.profilePic || d.avatar || d.profile_image_url;
        if (pic) {
            await client.sendMessage(from, { image: { url: pic }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'Twitter Stalk', e); }
});

// ─── WHATSAPP CHANNEL STALK ──────────────────────────────────────────────────

bwmxmd({
    pattern: 'wachannel', aliases: ['channelstalk', 'wachannelstalk', 'wacheck'],
    category: 'Stalk', description: 'Stalk a WhatsApp Channel by its invite URL',
    emoji: '📢', use: '<channel-url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const url = (q || '').trim();
    if (!url) return reply('📢 Please provide a WhatsApp channel URL.\nExample: *!wachannel https://whatsapp.com/channel/...*');
    if (!url.includes('whatsapp.com/channel/')) return reply('❌ Invalid WhatsApp channel URL. It should contain *whatsapp.com/channel/*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.WACHANNEL, url);
        const cap =
            `📢 *WhatsApp Channel Info*\n\n` +
            `📛 *Name:* ${d.title || d.name || 'N/A'}\n` +
            `📝 *Description:* ${d.description || 'No description'}\n` +
            `👥 *Followers:* ${d.followers || 'N/A'}\n` +
            `🔗 *URL:* ${url}`;
        const pic = d.img || d.image || d.avatar;
        if (pic && !pic.includes('u_DgJf6')) {
            await client.sendMessage(from, { image: { url: pic }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'WA Channel Stalk', e); }
});

// ─── IP STALK ─────────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'ipstalk', aliases: ['iplookup', 'ipinfo', 'ipcheck', 'ip'],
    category: 'Stalk', description: 'Get detailed info about an IP address',
    emoji: '🌐', use: '<ip-address>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const address = (q || '').trim();
    if (!address) return reply('🌐 Please provide an IP address.\nExample: *!ipstalk 8.8.8.8*');
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(address)) return reply('❌ Invalid IP address format. Example: *192.168.1.1*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.IP, address);
        const cap =
            `🌐 *IP Lookup — ${d.ip || address}*\n\n` +
            `🏳️ *Country:* ${d.country || 'N/A'} (${d.countryCode || '??'})\n` +
            `🌍 *Continent:* ${d.continent || 'N/A'} (${d.continentCode || '??'})\n` +
            `📍 *Region:* ${d.region || 'N/A'}\n` +
            `🏙️ *City:* ${d.city || 'N/A'}\n` +
            `📮 *Postal:* ${d.postal || 'N/A'}\n` +
            `📡 *ASN:* ${d.asn || 'N/A'}\n` +
            `🏢 *ISP / Org:* ${d.asName || d.org || 'N/A'}\n` +
            `🌐 *Domain:* ${d.asDomain || 'N/A'}\n` +
            `🗺️ *Coordinates:* ${d.loc || 'N/A'}\n` +
            `⏰ *Timezone:* ${d.timezone || 'N/A'}`;
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'IP Stalk', e); }
});

// ─── NPM STALK ───────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'npmstalk', aliases: ['npmlookup', 'npminfo', 'npm', 'npmcheck'],
    category: 'Stalk', description: 'Get details about an npm package',
    emoji: '📦', use: '<package-name>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const pkg = (q || '').trim();
    if (!pkg) return reply('📦 Please provide an npm package name.\nExample: *!npmstalk axios*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.NPM, pkg);
        const keywords = Array.isArray(d.keywords) ? d.keywords.join(', ') : (d.keywords || 'N/A');
        const cap =
            `📦 *NPM Package — ${d.name || pkg}*\n\n` +
            `📝 *Description:* ${d.description || 'N/A'}\n` +
            `🔢 *Latest Version:* ${d.version || 'N/A'}\n` +
            `👤 *Owner:* ${d.owner || d.author || 'N/A'}\n` +
            `🕒 *Published:* ${d.publishedDate || d.published || 'N/A'}\n` +
            `🏷️ *Keywords:* ${keywords.slice(0, 100)}\n` +
            `🏠 *Homepage:* ${d.homepage || 'N/A'}\n\n` +
            `🔗 *NPM:* ${d.packageLink || 'https://www.npmjs.com/package/' + pkg}\n` +
            `⬇️ *Download:* ${d.downloadLink || 'N/A'}`;
        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'NPM Stalk', e); }
});

// ─── TIKTOK STALK ────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'ttstalk', aliases: ['tiktokstalk', 'ttstalker'],
    category: 'Stalk', description: 'Stalk a TikTok user profile',
    emoji: '🎵', use: '<username>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const username = (q || '').trim().replace(/^@/, '');
    if (!username) return reply('🎵 Please provide a TikTok username.\nExample: *!ttstalk tiktok*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.TIKTOK, username);
        const website = d.website?.link || d.website || null;
        const cap =
            `🎵 *TikTok — @${d.username || username}*\n\n` +
            `👤 *Display Name:* ${d.name || d.displayName || 'N/A'}\n` +
            `📝 *Bio:* ${d.bio || 'No bio'}\n` +
            (website ? `🌐 *Website:* ${website}\n` : '') +
            `\n👥 *Followers:* ${numFmt(d.followers)}\n` +
            `➡️ *Following:* ${numFmt(d.following)}\n` +
            `❤️ *Likes:* ${numFmt(d.likes)}\n` +
            `🆔 *User ID:* ${d.id || 'N/A'}\n` +
            `🔗 *Profile:* https://www.tiktok.com/@${d.username || username}`;
        const pic = d.avatar || d.avatarUrl || d.profilePic;
        if (pic) {
            await client.sendMessage(from, { image: { url: pic }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'TikTok Stalk', e); }
});

// ─── INSTAGRAM STALK ─────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'igstalk', aliases: ['instastalk', 'igstalker'],
    category: 'Stalk', description: 'Stalk an Instagram user profile',
    emoji: '📸', use: '<username>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const username = (q || '').trim().replace(/^@/, '');
    if (!username) return reply('📸 Please provide an Instagram username.\nExample: *!igstalk instagram*');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await stalkGet(XMD.GIFTED.STALK.INSTAGRAM, username);
        const cap =
            `📸 *Instagram — @${d.username || username}*\n\n` +
            `👤 *Full Name:* ${d.full_name || d.name || d.displayName || 'N/A'}\n` +
            `📝 *Bio:* ${d.biography || d.bio || 'No bio'}\n` +
            `🌐 *Website:* ${d.external_url || d.website || 'N/A'}\n` +
            `🔒 *Private:* ${d.is_private !== undefined ? (d.is_private ? 'Yes' : 'No') : 'N/A'}\n` +
            `✅ *Verified:* ${d.is_verified !== undefined ? (d.is_verified ? 'Yes ✓' : 'No') : 'N/A'}\n\n` +
            `👥 *Followers:* ${numFmt(d.follower_count ?? d.followers)}\n` +
            `➡️ *Following:* ${numFmt(d.following_count ?? d.following)}\n` +
            `📷 *Posts:* ${numFmt(d.media_count ?? d.posts)}\n` +
            `🔗 *Profile:* https://www.instagram.com/${d.username || username}`;
        const pic = d.avatar || d.profile_pic_url || d.profilePic;
        if (pic) {
            await client.sendMessage(from, { image: { url: pic }, caption: cap }, { quoted: mek });
        } else {
            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await stalkErr(client, from, mek, 'Instagram Stalk', e); }
});
