const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

const PROVIDERS = {
    tinyurl:   { key: 'TINYURL',   label: 'TinyURL',    emoji: '🔗' },
    cleanuri:  { key: 'CLEANURI',  label: 'CleanURI',   emoji: '✂️' },
    rebrandly: { key: 'REBRANDLY', label: 'Rebrandly',  emoji: '🏷️' },
    vurl:      { key: 'VURL',      label: 'Vurl',       emoji: '🔀' },
    adfoc:     { key: 'ADFOC',     label: 'Adfoc',      emoji: '💰' },
    ssur:      { key: 'SSUR',      label: 'Ssur',       emoji: '⚡' },
};

function isValidUrl(str) {
    try { const u = new (require('url').URL)(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
}

async function doShorten(urlFn, target) {
    const res = await axios.get(urlFn(target), { timeout: 15000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API failure');
    const result = d?.result ?? d?.results ?? d?.data;
    if (!result || typeof result !== 'string') throw new Error('No shortened URL returned');
    return result;
}

async function shortErr(client, from, mek, label, e) {
    console.error(`[BWM Shortener] ${label}:`, e.message);
    await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
    await client.sendMessage(from, {
        text: `❌ *${label}* failed. ${e.message?.slice(0, 80) || 'Try again.'}`
    }, { quoted: mek });
}

// ─── MASTER: SHORTEN ALL PROVIDERS AT ONCE ───────────────────────────────────

bwmxmd({
    pattern: 'shorten', aliases: ['shorturl', 'urlshorten', 'shrink', 'shortenurl'],
    category: 'shortener', description: 'Shorten a URL using all 6 providers at once',
    emoji: '🔗', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('🔗 Please provide a URL to shorten.\nExample: *!shorten https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Make sure it starts with *http://* or *https://*');

    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const results = await Promise.allSettled(
            Object.entries(PROVIDERS).map(async ([name, p]) => {
                const short = await doShorten(XMD.GIFTED.SHORTENER[p.key], target);
                return { name, label: p.label, emoji: p.emoji, short };
            })
        );

        const lines = results.map(r => {
            if (r.status === 'fulfilled') {
                const { emoji, label, short } = r.value;
                return `${emoji} *${label}:*\n   \`${short}\``;
            } else {
                const name = Object.keys(PROVIDERS)[results.indexOf(r)];
                return `❌ *${PROVIDERS[name]?.label}:* Failed`;
            }
        });

        const worked = results.filter(r => r.status === 'fulfilled').length;
        const cap =
            `🔗 *URL Shortened* (${worked}/${results.length} providers)\n\n` +
            `📎 *Original:* ${target.slice(0, 60)}${target.length > 60 ? '...' : ''}\n\n` +
            lines.join('\n\n');

        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'URL Shorten', e); }
});

// ─── INDIVIDUAL PROVIDER COMMANDS ────────────────────────────────────────────

bwmxmd({
    pattern: 'tinyurl', aliases: ['tiny'],
    category: 'shortener', description: 'Shorten a URL using TinyURL',
    emoji: '🔗', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('🔗 Usage: *!tinyurl https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Must start with http:// or https://');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const short = await doShorten(XMD.GIFTED.SHORTENER.TINYURL, target);
        await client.sendMessage(from, {
            text: `🔗 *TinyURL*\n\n📎 Original: ${target.slice(0, 80)}\n✅ Short: \`${short}\``
        }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'TinyURL', e); }
});

bwmxmd({
    pattern: 'cleanuri', aliases: ['clean'],
    category: 'shortener', description: 'Shorten a URL using CleanURI',
    emoji: '✂️', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('✂️ Usage: *!cleanuri https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Must start with http:// or https://');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const short = await doShorten(XMD.GIFTED.SHORTENER.CLEANURI, target);
        await client.sendMessage(from, {
            text: `✂️ *CleanURI*\n\n📎 Original: ${target.slice(0, 80)}\n✅ Short: \`${short}\``
        }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'CleanURI', e); }
});

bwmxmd({
    pattern: 'rebrandly', aliases: ['rebrand'],
    category: 'shortener', description: 'Shorten a URL using Rebrandly',
    emoji: '🏷️', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('🏷️ Usage: *!rebrandly https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Must start with http:// or https://');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const short = await doShorten(XMD.GIFTED.SHORTENER.REBRANDLY, target);
        await client.sendMessage(from, {
            text: `🏷️ *Rebrandly*\n\n📎 Original: ${target.slice(0, 80)}\n✅ Short: \`${short}\``
        }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'Rebrandly', e); }
});

bwmxmd({
    pattern: 'vurl', aliases: ['vurlshort'],
    category: 'shortener', description: 'Shorten a URL using Vurl',
    emoji: '🔀', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('🔀 Usage: *!vurl https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Must start with http:// or https://');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const short = await doShorten(XMD.GIFTED.SHORTENER.VURL, target);
        await client.sendMessage(from, {
            text: `🔀 *Vurl*\n\n📎 Original: ${target.slice(0, 80)}\n✅ Short: \`${short}\``
        }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'Vurl', e); }
});

bwmxmd({
    pattern: 'adfoc', aliases: ['adfocshort'],
    category: 'shortener', description: 'Shorten a URL using Adfoc (monetized)',
    emoji: '💰', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('💰 Usage: *!adfoc https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Must start with http:// or https://');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const short = await doShorten(XMD.GIFTED.SHORTENER.ADFOC, target);
        await client.sendMessage(from, {
            text: `💰 *Adfoc* _(monetized link)_\n\n📎 Original: ${target.slice(0, 80)}\n✅ Short: \`${short}\``
        }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'Adfoc', e); }
});

bwmxmd({
    pattern: 'ssur', aliases: ['ssurshort'],
    category: 'shortener', description: 'Shorten a URL using Ssur',
    emoji: '⚡', use: '<url>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const target = (q || '').trim();
    if (!target) return reply('⚡ Usage: *!ssur https://example.com*');
    if (!isValidUrl(target)) return reply('❌ Invalid URL. Must start with http:// or https://');
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const short = await doShorten(XMD.GIFTED.SHORTENER.SSUR, target);
        await client.sendMessage(from, {
            text: `⚡ *Ssur*\n\n📎 Original: ${target.slice(0, 80)}\n✅ Short: \`${short}\``
        }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await shortErr(client, from, mek, 'Ssur', e); }
});
