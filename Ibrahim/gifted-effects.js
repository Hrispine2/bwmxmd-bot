const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

// ─── EFFECTS CATALOG ─────────────────────────────────────────────────────────
// type: 1=single text, 2=text1+text2, 3=text1+text2+text3
// special: 'style' means accepts optional style param (1-3)

const EFFECTS = {
  // ── Single Text ──
  hackerAvatar:        { label: 'Hacker Avatar (Neon)',      type: 1, special: 'style' },
  blackpinkLogo:       { label: 'Blackpink Logo',            type: 1 },
  advancedGlow:        { label: 'Advanced Glow',             type: 1 },
  pixelGlitch:         { label: 'Pixel Glitch',              type: 1 },
  neonGlitch:          { label: 'Neon Glitch',               type: 1 },
  blackpinkStyle:      { label: 'Blackpink Style',           type: 1 },
  summerBeach:         { label: 'Summer Beach',              type: 1 },
  luxuryGold:          { label: 'Luxury Gold',               type: 1 },
  sandSummer:          { label: 'Sand Summer',               type: 1 },
  blackpinkSignatures: { label: 'Blackpink Signatures',      type: 1 },
  neonGalaxy:          { label: 'Neon Galaxy',               type: 1 },
  hotAirBalloon:       { label: 'Hot Air Balloon',           type: 1 },
  zodiacLogo:          { label: 'Zodiac Logo',               type: 1 },
  metalMascot:         { label: 'Metal Mascot',              type: 1 },
  doubleExposure:      { label: 'Double Exposure',           type: 1 },
  hollywoodStar:       { label: 'Hollywood Star',            type: 1 },
  astronautMascot:     { label: 'Astronaut Mascot',          type: 1 },
  greenNeon:           { label: 'Green Neon',                type: 1 },
  jokerAvatar:         { label: 'Joker Avatar',              type: 1 },
  dragonSteel:         { label: 'Dragon Steel',              type: 1 },
  lightGalaxy:         { label: 'Light Galaxy',              type: 1 },
  natureTexture:       { label: 'Nature Texture',            type: 1 },
  typographyOnline:    { label: 'Typography Online',         type: 1 },
  angelWing:           { label: 'Angel Wing',                type: 1 },
  noelText:            { label: 'Noel Text',                 type: 1 },
  wooden3d:            { label: 'Wooden 3D',                 type: 1 },
  textByName:          { label: 'Text By Name',              type: 1 },
  galaxyWrite:         { label: 'Galaxy Write',              type: 1 },
  // ── Double Text (use | to separate) ──
  deadpool:            { label: 'Deadpool Logo',             type: 2 },
  thorLogo:            { label: 'Thor Logo',                 type: 2 },
  teamLogoBW:          { label: 'Team Logo B&W',             type: 2 },
  graffitiGirl:        { label: 'Graffiti Girl',             type: 2 },
  graffitiWall:        { label: 'Graffiti Wall',             type: 2 },
  glitterText:         { label: 'Glitter Text',              type: 2 },
  floralBanner:        { label: 'Floral Banner',             type: 2 },
  gunGamingLogo:       { label: 'Gun Gaming Logo',           type: 2 },
  mountainLogoBW:      { label: 'Mountain Logo B&W',         type: 2 },
  letterLogo:          { label: 'Letter Logo',               type: 2 },
  gradientLogo3d:      { label: 'Gradient Logo 3D',          type: 2 },
  textLogoMaker:       { label: 'Text Logo Maker',           type: 2 },
  avengersLogo:        { label: 'Avengers Logo',             type: 2 },
  metallicGlass:       { label: 'Metallic Glass',            type: 2 },
  footballShirt:       { label: 'Football Shirt',            type: 2 },
  bornPink:            { label: 'Born Pink Album',           type: 2 },
  pencilSketch:        { label: 'Pencil Sketch Logo',        type: 2 },
  woodText3d:          { label: '3D Wood Text',              type: 2 },
  wolfGalaxy:          { label: 'Wolf Galaxy Logo',          type: 2 },
  // ── Triple Text (use | to separate) ──
  wingsLogo:           { label: 'Wings Logo',                type: 3 },
};

const SINGLE = Object.entries(EFFECTS).filter(([,v]) => v.type === 1);
const DOUBLE = Object.entries(EFFECTS).filter(([,v]) => v.type === 2);
const TRIPLE = Object.entries(EFFECTS).filter(([,v]) => v.type === 3);

async function generateEffect(slug, effect, parts, style) {
    let params;
    if (effect.type === 1) {
        params = `text=${encodeURIComponent(parts[0])}`;
        if (effect.special === 'style' && style) params += `&style=${style}`;
    } else if (effect.type === 2) {
        params = `text1=${encodeURIComponent(parts[0])}&text2=${encodeURIComponent(parts[1] || parts[0])}`;
    } else {
        params = `text1=${encodeURIComponent(parts[0])}&text2=${encodeURIComponent(parts[1] || parts[0])}&text3=${encodeURIComponent(parts[2] || parts[0])}`;
    }
    const res = await axios.get(XMD.GIFTED.EPHOTO.URL(slug, params), { timeout: 25000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API failure');
    const result = d?.result ?? d?.results ?? d?.data;
    const imgUrl = result?.image_url || (typeof result === 'string' ? result : null);
    if (!imgUrl) throw new Error('No image URL in response');
    return imgUrl;
}

async function sendEffect(from, client, mek, slug, effect, parts, style) {
    await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    try {
        const imgUrl = await generateEffect(slug, effect, parts, style);
        const caption = `🎨 *${effect.label}*\n✏️ ${parts.join(' | ')}`;
        await client.sendMessage(from, { image: { url: imgUrl }, caption }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.error(`[BWM Effects] ${slug}:`, e.message);
        await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await client.sendMessage(from, {
            text: `❌ *${effect.label}* failed. ${e.message?.slice(0, 80)}`
        }, { quoted: mek });
    }
}

function parseInput(q, effect) {
    const raw = (q || '').trim();
    const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return null;
    return parts;
}

// ─── EFFECTS LIST ─────────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'fxlist', aliases: ['effectslist', 'texteffects', 'listfx', 'effects'],
    category: 'Effects', description: 'List all available text image effects',
    emoji: '🎨'
}, async (from, client, conText) => {
    const { mek } = conText;
    const s1 = SINGLE.map(([k, v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const s2 = DOUBLE.map(([k, v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const s3 = TRIPLE.map(([k, v]) => `  • \`${k}\` — ${v.label}`).join('\n');
    const cap =
        `🎨 *Text Image Effects* (${Object.keys(EFFECTS).length} total)\n\n` +
        `📝 *Single Text* (${SINGLE.length})\n` +
        `_Usage: !textfx <effect> <your text>_\n` + s1 +
        `\n\n✌️ *Double Text* (${DOUBLE.length})\n` +
        `_Usage: !textfx <effect> text1 | text2_\n` + s2 +
        `\n\n✨ *Triple Text* (${TRIPLE.length})\n` +
        `_Usage: !textfx <effect> t1 | t2 | t3_\n` + s3 +
        `\n\n💡 *Hacker Avatar style:* !textfx hackerAvatar 1 your text\n` +
        `💡 *Shortcuts:* !neonglitch !pixelglitch !joker !deadpool !avengers !wingslogo etc.`;
    await client.sendMessage(from, { text: cap }, { quoted: mek });
    await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
});

// ─── MASTER COMMAND ───────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'textfx', aliases: ['fxtext', 'imgeffect', 'texteffect'],
    category: 'Effects', description: 'Generate text art image. Usage: !textfx <effect> <text> [| text2] [| text3]',
    emoji: '🎨', use: '<effect> <text> [| text2 | text3]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw = (q || '').trim();
    if (!raw) return reply('🎨 Usage: *!textfx <effect> <text>*\nSee all effects: *!fxlist*');

    const spaceIdx = raw.indexOf(' ');
    if (spaceIdx === -1) return reply('🎨 Usage: *!textfx <effect> <text>*\nExample: *!textfx neonGlitch Hello World*');

    let slug = raw.slice(0, spaceIdx).trim();
    const rest = raw.slice(spaceIdx + 1).trim();

    // Handle hackerAvatar special: !textfx hackerAvatar 2 Your Text
    let style = null;
    let textPart = rest;
    if (slug === 'hackerAvatar') {
        const m = rest.match(/^([1-3])\s+(.+)$/s);
        if (m) { style = m[1]; textPart = m[2].trim(); }
    }

    const effect = EFFECTS[slug];
    if (!effect) {
        const suggestions = Object.keys(EFFECTS).filter(k => k.toLowerCase().includes(slug.toLowerCase())).slice(0, 5);
        return reply(`❌ Unknown effect: *${slug}*\n` +
            (suggestions.length ? `Did you mean: ${suggestions.map(s => `*${s}*`).join(', ')}?\n` : '') +
            `See full list: *!fxlist*`);
    }

    const parts = textPart.split('|').map(s => s.trim()).filter(Boolean);
    const needed = effect.type;
    if (!parts.length) return reply(`❌ Please provide text after the effect name.\nExample: *!textfx ${slug} ${needed > 1 ? 'text1 | text2' : 'Your Text'}*`);

    await sendEffect(from, client, mek, slug, effect, parts, style);
});

// ─── POPULAR SHORTCUTS ────────────────────────────────────────────────────────

// -- Single-text shortcuts --

const singleShortcuts = [
    { pattern: 'neonglitch',      aliases: ['neonglitchfx'], slug: 'neonGlitch',         label: 'Neon Glitch' },
    { pattern: 'pixelglitch',     aliases: ['pixelglitchfx'], slug: 'pixelGlitch',        label: 'Pixel Glitch' },
    { pattern: 'luxurygold',      aliases: ['goldtext','luxgold'], slug: 'luxuryGold',     label: 'Luxury Gold' },
    { pattern: 'neongalaxy',      aliases: ['galaxyneon'],   slug: 'neonGalaxy',          label: 'Neon Galaxy' },
    { pattern: 'galaxywrite',     aliases: ['galwrite'],     slug: 'galaxyWrite',          label: 'Galaxy Write' },
    { pattern: 'joker',           aliases: ['jokeravatar'],  slug: 'jokerAvatar',          label: 'Joker Avatar' },
    { pattern: 'hollywoodstar',   aliases: ['hwoodstar'],    slug: 'hollywoodStar',        label: 'Hollywood Star' },
    { pattern: 'astronaut',       aliases: ['astronautfx'],  slug: 'astronautMascot',      label: 'Astronaut Mascot' },
    { pattern: 'angelwing',       aliases: ['angelfx'],      slug: 'angelWing',            label: 'Angel Wing' },
    { pattern: 'dragonsteel',     aliases: ['dragontext'],   slug: 'dragonSteel',          label: 'Dragon Steel' },
    { pattern: 'greenneon',       aliases: ['neongreen'],    slug: 'greenNeon',            label: 'Green Neon' },
    { pattern: 'zodiactext',      aliases: ['zodiac'],       slug: 'zodiacLogo',           label: 'Zodiac Logo' },
    { pattern: 'summerbeach',     aliases: ['beachtext'],    slug: 'summerBeach',          label: 'Summer Beach' },
    { pattern: 'wooden3dtext',    aliases: ['woodentext'],   slug: 'wooden3d',             label: 'Wooden 3D' },
    { pattern: 'lightgalaxy',     aliases: ['galaxylight'],  slug: 'lightGalaxy',          label: 'Light Galaxy' },
];

for (const s of singleShortcuts) {
    bwmxmd({
        pattern: s.pattern, aliases: s.aliases,
        category: 'Effects', description: `Generate *${s.label}* text image effect`,
        emoji: '🎨', use: '<text>'
    }, async (from, client, conText) => {
        const { mek, reply, q } = conText;
        const text = (q || '').trim();
        if (!text) return reply(`🎨 Usage: *!${s.pattern} <your text>*`);
        await sendEffect(from, client, mek, s.slug, EFFECTS[s.slug], [text], null);
    });
}

// -- Hacker Avatar (has style param) --
bwmxmd({
    pattern: 'hackeravatar', aliases: ['hacker','hackerave','hackerneon'],
    category: 'Effects', description: 'Generate Anonymous Hacker Cyan Neon avatar',
    emoji: '🕵️', use: '[1-3] <text>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw = (q || '').trim();
    if (!raw) return reply('🕵️ Usage: *!hackeravatar [1-3] Your Text*\nStyles 1, 2, 3 available.');
    const m = raw.match(/^([1-3])\s+(.+)$/s);
    const style = m ? m[1] : '1';
    const text  = m ? m[2].trim() : raw;
    await sendEffect(from, client, mek, 'hackerAvatar', EFFECTS.hackerAvatar, [text], style);
});

// -- Double-text shortcuts --
const doubleShortcuts = [
    { pattern: 'deadpool',     aliases: ['deadpoolfx'],    slug: 'deadpool',       label: 'Deadpool Logo' },
    { pattern: 'avengers',     aliases: ['avengersfx'],    slug: 'avengersLogo',   label: 'Avengers Logo' },
    { pattern: 'thor',         aliases: ['thorfx'],        slug: 'thorLogo',       label: 'Thor Logo' },
    { pattern: 'glittertext',  aliases: ['glitterfx'],     slug: 'glitterText',    label: 'Glitter Text' },
    { pattern: 'teamlogobw',   aliases: ['teamlogofx'],    slug: 'teamLogoBW',    label: 'Team Logo B&W' },
    { pattern: 'graffitiwall', aliases: ['graffiti'],      slug: 'graffitiWall',   label: 'Graffiti Wall' },
    { pattern: 'graffitgirl',  aliases: ['graffitigirl'],  slug: 'graffitiGirl',   label: 'Graffiti Girl' },
    { pattern: 'metallicglass',aliases: ['metallic'],      slug: 'metallicGlass',  label: 'Metallic Glass' },
    { pattern: 'footballshirt',aliases: ['shirtfx'],       slug: 'footballShirt',  label: 'Football Shirt' },
    { pattern: 'letterlogo',   aliases: ['letterfx'],      slug: 'letterLogo',     label: 'Letter Logo' },
    { pattern: 'wolfgalaxy',   aliases: ['wolftext'],      slug: 'wolfGalaxy',     label: 'Wolf Galaxy Logo' },
    { pattern: 'pencilsketch', aliases: ['penciltext'],    slug: 'pencilSketch',   label: 'Pencil Sketch Logo' },
    { pattern: 'textlogomaker',aliases: ['textlogo'],      slug: 'textLogoMaker',  label: 'Text Logo Maker' },
];

for (const s of doubleShortcuts) {
    bwmxmd({
        pattern: s.pattern, aliases: s.aliases,
        category: 'Effects', description: `Generate *${s.label}* — use | to separate two texts`,
        emoji: '🎨', use: '<text1> | <text2>'
    }, async (from, client, conText) => {
        const { mek, reply, q } = conText;
        const raw = (q || '').trim();
        if (!raw) return reply(`🎨 Usage: *!${s.pattern} text1 | text2*`);
        const parts = raw.split('|').map(t => t.trim()).filter(Boolean);
        if (parts.length < 2) parts.push(parts[0]);
        await sendEffect(from, client, mek, s.slug, EFFECTS[s.slug], parts, null);
    });
}

// -- Wings Logo (triple text) --
bwmxmd({
    pattern: 'wingslogo', aliases: ['wingsfx','wings3d'],
    category: 'Effects', description: 'Generate Wings Logo with 3 text parts (use | separator)',
    emoji: '🎨', use: '<text1> | <text2> | <text3>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw = (q || '').trim();
    if (!raw) return reply('🎨 Usage: *!wingslogo text1 | text2 | text3*');
    const parts = raw.split('|').map(t => t.trim()).filter(Boolean);
    while (parts.length < 3) parts.push(parts[parts.length - 1] || 'BWM');
    await sendEffect(from, client, mek, 'wingsLogo', EFFECTS.wingsLogo, parts, null);
});
