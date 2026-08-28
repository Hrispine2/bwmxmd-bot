const axios = require('axios');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

const VALID_EMAIL_MODES   = ['random', 'domain', 'dotgmail', 'plusgmail', 'googlemail'];
const VALID_SMS_COUNTRIES = ['random', 'uk', 'sweden', 'finland', 'netherlands', 'denmark', 'belgium', 'slovenia'];

async function tempGet(urlFn, ...args) {
    const res = await axios.get(urlFn(...args), { timeout: 20000 });
    const d = res.data;
    if (d?.success === false) throw new Error(d?.message || 'API returned failure');
    return d?.result ?? d?.results ?? d?.data ?? d;
}

async function tempErr(client, from, mek, label, e) {
    console.error(`[BWM TempGen] ${label}:`, e.message);
    await client.sendMessage(from, { react: { text: '❌', key: mek.key } });
    await client.sendMessage(from, {
        text: `❌ Could not complete *${label}*. ${e.message?.slice(0, 80) || 'Try again.'}`
    }, { quoted: mek });
}

// ─── GENERATE TEMP EMAIL (v2) ─────────────────────────────────────────────────

bwmxmd({
    pattern: 'tempmail', aliases: ['genmail', 'tempemail', 'fakemail', 'tmpmail'],
    category: 'TempGen', description: 'Generate a disposable temp email address. Expires in 10 minutes.',
    emoji: '📧', use: '[mode: random|domain|dotgmail|plusgmail|googlemail]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw  = (q || '').trim().toLowerCase();
    const mode = VALID_EMAIL_MODES.includes(raw) ? raw : 'random';

    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await tempGet(XMD.GIFTED.TEMPGEN.EMAIL_GEN, mode);

        const email = d?.email || d;
        const cap =
            `📧 *Temporary Email Generated*\n\n` +
            `📬 *Email:* \`${email}\`\n` +
            `🎭 *Mode:* ${d?.mode || mode}\n` +
            `⏰ *Expires:* ${d?.expiresIn || '10 minutes'}\n\n` +
            `📋 *Available Modes:*\n` +
            VALID_EMAIL_MODES.map(m => `  • \`${m}\``).join('\n') +
            `\n\n💡 *Check inbox:* \`!mailinbox ${email}\`\n` +
            `⚠️ _This address auto-expires. Do not use for important accounts._`;

        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await tempErr(client, from, mek, 'Temp Email Generate', e); }
});

// ─── CHECK EMAIL INBOX (v2) ───────────────────────────────────────────────────

bwmxmd({
    pattern: 'mailinbox', aliases: ['emailinbox', 'checkinbox', 'readmail', 'inbox'],
    category: 'TempGen', description: 'Check the inbox of a generated temp email address',
    emoji: '📥', use: '<email>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const email = (q || '').trim();
    if (!email) return reply('📥 Please provide your temp email address.\nExample: *!mailinbox you@gmail.com*');
    if (!email.includes('@')) return reply('❌ That doesn\'t look like a valid email address.');

    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const messages = await tempGet(XMD.GIFTED.TEMPGEN.EMAIL_INBOX, email);
        const list = Array.isArray(messages) ? messages : (messages ? [messages] : []);

        if (!list.length) {
            await client.sendMessage(from, {
                text: `📥 *Inbox for* \`${email}\`\n\n📭 No messages yet. Messages usually arrive within seconds.\n\n💡 _Try again in a moment._`
            }, { quoted: mek });
        } else {
            const cap =
                `📥 *Inbox for* \`${email}\`\n` +
                `📨 *${list.length} message${list.length > 1 ? 's' : ''}*\n\n` +
                list.slice(0, 8).map((msg, i) => {
                    const sender  = msg.from || msg.sender || msg.From || 'Unknown';
                    const subject = msg.subject || msg.Subject || 'No subject';
                    const body    = (msg.body || msg.text || msg.content || msg.message || '').slice(0, 300);
                    const time    = msg.date || msg.time || msg.receivedAt || '';
                    return `*${i + 1}.* 📨 From: *${sender}*\n` +
                        `   📌 Subject: _${subject}_\n` +
                        (time ? `   🕒 ${time}\n` : '') +
                        (body ? `   📄 ${body}` : '');
                }).join('\n\n') +
                (list.length > 8 ? `\n\n_...and ${list.length - 8} more messages_` : '');

            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await tempErr(client, from, mek, 'Mail Inbox', e); }
});

// ─── GENERATE TEMP PHONE NUMBER ───────────────────────────────────────────────

bwmxmd({
    pattern: 'tempnum', aliases: ['gennumber', 'tempsms', 'fakenumber', 'tmpnum'],
    category: 'TempGen', description: 'Generate a disposable temp phone number for SMS. Expires in 10 minutes.',
    emoji: '📱', use: '[country: random|uk|sweden|finland|netherlands|denmark|belgium|slovenia]'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const raw     = (q || '').trim().toLowerCase();
    const country = VALID_SMS_COUNTRIES.includes(raw) ? raw : 'random';

    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const d = await tempGet(XMD.GIFTED.TEMPGEN.SMS_GEN, country);

        const number = d?.number || d;
        const cap =
            `📱 *Temporary Phone Number Generated*\n\n` +
            `📞 *Number:* \`${number}\`\n` +
            `🌍 *Country:* ${(d?.country || country).toUpperCase()}\n` +
            `⏰ *Expires:* ${d?.expiresIn || '10 minutes'}\n\n` +
            `📋 *Available Countries:*\n` +
            VALID_SMS_COUNTRIES.map(c => `  • \`${c}\``).join('\n') +
            `\n\n💡 *Check SMS:* \`!smsinbox ${number}\`\n` +
            `⚠️ _Numbers are shared — do not use for sensitive accounts._`;

        await client.sendMessage(from, { text: cap }, { quoted: mek });
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await tempErr(client, from, mek, 'Temp Number Generate', e); }
});

// ─── CHECK SMS INBOX ──────────────────────────────────────────────────────────

bwmxmd({
    pattern: 'smsinbox', aliases: ['checksms', 'readsms', 'smscheck', 'smsinbox'],
    category: 'TempGen', description: 'Check received SMS messages for a generated temp number',
    emoji: '💬', use: '<+number>'
}, async (from, client, conText) => {
    const { mek, reply, q } = conText;
    const number = (q || '').trim();
    if (!number) return reply('💬 Please provide your temp phone number.\nExample: *!smsinbox +46726406882*');
    if (!/^\+?\d{7,15}$/.test(number.replace(/\s/g, ''))) return reply('❌ Invalid phone number format. Include the country code, e.g. *+447893927257*');

    try {
        await client.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        const messages = await tempGet(XMD.GIFTED.TEMPGEN.SMS_INBOX, number);
        const list = Array.isArray(messages) ? messages : (messages ? [messages] : []);

        if (!list.length) {
            await client.sendMessage(from, {
                text: `💬 *SMS Inbox for* \`${number}\`\n\n📭 No SMS received yet.\n\n💡 _Send an SMS to this number and check again._`
            }, { quoted: mek });
        } else {
            const cap =
                `💬 *SMS Inbox for* \`${number}\`\n` +
                `📨 *${list.length} message${list.length > 1 ? 's' : ''}*\n\n` +
                list.slice(0, 10).map((msg, i) => {
                    const sender  = msg.from || msg.sender || msg.From || 'Unknown';
                    const body    = (msg.message || msg.body || msg.text || msg.content || '').slice(0, 300);
                    const time    = msg.time || msg.date || msg.receivedAt || '';
                    const mid     = msg.messageID || msg.id || '';
                    return `*${i + 1}.* 📲 From: *${sender}*\n` +
                        (time ? `   🕒 ${time}\n` : '') +
                        (mid  ? `   🆔 ID: ${mid}\n` : '') +
                        (body ? `   💬 ${body}` : '');
                }).join('\n\n') +
                (list.length > 10 ? `\n\n_...and ${list.length - 10} more messages_` : '');

            await client.sendMessage(from, { text: cap }, { quoted: mek });
        }
        await client.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) { await tempErr(client, from, mek, 'SMS Inbox', e); }
});
