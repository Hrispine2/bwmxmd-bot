const { bwmxmd } = require('../adams/commandHandler');
const fs = require('fs');
const path = require('path');

const jidsPath = path.join(__dirname, '..', 'adams', 'jids.json');
let statusJidList = [];
try {
  const allJids = JSON.parse(fs.readFileSync(jidsPath, 'utf-8'));
  statusJidList = allJids.filter(jid => typeof jid === 'string' && jid.endsWith('@s.whatsapp.net'));
} catch (err) {
  console.error('Error reading jids.json:', err);
}

bwmxmd({
  pattern: 'post',
  aliases: ['reshare', 'story', 'tostatus', 'poststatus', 'sendstatus', 'mystatus', 'pstatus'],
  description: 'Post text or media to your status. Tags group when used in a group chat.',
  category: 'Owner',
  filename: __filename
}, async (from, client, conText) => {
  const { q, quoted, quotedMsg, reply, isSuperUser, isGroup } = conText;

  if (!isSuperUser) return reply('❌ Owner Only Command!');

  if (!q && !quotedMsg) {
    return reply(
      '📌 *Usage:*\n' +
      '• !post <text>\n' +
      '• Reply to image/video/audio with !post <optional caption>'
    );
  }

  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  let filePath = null;

  try {
    // Group: post to group members only, group gets tagged
    // DM: post to status@broadcast with saved contacts list
    const postContent = async (content) => {
      if (isGroup) {
        await client.xmdStatus.sendStatusToGroups(content, [from]);
      } else {
        const opts = { backgroundColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') };
        if (statusJidList.length > 0) opts.statusJidList = statusJidList;
        await client.sendMessage('status@broadcast', content, opts);
      }
    };

    const sendMediaStatus = async (media, type) => {
      filePath = await client.downloadAndSaveMediaMessage(media, path.join(tmpDir, `post-${Date.now()}`));
      const caption = q || media.caption || '';
      const content = {
        [type]: { url: filePath },
        mimetype: media.mimetype,
        ...(caption && { caption }),
        ...(type === 'audio' && { ptt: false }),
        ...(type === 'video' && media.seconds && { seconds: media.seconds })
      };
      await postContent(content);
      fs.unlinkSync(filePath);
      filePath = null;
      return reply(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} posted to your status.`);
    };

    if (quotedMsg) {
      if (quoted?.imageMessage) return await sendMediaStatus(quoted.imageMessage, 'image');
      if (quoted?.videoMessage) {
        if (quoted.videoMessage.seconds > 30) return reply('⚠️ Video must be 30 seconds or shorter.');
        return await sendMediaStatus(quoted.videoMessage, 'video');
      }
      if (quoted?.audioMessage) return await sendMediaStatus(quoted.audioMessage, 'audio');
      if (quoted?.stickerMessage) return await sendMediaStatus(quoted.stickerMessage, 'sticker');
      const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text;
      if (quotedText) {
        await postContent({ text: quotedText });
        return reply('✅ Text posted to your status.');
      }
      return reply('❌ Unsupported media type.');
    }

    await postContent({ text: q });
    return reply('✅ Text posted to your status.');

  } catch (err) {
    console.error('post status error:', err);
    if (filePath && fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) {} }
    return reply('❌ Failed to post status: ' + err.message);
  }
});

bwmxmd({
  pattern: 'jidcount',
  aliases: ['totaljids', 'jidsize'],
  description: 'Show total number of saved contacts for status',
  category: 'Owner',
  filename: __filename
}, async (from, client, conText) => {
  const { reply, isSuperUser } = conText;
  if (!isSuperUser) return reply('❌ Owner Only Command!');
  return reply(`📌 Total saved contacts: *${statusJidList.length}*`);
});
