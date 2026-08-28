const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getQuotedImage(client, quotedMsg) {
    if (!quotedMsg) return null;
    const t = ['imageMessage', 'stickerMessage'];
    for (const type of t) {
        if (quotedMsg[type]) {
            const ext = mime.extension(quotedMsg[type].mimetype || 'image/jpeg') || 'jpg';
            const filePath = path.join('/tmp', `pf_${Date.now()}.${ext}`);
            await client.downloadAndSaveMediaMessage(quotedMsg[type], filePath.replace(/\.[^.]+$/, ''));
            return { filePath, url: null };
        }
    }
    return null;
}

async function pfFetch(slug, params) {
    const res = await axios.get(XMD.GIFTED.PHOTOFUNIA.URL(slug, params), { timeout: 25000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || d?.error || 'API failure');
    const result = d?.result ?? d?.results ?? d?.data;
    const imgUrl = result?.image_url || (typeof result === 'string' ? result : null);
    if (!imgUrl) throw new Error('No image returned');
    return imgUrl;
}

async function pfSend(from, client, mek, slug, params, caption) {
    await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    try {
        const imgUrl = await pfFetch(slug, params);
        // photofunia.com has hotlink protection — download buffer first
        const imgRes = await axios.get(imgUrl, {
            responseType: 'arraybuffer', timeout: 30000,
            headers: { 'Referer': 'https://photofunia.com/', 'User-Agent': 'Mozilla/5.0' }
        });
        await client.sendMessage(from, { image: Buffer.from(imgRes.data), caption }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error(`[BWM PhotoFunia] ${slug}:`, e.message);
        await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await client.sendMessage(from, { text: `❌ *PhotoFunia* failed: ${e.message?.slice(0, 80)}` }, { quoted: mek });
    }
}

// Get image URL from quoted image (uploads via Gifted media upload if needed)
async function resolveImgUrl(client, quotedMsg, reply) {
    if (!quotedMsg?.imageMessage && !quotedMsg?.stickerMessage) {
        reply('🖼️ Please *reply to an image* with this command.');
        return null;
    }
    const media = await getQuotedImage(client, quotedMsg);
    if (!media) { reply('❌ Could not read image. Try again.'); return null; }
    // Upload the file to get a URL
    try {
        const formData = new (require('form-data'))();
        formData.append('file', fs.createReadStream(media.filePath));
        const up = await axios.post(
            `https://api.gifted.co.ke/api/tools/upload?apikey=${XMD.GIFTED.AK}`,
            formData, { headers: formData.getHeaders(), timeout: 30000 }
        );
        const url = up.data?.result?.url || up.data?.result || up.data?.url;
        if (!url) throw new Error('Upload returned no URL');
        return url;
    } catch (e) {
        // Fallback: use the local path as file:// won't work; try direct Gifted image upload endpoint
        reply('❌ Image upload failed. Please try with a public image URL via *!pfurl*');
        return null;
    } finally {
        if (media.filePath && fs.existsSync(media.filePath)) fs.unlinkSync(media.filePath);
    }
}

// ─── CATALOG ─────────────────────────────────────────────────────────────────
// type: T=text-only, M=mixed(img+text), I=image-only

const PF = {
    // ── TEXT ONLY ──
    balloon:             { label: 'Hot Air Balloon',         type: 'T', params: p => `text=${enc(p.text)}` },
    'hot-air-balloon':   { label: 'Hot Air Balloon (v2)',    type: 'T', params: p => `text=${enc(p.text)}` },
    'snow-sign':         { label: 'Snow Sign',               type: 'T', params: p => `text=${enc(p.text)}` },
    'christmas-writing': { label: 'Christmas Writing',       type: 'T', params: p => `text=${enc(p.text)}` },
    'surfing-board':     { label: 'Surfing Board',           type: 'T', params: p => `text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'beach-sign':        { label: 'Beach Sign',              type: 'T', params: p => `text=${enc(p.text)}` },
    'neon-writing':      { label: 'Neon Writing',            type: 'T', params: p => `text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'watercolour-text':  { label: 'Watercolour Text',        type: 'T', params: p => `text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'glass-bauble':      { label: 'Glass Bauble',            type: 'T', params: p => `text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'haunted-hotel':     { label: 'Haunted Hotel',           type: 'T', params: p => `text=${enc(p.text)}` },
    'cinema-ticket':     { label: 'Cinema Ticket',           type: 'T', params: p => `text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'arrow-signs':       { label: 'Arrow Signs',             type: 'T', params: p => `text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    yacht:               { label: 'Yacht',                   type: 'T', params: p => `text=${enc(p.text)}` },
    'water-writing':     { label: 'Water Writing',           type: 'T', params: p => `text=${enc(p.text)}` },
    bracelet:            { label: 'Bracelet',                type: 'T', params: p => `text=${enc(p.text)}` },
    'nightmare-writing': { label: 'Nightmare Writing',       type: 'T', params: p => `text=${enc(p.text)}` },
    'neon-sign':         { label: 'Neon Sign',               type: 'T', params: p => `text=${enc(p.text)}` },
    'led-road-sign':     { label: 'LED Road Sign',           type: 'T', params: p => `text=${enc(p.text)}&sign=${enc(p.text2||'STOP')}` },
    airline:             { label: 'Airline Ticket',          type: 'T', params: p => `name=${enc(p.text)}` },
    'light-graffiti':    { label: 'Light Graffiti',          type: 'T', params: p => `text=${enc(p.text)}` },
    'rusty-writing':     { label: 'Rusty Writing',           type: 'T', params: p => `text=${enc(p.text)}` },
    'street-sign':       { label: 'Street Sign',             type: 'T', params: p => `text=${enc(p.text)}` },
    'cemetery-gates':    { label: 'Cemetery Gates',          type: 'T', params: p => `text=${enc(p.text)}` },
    'football-player':   { label: 'Football Player Jersey',  type: 'T', params: p => `text=${enc(p.text)}&number=${enc(p.text2||'10')}` },
    'retro-wave':        { label: 'Retro Wave',              type: 'T', params: p => `text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}&text3=${enc(p.text3||p.text)}` },
    'plane-banner':      { label: 'Plane Banner',            type: 'T', params: p => `text=${enc(p.text)}` },
    'fortune-cookie':    { label: 'Fortune Cookie',          type: 'T', params: p => `text=${enc(p.text)}` },
    pendant:             { label: 'Pendant',                 type: 'T', params: p => `text=${enc(p.text)}` },
    'frosty-window-writing': { label: 'Frosty Window Writing', type: 'T', params: p => `text=${enc(p.text)}` },
    einstein:            { label: 'Einstein Quote',          type: 'T', params: p => `text=${enc(p.text)}` },
    'rugby-ball':        { label: 'Rugby Ball',              type: 'T', params: p => `text=${enc(p.text)}` },
    'birthday-cake':     { label: 'Birthday Cake',           type: 'T', params: p => `text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'lipstick-writing':  { label: 'Lipstick Writing',        type: 'T', params: p => `text=${enc(p.text)}` },
    typewriter:          { label: 'Typewriter',              type: 'T', params: p => `text=${enc(p.text)}` },
    'light-writing':     { label: 'Light Writing',           type: 'T', params: p => `text=${enc(p.text)}` },
    'number-plate':      { label: 'Number Plate',            type: 'T', params: p => `text=${enc(p.text)}` },
    'blinking-lights':   { label: 'Blinking Lights',         type: 'T', params: p => `text=${enc(p.text)}` },
    lifebuoy:            { label: 'Lifebuoy',                type: 'T', params: p => `text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    neon:                { label: 'Neon',                    type: 'T', params: p => `text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    // ── IMAGE + TEXT ──
    'morning-paper':      { label: 'Morning Paper',          type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'morning-newspaper':  { label: 'Morning Newspaper',      type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'easter-greetings':   { label: 'Easter Greetings',       type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'christmas-diary':    { label: 'Christmas Diary',        type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'autumn-leaf':        { label: 'Autumn Leaf',            type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'coffee-and-tulips':  { label: 'Coffee & Tulips',        type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'night-street':       { label: 'Night Street',           type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'travellers-diary':   { label: "Traveller's Diary",      type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'vinyl-store':        { label: 'Vinyl Store',            type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'square-billboard':   { label: 'Square Billboard',       type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'hanging-billboard':  { label: 'Hanging Billboard',      type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'double-decker':      { label: 'Double Decker Bus',      type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'vinyl-record':       { label: 'Vinyl Record',           type: 'M', params: p => `url=${enc(p.url)}&artist=${enc(p.text)}&album=${enc(p.text2||p.text)}` },
    pompeii:              { label: 'Pompeii Wall',           type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    miss:                 { label: 'Miss Contest',           type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    affiche:              { label: 'Affiche Poster',         type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    cash:                 { label: 'Cash Frame',             type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    flowers:              { label: 'Flowers Frame',          type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    skateboarder:         { label: 'Skateboarder',           type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    blackboard:           { label: 'Blackboard',             type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    beer:                 { label: 'Beer Glass',             type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    coin:                 { label: 'Gold Coin',              type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    macho:                { label: 'Macho',                  type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    noir:                 { label: 'Noir Detective',         type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'easter-card':        { label: 'Easter Card',            type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'very-old-book':      { label: 'Very Old Book',          type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'snow-globe':         { label: 'Snow Globe',             type: 'M', params: p => `url=${enc(p.url)}&text1=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'morning-mug':        { label: 'Morning Mug',            type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    magazine:             { label: 'Magazine Cover',         type: 'M', params: p => `url=${enc(p.url)}&title=${enc(p.text)}` },
    theatre:              { label: 'Theatre Poster',         type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    meeting:              { label: 'Meeting Caption',        type: 'M', params: p => `url=${enc(p.url)}&caption=${enc(p.text)}` },
    'festive-greetings':  { label: 'Festive Greetings',      type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'xmas-time':          { label: 'Xmas Time',              type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'missing-person':     { label: 'Missing Person',         type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}&text2=${enc(p.text2||p.text)}` },
    'easter-nest':        { label: 'Easter Nest',            type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    badges:               { label: 'Badges',                 type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    daffodils:            { label: 'Daffodils',              type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    quill:                { label: 'Quill Writing',          type: 'M', params: p => `url=${enc(p.url)}&text=${enc(p.text)}` },
    'breaking-news':      { label: 'Breaking News',          type: 'M', params: p => `url=${enc(p.url)}&channel=${enc(p.text)}&title1=${enc(p.text2||p.text)}&title2=${enc(p.text3||'')}` },
    'summer-diary':       { label: 'Summer Diary',           type: 'M', params: p => `url=${enc(p.url)}&url2=${enc(p.url)}&text=${enc(p.text)}` },
    // ── IMAGE ONLY ──
    calendar:     { label: 'Calendar',           type: 'I', params: p => `url=${enc(p.url)}` },
    'wall-poster':{ label: 'Wall Poster',        type: 'I', params: p => `url=${enc(p.url)}` },
    stadium:      { label: 'Stadium',            type: 'I', params: p => `url=${enc(p.url)}` },
    anime:        { label: 'Anime Filter',       type: 'I', params: p => `url=${enc(p.url)}` },
    vampire:      { label: 'Vampire',            type: 'I', params: p => `url=${enc(p.url)}` },
    warhol:       { label: 'Warhol Art',         type: 'I', params: p => `url=${enc(p.url)}` },
    lego:         { label: 'Lego',               type: 'I', params: p => `url=${enc(p.url)}` },
    vhs:          { label: 'VHS Tape',           type: 'I', params: p => `url=${enc(p.url)}` },
    'watercolour-splash': { label: 'Watercolour Splash', type: 'I', params: p => `url=${enc(p.url)}` },
    'postage-stamp':      { label: 'Postage Stamp',       type: 'I', params: p => `url=${enc(p.url)}` },
    mirror:       { label: 'Mirror',             type: 'I', params: p => `url=${enc(p.url)}` },
    'double-exposure': { label: 'Double Exposure', type: 'I', params: p => `url=${enc(p.url)}` },
    superman:     { label: 'Superman',           type: 'I', params: p => `url=${enc(p.url)}` },
    godfather:    { label: 'Godfather',          type: 'I', params: p => `url=${enc(p.url)}` },
    frame:        { label: 'Classic Frame',      type: 'I', params: p => `url=${enc(p.url)}` },
};

function enc(v) { return encodeURIComponent(v || ''); }

const TEXT_EFFECTS  = Object.entries(PF).filter(([,v]) => v.type === 'T');
const MIXED_EFFECTS = Object.entries(PF).filter(([,v]) => v.type === 'M');
const IMG_EFFECTS   = Object.entries(PF).filter(([,v]) => v.type === 'I');

// ─── LIST COMMAND ─────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'pflist', aliases: ['photofunialist', 'pfhelp', 'listpf'],
    category: 'Effects', description: 'List all PhotoFunia effects',
    emoji: '🎨'
}, async (from, client, conText) => {
    const { mek } = conText;
    const tList = TEXT_EFFECTS.map(([k,v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const mList = MIXED_EFFECTS.map(([k,v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const iList = IMG_EFFECTS.map(([k,v]) => `  • \`${k}\` — ${v.label}`).join('\n');

    const msg =
        `🎨 *PhotoFunia Effects* (${Object.keys(PF).length} total)\n\n` +
        `✏️ *Text-only* (${TEXT_EFFECTS.length}) — _!pf <effect> <text>_\n` + tList +
        `\n\n🖼️+✏️ *Image+Text* (${MIXED_EFFECTS.length}) — _reply to image:_ _!pfm <effect> <text>_\n` + mList +
        `\n\n🖼️ *Image-only* (${IMG_EFFECTS.length}) — _reply to image:_ _!pfi <effect>_\n` + iList +
        `\n\n💡 Or use *!photofunia* <slug> <text> for text effects\n` +
        `💡 Use *!pfm* <slug> <text> for image+text effects (reply to image)\n` +
        `💡 Use *!pfi* <slug> for image-only effects (reply to image)`;

    await client.sendMessage(from, { text: msg }, { quoted: mek });
    await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
});

// ─── MASTER TEXT COMMAND ──────────────────────────────────────────────────────

bwmxmd({
    pattern: 'photofunia', aliases: ['pf', 'pftext'],
    category: 'Effects', description: 'PhotoFunia text effect. !photofunia <effect> <text> [| text2]',
    emoji: '🎨', use: '<effect> <text> [| text2]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw = (q || '').trim();
    if (!raw) return reply('🎨 Usage: *!photofunia <effect> <text>*\nSee all: *!pflist*');
    const sp = raw.indexOf(' ');
    if (sp === -1) return reply('🎨 Usage: *!photofunia <effect> <text>*');
    const slug = raw.slice(0, sp).trim();
    const rest = raw.slice(sp + 1).trim();
    const eff = PF[slug];
    if (!eff) {
        const sug = Object.keys(PF).filter(k => k.includes(slug.split('-')[0])).slice(0, 5);
        return reply(`❌ Unknown effect: *${slug}*\n${sug.length ? `Try: ${sug.map(s=>`*${s}*`).join(', ')}\n` : ''}See all: *!pflist*`);
    }
    if (eff.type !== 'T') return reply(`❌ *${slug}* needs an image. Use *!pfm ${slug} <text>* (reply to image)`);
    const parts = rest.split('|').map(s => s.trim()).filter(Boolean);
    const pObj = { text: parts[0] || '', text2: parts[1] || '', text3: parts[2] || '' };
    await pfSend(from, client, mek, slug, eff.params(pObj), `🎨 *${eff.label}*\n✏️ ${parts.join(' | ')}`);
});

// ─── MASTER IMAGE+TEXT COMMAND ────────────────────────────────────────────────

bwmxmd({
    pattern: 'pfm', aliases: ['photofuniam', 'pfmix', 'pfimg'],
    category: 'Effects', description: 'PhotoFunia image+text effect. Reply to an image: !pfm <effect> <text>',
    emoji: '🎨', use: '<effect> <text>'
}, async (from, client, conText) => {
    const { mek, reply, q, quotedMsg } = conText;
    const raw = (q || '').trim();
    if (!raw) return reply('🎨 Reply to an image:\n*!pfm <effect> <text>*\nSee all: *!pflist*');
    const sp = raw.indexOf(' ');
    const slug = sp === -1 ? raw : raw.slice(0, sp).trim();
    const rest = sp === -1 ? '' : raw.slice(sp + 1).trim();
    const eff = PF[slug];
    if (!eff) return reply(`❌ Unknown effect: *${slug}*. See all: *!pflist*`);
    if (eff.type === 'I') return reply(`❌ *${slug}* is image-only. Use *!pfi ${slug}* (reply to image)`);
    if (eff.type === 'T') return reply(`❌ *${slug}* is text-only. Use *!photofunia ${slug} <text>*`);
    const imgUrl = await resolveImgUrl(client, quotedMsg, reply);
    if (!imgUrl) return;
    const parts = rest.split('|').map(s => s.trim()).filter(Boolean);
    const pObj = { url: imgUrl, text: parts[0] || '', text2: parts[1] || '', text3: parts[2] || '' };
    await pfSend(from, client, mek, slug, eff.params(pObj), `🎨 *${eff.label}*\n✏️ ${parts.join(' | ') || '—'}`);
});

// ─── MASTER IMAGE-ONLY COMMAND ────────────────────────────────────────────────

bwmxmd({
    pattern: 'pfi', aliases: ['photofuniai', 'pfimage', 'pffilter'],
    category: 'Effects', description: 'PhotoFunia image-only filter. Reply to an image: !pfi <effect>',
    emoji: '🎨', use: '<effect>'
}, async (from, client, conText) => {
    const { mek, reply, q, quotedMsg } = conText;
    const slug = (q || '').trim();
    if (!slug) return reply('🎨 Reply to an image:\n*!pfi <effect>*\nSee all: *!pflist*');
    const eff = PF[slug];
    if (!eff) return reply(`❌ Unknown effect: *${slug}*. See all: *!pflist*`);
    if (eff.type !== 'I') return reply(`❌ *${slug}* is not image-only. Use *!photofunia* or *!pfm* instead.`);
    const imgUrl = await resolveImgUrl(client, quotedMsg, reply);
    if (!imgUrl) return;
    await pfSend(from, client, mek, slug, eff.params({ url: imgUrl }), `🎨 *${eff.label}*`);
});

// ─── TEXT-ONLY SHORTCUTS ──────────────────────────────────────────────────────

const textShorts = [
    { p: 'pfballoon',      a: ['pfhotairballoon'],        slug: 'balloon',             hint: 'text' },
    { p: 'pfsnowsign',     a: ['pfsnow'],                 slug: 'snow-sign',            hint: 'text' },
    { p: 'pfchristmas',    a: ['pfxmaswrite'],            slug: 'christmas-writing',    hint: 'text' },
    { p: 'pfbeach',        a: ['pfbeachsign'],            slug: 'beach-sign',           hint: 'text' },
    { p: 'pfneonwrite',    a: ['pfneonwriting'],          slug: 'neon-writing',         hint: 'text [| text2]' },
    { p: 'pfwatercolour',  a: ['pfwctext'],               slug: 'watercolour-text',     hint: 'text [| text2]' },
    { p: 'pfhauntedhotel', a: ['pfhorrortext'],           slug: 'haunted-hotel',        hint: 'text' },
    { p: 'pfcinema',       a: ['pfcinematicket'],         slug: 'cinema-ticket',        hint: 'text [| text2]' },
    { p: 'pfyacht',        a: [],                         slug: 'yacht',                hint: 'text' },
    { p: 'pfwater',        a: ['pfwaterwrite'],           slug: 'water-writing',        hint: 'text' },
    { p: 'pfbracelet',     a: [],                         slug: 'bracelet',             hint: 'text' },
    { p: 'pfnightmare',    a: ['pfnightmaretext'],        slug: 'nightmare-writing',    hint: 'text' },
    { p: 'pfneon',         a: ['pfneonsign'],             slug: 'neon-sign',            hint: 'text' },
    { p: 'pfairline',      a: ['pfticket','pfplane'],     slug: 'airline',              hint: 'name' },
    { p: 'pfrustywrit',    a: ['pfrustywrite','pfrusty'], slug: 'rusty-writing',        hint: 'text' },
    { p: 'pfstreetsign',   a: ['pfstreet'],               slug: 'street-sign',          hint: 'text' },
    { p: 'pfgraveyard',    a: ['pfcemetery'],             slug: 'cemetery-gates',       hint: 'text' },
    { p: 'pffootballjsy',  a: ['pfjersey'],               slug: 'football-player',      hint: 'name [| number]' },
    { p: 'pfretrwave',     a: ['pfretro'],                slug: 'retro-wave',           hint: 'text [| text2]' },
    { p: 'pfplanebanner',  a: ['pfbanner'],               slug: 'plane-banner',         hint: 'text' },
    { p: 'pffortune',      a: ['pfcookie'],               slug: 'fortune-cookie',       hint: 'text' },
    { p: 'pfpendant',      a: [],                         slug: 'pendant',              hint: 'text' },
    { p: 'pffrosty',       a: ['pffrostywin'],            slug: 'frosty-window-writing',hint: 'text' },
    { p: 'pfeinstein',     a: [],                         slug: 'einstein',             hint: 'text' },
    { p: 'pfrugby',        a: ['pfrugbyball'],            slug: 'rugby-ball',           hint: 'text' },
    { p: 'pfbday',         a: ['pfbirthday'],             slug: 'birthday-cake',        hint: 'name [| message]' },
    { p: 'pflipstick',     a: ['pflipstickwrite'],        slug: 'lipstick-writing',     hint: 'text' },
    { p: 'pftypewriter',   a: [],                         slug: 'typewriter',           hint: 'text' },
    { p: 'pflightwrite',   a: ['pflightwriting'],         slug: 'light-writing',        hint: 'text' },
    { p: 'pfplate',        a: ['pfnumberplate'],          slug: 'number-plate',         hint: 'text' },
    { p: 'pfblinkingli',   a: ['pfblink'],                slug: 'blinking-lights',      hint: 'text' },
    { p: 'pflifebuoy',     a: [],                         slug: 'lifebuoy',             hint: 'text [| text2]' },
    { p: 'pfneon2',        a: ['pfduoneon'],              slug: 'neon',                 hint: 'text [| text2]' },
    { p: 'pflightgraff',   a: ['pflightgraffiti'],        slug: 'light-graffiti',       hint: 'text' },
    { p: 'pfledrdsign',    a: ['pfledsign'],              slug: 'led-road-sign',        hint: 'text [| sign]' },
    { p: 'pfarrowsigns',   a: ['pfarrows'],               slug: 'arrow-signs',          hint: 'text1 [| text2]' },
    { p: 'pfsurfboard',    a: ['pfsurfing'],              slug: 'surfing-board',        hint: 'text [| text2]' },
    { p: 'pfglassbauble',  a: ['pfbauble'],               slug: 'glass-bauble',         hint: 'text [| text2]' },
];

for (const s of textShorts) {
    bwmxmd({
        pattern: s.p, aliases: s.a,
        category: 'Effects', description: `PhotoFunia: ${PF[s.slug].label}`,
        emoji: '🎨', use: s.hint
    }, async (from, client, conText) => {
        const { mek, reply, q } = conText;
        const raw = (q || '').trim();
        if (!raw) return reply(`🎨 Usage: *!${s.p} <${s.hint}>*`);
        const parts = raw.split('|').map(t => t.trim()).filter(Boolean);
        const pObj = { text: parts[0] || '', text2: parts[1] || '', text3: parts[2] || '' };
        const eff = PF[s.slug];
        await pfSend(from, client, mek, s.slug, eff.params(pObj), `🎨 *${eff.label}*\n✏️ ${raw}`);
    });
}

// ─── IMAGE+TEXT SHORTCUTS ─────────────────────────────────────────────────────

const mixedShorts = [
    { p: 'pfmorningpaper',  a: ['pfpaper'],              slug: 'morning-paper',       hint: 'text (reply to image)' },
    { p: 'pfnewspaper',     a: ['pfmorningnews'],        slug: 'morning-newspaper',   hint: 'text (reply to image)' },
    { p: 'pfbreaking',      a: ['pfbreakingnews'],       slug: 'breaking-news',       hint: 'channel | headline (reply to image)' },
    { p: 'pfmagazine',      a: ['pfmag'],                slug: 'magazine',            hint: 'title (reply to image)' },
    { p: 'pfvinylrec',      a: ['pfvinyl','pfrecord'],   slug: 'vinyl-record',        hint: 'artist | album (reply to image)' },
    { p: 'pfcash',          a: [],                       slug: 'cash',                hint: 'text (reply to image)' },
    { p: 'pfnoir',          a: [],                       slug: 'noir',                hint: 'text (reply to image)' },
    { p: 'pfbeer',          a: [],                       slug: 'beer',                hint: 'text (reply to image)' },
    { p: 'pfcoin',          a: [],                       slug: 'coin',                hint: 'text (reply to image)' },
    { p: 'pfmiss',          a: [],                       slug: 'miss',                hint: 'text (reply to image)' },
    { p: 'pfaffiche',       a: ['pfaffposter'],          slug: 'affiche',             hint: 'text (reply to image)' },
    { p: 'pfmacho',         a: [],                       slug: 'macho',               hint: 'text (reply to image)' },
    { p: 'pfbillboard',     a: ['pfsqbillboard'],        slug: 'square-billboard',    hint: 'text (reply to image)' },
    { p: 'pfhangbill',      a: ['pfhangingbill'],        slug: 'hanging-billboard',   hint: 'text (reply to image)' },
    { p: 'pfdoubledeck',    a: ['pfdecker'],             slug: 'double-decker',       hint: 'text (reply to image)' },
    { p: 'pfblackboard',    a: ['pfblackbrd'],           slug: 'blackboard',          hint: 'text (reply to image)' },
    { p: 'pfflowers',       a: ['pfflower'],             slug: 'flowers',             hint: 'text (reply to image)' },
    { p: 'pfskate',         a: ['pfskateboarder'],       slug: 'skateboarder',        hint: 'text (reply to image)' },
    { p: 'pfmorningmug',    a: ['pfmug'],                slug: 'morning-mug',         hint: 'text (reply to image)' },
    { p: 'pftheatre',       a: ['pftheaterposter'],      slug: 'theatre',             hint: 'title | subtitle (reply to image)' },
    { p: 'pfmeeting',       a: [],                       slug: 'meeting',             hint: 'caption (reply to image)' },
    { p: 'pfmissing',       a: ['pfmissingperson'],      slug: 'missing-person',      hint: 'name | last seen (reply to image)' },
    { p: 'pfdaffodils',     a: [],                       slug: 'daffodils',           hint: 'text (reply to image)' },
    { p: 'pfbadges',        a: [],                       slug: 'badges',              hint: 'text (reply to image)' },
    { p: 'pfquill',         a: [],                       slug: 'quill',               hint: 'text (reply to image)' },
    { p: 'pfeastercard',    a: ['pfeaster'],             slug: 'easter-card',         hint: 'text (reply to image)' },
    { p: 'pfsnowglobe',     a: ['pfglobe'],              slug: 'snow-globe',          hint: 'text [| text2] (reply to image)' },
    { p: 'pfoldbook',       a: ['pfveryoldbook'],        slug: 'very-old-book',       hint: 'text [| text2] (reply to image)' },
    { p: 'pfpompeii',       a: [],                       slug: 'pompeii',             hint: 'text (reply to image)' },
    { p: 'pfxmastime',      a: ['pfxmastm'],             slug: 'xmas-time',           hint: 'text (reply to image)' },
];

for (const s of mixedShorts) {
    bwmxmd({
        pattern: s.p, aliases: s.a,
        category: 'Effects', description: `PhotoFunia: ${PF[s.slug].label} — reply to image`,
        emoji: '🎨', use: s.hint
    }, async (from, client, conText) => {
        const { mek, reply, q, quotedMsg } = conText;
        const raw = (q || '').trim();
        const imgUrl = await resolveImgUrl(client, quotedMsg, reply);
        if (!imgUrl) return;
        const parts = raw.split('|').map(t => t.trim()).filter(Boolean);
        const pObj = { url: imgUrl, text: parts[0] || '', text2: parts[1] || '', text3: parts[2] || '' };
        const eff = PF[s.slug];
        await pfSend(from, client, mek, s.slug, eff.params(pObj), `🎨 *${eff.label}*\n✏️ ${raw || '—'}`);
    });
}

// ─── IMAGE-ONLY SHORTCUTS ─────────────────────────────────────────────────────

const imgShorts = [
    { p: 'pfcalendar',   a: [],              slug: 'calendar' },
    { p: 'pfwallposter', a: ['pfwall'],      slug: 'wall-poster' },
    { p: 'pfstadium',    a: [],              slug: 'stadium' },
    { p: 'pfanime',      a: ['pfanimify'],   slug: 'anime' },
    { p: 'pfvampire',    a: ['pfvamp'],      slug: 'vampire' },
    { p: 'pfwarhol',     a: ['pfpopart'],    slug: 'warhol' },
    { p: 'pflego',       a: [],              slug: 'lego' },
    { p: 'pfvhs',        a: [],              slug: 'vhs' },
    { p: 'pfwaterclr',   a: ['pfwatercolour','pfwatercolor'], slug: 'watercolour-splash' },
    { p: 'pfstamp',      a: ['pfpostage'],   slug: 'postage-stamp' },
    { p: 'pfmirror',     a: [],              slug: 'mirror' },
    { p: 'pfdoublexp',   a: ['pfdoubleexp'], slug: 'double-exposure' },
    { p: 'pfsuperman',   a: [],              slug: 'superman' },
    { p: 'pfgodfather',  a: [],              slug: 'godfather' },
    { p: 'pfframe',      a: ['pfclassframe'],slug: 'frame' },
];

for (const s of imgShorts) {
    bwmxmd({
        pattern: s.p, aliases: s.a,
        category: 'Effects', description: `PhotoFunia: ${PF[s.slug].label} — reply to image`,
        emoji: '🎨', use: '(reply to image)'
    }, async (from, client, conText) => {
        const { mek, reply, quotedMsg } = conText;
        const imgUrl = await resolveImgUrl(client, quotedMsg, reply);
        if (!imgUrl) return;
        const eff = PF[s.slug];
        await pfSend(from, client, mek, s.slug, eff.params({ url: imgUrl }), `🎨 *${eff.label}*`);
    });
}
