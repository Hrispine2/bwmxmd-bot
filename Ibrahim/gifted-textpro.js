const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// ─── TEXTPRO EFFECTS CATALOG ──────────────────────────────────────────────────
// type: 1 = single text, 2 = text1 + text2

const TP = {
  // ── Single Text ──
  xmasCard3d:      { label: 'Xmas Cards 3D',                  type: 1 },
  jokerLogo:       { label: 'Logo Joker',                     type: 1 },
  halloweenFire:   { label: 'Halloween Fire Text',            type: 1 },
  wickerText:      { label: 'Wicker Text',                    type: 1 },
  fireworkSparkle: { label: 'Firework Sparkle',               type: 1 },
  purpleFoilBalloon:{ label: 'Purple Foil Balloon',           type: 1 },
  pinkFoilBalloon: { label: 'Pink Foil Balloon',              type: 1 },
  cyanFoilBalloon: { label: 'Cyan Foil Balloon',              type: 1 },
  blueFoilBalloon: { label: 'Blue Foil Balloon',              type: 1 },
  goldFoilBalloon: { label: 'Gold Foil Balloon',              type: 1 },
  steelText:       { label: 'Steel Text',                     type: 1 },
  decorateGreen:   { label: 'Decorate Green',                 type: 1 },
  lavaText:        { label: 'Lava Text',                      type: 1 },
  greenGlass:      { label: 'Green Glass',                    type: 1 },
  captainAmerica:  { label: 'Captain America',                type: 1 },
  strawberryText:  { label: 'Strawberry Text',                type: 1 },
  boxText3d:       { label: '3D Box Text',                    type: 1 },
  roadWarning:     { label: 'Road Warning',                   type: 1 },
  bokehText:       { label: 'Bokeh Text',                     type: 1 },
  advancedGlow:    { label: 'Advanced Glow',                  type: 1 },
  breakWall:       { label: 'Break Wall',                     type: 1 },
  christmasGift:   { label: 'Christmas Gift',                 type: 1 },
  honeyText:       { label: 'Honey Text',                     type: 1 },
  horrorGift:      { label: 'Horror Gift',                    type: 1 },
  marbleText:      { label: 'Marble Text',                    type: 1 },
  iceCold:         { label: 'Ice Cold',                       type: 1 },
  fruitJuice:      { label: 'Fruit Juice',                    type: 1 },
  rustyMetal:      { label: 'Rusty Metal',                    type: 1 },
  metalRainbow:    { label: 'Metal Rainbow',                  type: 1 },
  purpleGem:       { label: 'Purple Gem',                     type: 1 },
  redJewelry:      { label: 'Red Jewelry',                    type: 1 },
  cyanJewelry:     { label: 'Cyan Jewelry',                   type: 1 },
  hotMetal:        { label: 'Hot Metal',                      type: 1 },
  carbonText:      { label: 'Carbon Text',                    type: 1 },
  blackMetal:      { label: 'Black Metal',                    type: 1 },
  dropwater:       { label: 'Dropwater Text',                 type: 1 },
  glowingMetal3d:  { label: '3D Glowing Metal',               type: 1 },
  // ── Double Text ──
  metalSilver3d:   { label: '3D Metal Silver Logo',           type: 2 },
  metalRoseGold3d: { label: '3D Metal Rose Gold Logo',        type: 2 },
  metalGold3d:     { label: '3D Metal Gold Logo',             type: 2 },
  metalGalaxy3d:   { label: '3D Metal Galaxy Logo',           type: 2 },
  lionMascot:      { label: 'Lion Logo Mascot',               type: 2 },
  wolfLogoBW:      { label: 'Wolf Logo Black & White',        type: 2 },
  steel3d:         { label: '3D Steel Text Logo',             type: 2 },
};

const SINGLE = Object.entries(TP).filter(([,v]) => v.type === 1);
const DOUBLE = Object.entries(TP).filter(([,v]) => v.type === 2);

async function tpGenerate(slug, effect, parts) {
    let params;
    if (effect.type === 1) {
        params = `text=${encodeURIComponent(parts[0])}`;
    } else {
        params = `text1=${encodeURIComponent(parts[0])}&text2=${encodeURIComponent(parts[1] || parts[0])}`;
    }
    const res = await axios.get(XMD.GIFTED.TEXTPRO.URL(slug, params), { timeout: 25000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API failure');
    const result = d?.result ?? d?.results ?? d?.data;
    const imgUrl = result?.image_url || (typeof result === 'string' ? result : null);
    if (!imgUrl) throw new Error('No image URL returned');
    return imgUrl;
}

async function tpSend(from, client, mek, slug, effect, parts) {
    await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    try {
        const imgUrl = await tpGenerate(slug, effect, parts);
        // textpro.me blocks hotlinking — download buffer first
        const imgRes = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'Referer': 'https://textpro.me/', 'User-Agent': 'Mozilla/5.0' }
        });
        const imgBuffer = Buffer.from(imgRes.data);
        const caption = `🖼️ *${effect.label}*\n✏️ ${parts.join(' | ')}`;
        await client.sendMessage(from, { image: imgBuffer, caption }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error(`[BWM TextPro] ${slug}:`, e.message);
        await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await client.sendMessage(from, {
            text: `❌ *${effect.label}* failed. ${e.message?.slice(0, 80)}`
        }, { quoted: mek });
    }
}

// ─── LIST COMMAND ────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'tplist', aliases: ['textprolist', 'listtp', 'tpeffects'],
    category: 'Effects', description: 'List all TextPro.me text image effects',
    emoji: '🖼️'
}, async (from, client, conText) => {
    const { mek } = conText;
    const s1 = SINGLE.map(([k, v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const s2 = DOUBLE.map(([k, v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const cap =
        `🖼️ *TextPro Effects* (${Object.keys(TP).length} total)\n\n` +
        `📝 *Single Text* (${SINGLE.length})\n_!textpro <effect> <text>_\n` + s1 +
        `\n\n✌️ *Double Text* (${DOUBLE.length})\n_!textpro <effect> text1 | text2_\n` + s2 +
        `\n\n💡 *Shortcuts available:* !xmas3d !lava !icecold !captainamerica !rusty !hotmetal !honeyfx !marble !carbon !metalsilver !metalgold etc.`;
    await client.sendMessage(from, { text: cap }, { quoted: mek });
    await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
});

// ─── MASTER COMMAND ──────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'textpro', aliases: ['tpfx', 'tptext', 'tp'],
    category: 'Effects', description: 'Generate TextPro.me text image. !textpro <effect> <text> [| text2]',
    emoji: '🖼️', use: '<effect> <text> [| text2]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw = (q || '').trim();
    if (!raw) return reply('🖼️ Usage: *!textpro <effect> <text>*\nSee all: *!tplist*');
    const spaceIdx = raw.indexOf(' ');
    if (spaceIdx === -1) return reply('🖼️ Usage: *!textpro <effect> <text>*\nExample: *!textpro lavaText Hello*');
    const slug = raw.slice(0, spaceIdx).trim();
    const rest = raw.slice(spaceIdx + 1).trim();
    const effect = TP[slug];
    if (!effect) {
        const sug = Object.keys(TP).filter(k => k.toLowerCase().includes(slug.toLowerCase())).slice(0, 5);
        return reply(`❌ Unknown effect: *${slug}*\n` +
            (sug.length ? `Did you mean: ${sug.map(s=>`*${s}*`).join(', ')}?\n` : '') +
            `See all: *!tplist*`);
    }
    const parts = rest.split('|').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return reply(`❌ Please provide text.\nExample: *!textpro ${slug} ${effect.type > 1 ? 'text1 | text2' : 'Your Text'}*`);
    await tpSend(from, client, mek, slug, effect, parts);
});

// ─── SINGLE-TEXT SHORTCUTS ────────────────────────────────────────────────────

const singleShorts = [
    { p: 'xmas3d',          a: ['xmascard','xmasfx'],         slug: 'xmasCard3d',      label: 'Xmas Cards 3D' },
    { p: 'lava',            a: ['lavatext','lavafx'],          slug: 'lavaText',        label: 'Lava Text' },
    { p: 'icecold',         a: ['icetext','icefx'],            slug: 'iceCold',         label: 'Ice Cold' },
    { p: 'captainamerica',  a: ['capamerica','capfx'],         slug: 'captainAmerica',  label: 'Captain America' },
    { p: 'rusty',           a: ['rustymetal','rustyfx'],       slug: 'rustyMetal',      label: 'Rusty Metal' },
    { p: 'hotmetal',        a: ['hotmetalfx'],                 slug: 'hotMetal',        label: 'Hot Metal' },
    { p: 'honeyfx',         a: ['honeytext'],                  slug: 'honeyText',       label: 'Honey Text' },
    { p: 'marble',          a: ['marbletext','marblefx'],      slug: 'marbleText',      label: 'Marble Text' },
    { p: 'carbon',          a: ['carbontext','carbonfx'],      slug: 'carbonText',      label: 'Carbon Text' },
    { p: 'blackmetal',      a: ['blackmetalfx'],               slug: 'blackMetal',      label: 'Black Metal' },
    { p: 'steelfx',         a: ['steeltext'],                  slug: 'steelText',       label: 'Steel Text' },
    { p: 'metalrainbow',    a: ['rainbowmetal'],               slug: 'metalRainbow',    label: 'Metal Rainbow' },
    { p: 'purplegem',       a: ['gemfx','purplegemfx'],        slug: 'purpleGem',       label: 'Purple Gem' },
    { p: 'bokehfx',         a: ['bokeh','bokehtext'],          slug: 'bokehText',       label: 'Bokeh Text' },
    { p: 'breakwall',       a: ['breakwalltext','wallfx'],     slug: 'breakWall',       label: 'Break Wall' },
    { p: 'fruity',          a: ['fruitjuice','fruitfx'],       slug: 'fruitJuice',      label: 'Fruit Juice' },
    { p: 'halloweenfx',     a: ['halloween','halloweenfire'],  slug: 'halloweenFire',   label: 'Halloween Fire' },
    { p: 'roadwarning',     a: ['road','roadfx'],              slug: 'roadWarning',     label: 'Road Warning' },
    { p: 'xmasjoker',       a: ['jokerfx','jokertext'],        slug: 'jokerLogo',       label: 'Joker Logo' },
    { p: 'strawberry',      a: ['strawberryfx','berrytext'],   slug: 'strawberryText',  label: 'Strawberry Text' },
    { p: 'glowingmetal',    a: ['glowmetal','metalglowing'],   slug: 'glowingMetal3d',  label: '3D Glowing Metal' },
    { p: 'dropwater',       a: ['waterdrop','dropfx'],         slug: 'dropwater',       label: 'Dropwater Text' },
    { p: 'horrorgift',      a: ['horrorfx','gifthorror'],      slug: 'horrorGift',      label: 'Horror Gift' },
    { p: 'christmasgift',   a: ['xmasgift','christmasfx'],     slug: 'christmasGift',   label: 'Christmas Gift' },
];

for (const s of singleShorts) {
    bwmxmd({
        pattern: s.p, aliases: s.a,
        category: 'Effects', description: `TextPro: *${s.label}* text image effect`,
        emoji: '🖼️', use: '<text>'
    }, async (from, client, conText) => {
        const { mek, reply, q } = conText;
        const text = (q || '').trim();
        if (!text) return reply(`🖼️ Usage: *!${s.p} <your text>*`);
        await tpSend(from, client, mek, s.slug, TP[s.slug], [text]);
    });
}

// ─── DOUBLE-TEXT SHORTCUTS ────────────────────────────────────────────────────

const doubleShorts = [
    { p: 'metalsilver',   a: ['silver3d','metalsilver3d'],   slug: 'metalSilver3d',   label: '3D Metal Silver Logo' },
    { p: 'metalgold',     a: ['gold3d','metallogo3d'],        slug: 'metalGold3d',     label: '3D Metal Gold Logo' },
    { p: 'metalrosegold', a: ['rosegold','rosegold3d'],       slug: 'metalRoseGold3d', label: '3D Metal Rose Gold Logo' },
    { p: 'metalgalaxy',   a: ['galaxy3d','galaxymetal'],      slug: 'metalGalaxy3d',   label: '3D Metal Galaxy Logo' },
    { p: 'lionmascot',    a: ['lion','lionfx'],               slug: 'lionMascot',      label: 'Lion Logo Mascot' },
    { p: 'wolfbw',        a: ['wolflogobw','wolfblackwhite'], slug: 'wolfLogoBW',      label: 'Wolf Logo B&W' },
    { p: 'steel3d',       a: ['steellogo3d','steel3dfx'],     slug: 'steel3d',         label: '3D Steel Text Logo' },
];

for (const s of doubleShorts) {
    bwmxmd({
        pattern: s.p, aliases: s.a,
        category: 'Effects', description: `TextPro: *${s.label}* — use | to separate two texts`,
        emoji: '🖼️', use: '<text1> | <text2>'
    }, async (from, client, conText) => {
        const { mek, reply, q } = conText;
        const raw = (q || '').trim();
        if (!raw) return reply(`🖼️ Usage: *!${s.p} text1 | text2*`);
        const parts = raw.split('|').map(t => t.trim()).filter(Boolean);
        if (parts.length < 2) parts.push(parts[0]);
        await tpSend(from, client, mek, s.slug, TP[s.slug], parts);
    });
}
