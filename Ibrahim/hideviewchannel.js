const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');
const { updateSettings: updateSettingsDB } = require('../adams/database/settings');

bwmxmd({
  pattern: "hideviewchannel",
  aliases: ["hidechannel", "forwarded", "hideforward"],
  description: "Toggle hiding of view channel and forwarded labels in messages",
  category: "Settings",
  filename: __filename
}, async (from, client, conText) => {
  const { reply, q, isSuperUser, prefix, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const current = botSettings?.hideViewChannel || 'off';
  const args = q?.trim().toLowerCase();

  if (!args) {
    return reply(
      `*Hide View Channel & Forwarded*\n\n` +
      `Current: ${current === 'on' ? '✅ ON' : '❌ OFF'}\n\n` +
      `*What it hides:*\n` +
      `• View channel button on messages\n` +
      `• Forwarded label on messages\n\n` +
      `*Usage:*\n` +
      `▸ ${prefix}hideviewchannel on\n` +
      `▸ ${prefix}hideviewchannel off`
    );
  }

  if (args === 'on') {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ hideViewChannel: 'on' });
    } else {
      await updateSettings({ hideViewChannel: 'on' });
      await updateSettingsDB({ hideViewChannel: 'on' }, 'main');
    }
    if (conText.botSettings) conText.botSettings.hideViewChannel = 'on';
    XMD.setHideViewChannel('on');
    return reply(
      `✅ *Hide View Channel: ON*\n\n` +
      `Bot will now hide:\n` +
      `• View channel button\n` +
      `• Forwarded label`
    );
  } else if (args === 'off') {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ hideViewChannel: 'off' });
    } else {
      await updateSettings({ hideViewChannel: 'off' });
      await updateSettingsDB({ hideViewChannel: 'off' }, 'main');
    }
    if (conText.botSettings) conText.botSettings.hideViewChannel = 'off';
    XMD.setHideViewChannel('off');
    return reply(
      `❌ *Hide View Channel: OFF*\n\n` +
      `View channel and forwarded labels will show normally.`
    );
  } else {
    return reply(`❌ Invalid option.\n\nUse:\n▸ ${prefix}hideviewchannel on\n▸ ${prefix}hideviewchannel off`);
  }
});
