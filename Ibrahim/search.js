const axios = require('axios');
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { bwmxmd } = require('../adams/commandHandler');
const XMD = require('../adams/xmd');

const getContactMsg = (contactName, sender) => XMD.getContactMsg(contactName, sender);
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================

bwmxmd({
  pattern: "news",
  aliases: ["headlines", "latestnews"],
  description: "Get the latest news headlines for any topic",
  category: "search",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek } = conText;

  if (!q) return reply("📰 Type a topic to get the latest news.\n\nExample: .news Kenya");

  try {
    const res = await axios.get(XMD.API.SEARCH.GOOGLE(q + " latest news"));
    const data = res.data;

    if (!data.status || !Array.isArray(data.result?.items) || data.result.items.length === 0) {
      return reply("❌ No recent news found.");
    }

    const results = data.result.items.slice(0, 10);
    const list = results.map((r, i) =>
      `🗞️ *${i + 1}. ${r.title}*\n${r.snippet || "No summary"}\n🌐 ${r.link}`
    ).join("\n\n");

    const caption = `📰 *Latest News: ${q}*\n\n${list}`;
    await client.sendMessage(from, { text: caption }, { quoted: mek });
  } catch (err) {
    console.error("news error:", err);
    reply("❌ Error fetching news: " + err.message);
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "google",
  aliases: ["googlesearch", "searchgoogle"],
  description: "Search Google results and preview links",
  category: "search",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek } = conText;

  if (!q) return reply("🔍 Type a keyword to search Google.\n\nExample: google cat");

  try {
    const res = await axios.get(XMD.API.SEARCH.GOOGLE(q));
    const data = res.data;

    if (!data.status || !Array.isArray(data.result?.items) || data.result.items.length === 0) {
      return reply("❌ No results found.");
    }

    const { formattedTotalResults, formattedSearchTime } = data.result.searchInformation;
    const results = data.result.items.slice(0, 10);

    const list = results.map((r, i) =>
      `🔹 *${i + 1}. ${r.title}*\n${r.snippet || "No description"}\n🌐 ${r.link}`
    ).join("\n\n");

    const caption = `🔎 *Google Search: ${q}*\n📄 Results: ${formattedTotalResults}\n⏱️ Time: ${formattedSearchTime} seconds\n\n${list}`;

    await client.sendMessage(from, { text: caption }, { quoted: mek });
  } catch (err) {
    console.error("google error:", err);
    reply("❌ Error fetching Google results: " + err.message);
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "brave",
  aliases: ["bravesearch", "searchbrave"],
  description: "Search Brave results and preview links",
  category: "search",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek } = conText;

  if (!q) return reply("🔍 Type a keyword to search Brave.\n\nExample: brave Kenya");

  try {
    const res = await axios.get(XMD.SEARCH_EXT.BRAVE(q));
    const data = res.data;

    if (!data.status || !Array.isArray(data.result?.results) || data.result.results.length === 0) {
      return reply("❌ No results found.");
    }

    const { totalResults, searchQuery, timestamp } = data.result.metadata;
    const results = data.result.results.slice(0, 10);

    const list = results.map((r, i) =>
      `🔹 *${i + 1}. ${r.title}*\n${r.description || "No description"}\n🌐 ${r.url || r.siteName}`
    ).join("\n\n");

    const caption = `🦁 *Brave Search: ${searchQuery}*\n📄 Results: ${totalResults}\n🕒 ${new Date(timestamp).toLocaleString()}\n\n${list}`;

    await client.sendMessage(from, { text: caption }, { quoted: mek });
  } catch (err) {
    console.error("brave error:", err);
    reply("❌ Error fetching Brave results: " + err.message);
  }
});

//========================================================================================================================


bwmxmd({
  pattern: "wagroup",
  aliases: ["groupsearch", "whatsappgroup"],
  description: "Search and join WhatsApp groups by category",
  category: "search",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek } = conText;

  if (!q) return reply("🔍 Type a keyword to search WhatsApp groups.\n\nExample: wagroup football");

  try {
    const res = await axios.get(XMD.SEARCH_EXT.WAGROUP(q));
    const data = res.data;

    if (!data.success || !Array.isArray(data.results) || data.results.length === 0) {
      return reply("❌ No group categories found.");
    }

    const list = data.results.map((g, i) => `${i + 1}. ${g.title}`).join("\n");
    const caption = `📱 *Group Categories for:* _${q}_\n\n${list}\n\n📌 Reply with a number to view group links.`;

    const sent = await client.sendMessage(from, { text: caption }, { quoted: mek });
    const messageId = sent.key.id;

    client.ev.on("messages.upsert", async (update) => {
      const msg = update.messages[0];
      if (!msg.message) return;

      const responseText = msg.message.conversation || msg.message.extendedTextMessage?.text;
      const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;
      const chatId = msg.key.remoteJid;

      const fromResolved = (typeof conText !== 'undefined' ? conText.resolvedJid : null) || from;
      if (chatId !== from && chatId !== fromResolved) return;
      if (!isReply && chatId.endsWith('@g.us')) return;

      const index = parseInt(responseText.trim()) - 1;
      const selected = data.results[index];

      if (!selected) {
        return client.sendMessage(chatId, {
          text: "❌ Invalid number. Reply with a valid group category number.",
          quoted: msg
        });
      }

      await client.sendMessage(chatId, { react: { text: "📥", key: msg.key } });

      try {
        const linkRes = await axios.get(XMD.FETCH.WAGROUPLINK(selected.url));
        const linkData = linkRes.data;

        if (!linkData.success || !linkData.result) {
          return client.sendMessage(chatId, {
            text: `❌ Couldn't fetch group links for ${selected.title}.`,
            quoted: msg
          });
        }

        const lines = linkData.result.split("\n").slice(0, 10); // max 10 links
        for (const line of lines) {
          const match = line.match(/Link - (https:\/\/chat\.whatsapp\.com\/invite\/\S+)/);
          if (!match) continue;

          await client.sendMessage(chatId, {
            text: match[1],
            quoted: msg
          });
        }
      } catch (err) {
        console.error("wagroup fetch error:", err);
        await client.sendMessage(chatId, {
          text: "❌ Error fetching group links: " + err.message,
          quoted: msg
        });
      }
    });
  } catch (err) {
    console.error("wagroup search error:", err);
    reply("❌ Error searching group categories: " + err.message);
  }
});
//========================================================================================================================


bwmxmd({
  pattern: "lyrics",
  aliases: ["lyric", "song"],
  description: "Search for song lyrics by title or phrase",
  category: "Search",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek } = conText;

  if (!q) return reply("🎵 Type a song title or lyric linen\nExample: lyrics what shall I render to Jehovah");

  try {
    const res = await axios.get(XMD.SEARCH_EXT.LYRICS2(q));
    const data = res.data;

    if (!data.status || !data.result) {
      return reply("❌ No lyrics found.");
    }

    const caption = `🎶 ${data.result}`;

    await client.sendMessage(from, { text: caption }, { quoted: mek });
  } catch (err) {
    console.error("lyrics error:", err);
    reply("❌ Error fetching lyrics: " + err.message);
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "yts",
  aliases: ["ytsearch", "ytfind"],
  category: "Search",
  description: "Search YouTube videos"
},
async (from, client, conText) => {
  const { q, mek, deviceMode } = conText;
  if (!q) return;

  try {
    const apiUrl = XMD.SEARCH_EXT.YTS_QUERY(q);
    const res = await axios.get(apiUrl, { timeout: 100000 });
    const results = res.data?.result;

    if (!Array.isArray(results) || results.length === 0) return;

    const videos = results.slice(0, 8);
    
    if (deviceMode === 'iPhone') {
      let textList = `🔍 *YouTube Results for:* ${q}\n\n`;
      videos.forEach((vid, i) => {
        textList += `*${i + 1}.* ${vid.title}\n📺 ${vid.duration} | 👁️ ${vid.views}\n🔗 ${vid.url}\n\n`;
      });
      await client.sendMessage(from, { text: textList });
      return;
    }
    
    let textList = `🔍 *YouTube Results for:* *${q}*\n\n`;
    videos.forEach((vid, i) => {
      textList += `*${i + 1}.* 🎬 ${vid.title}\n`;
      textList += `   ⏱️ ${vid.duration}  👁️ ${vid.views}`;
      if (vid.published) textList += `  📅 ${vid.published}`;
      textList += `\n   🔗 ${vid.url}\n\n`;
    });
    textList += `_Powered by BWM XMD_`;

    const firstThumb = videos[0]?.thumbnail;
    if (firstThumb) {
      await client.sendMessage(from, {
        image: { url: firstThumb },
        caption: textList,
        contextInfo: XMD.getContextInfo()
      }, { quoted: mek });
    } else {
      await client.sendMessage(from, { text: textList, contextInfo: XMD.getContextInfo() }, { quoted: mek });
    }

  } catch (err) {
    console.error("YTS command error:", err);
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "image",
  aliases: ["img"],
  category: "Search",
  description: "Search and download images"
},
async (from, client, conText) => {
  const { q, mek, deviceMode } = conText;
  if (!q) return;

  try {
    const apiUrl = XMD.SEARCH_EXT.IMAGES(q);
    const res = await axios.get(apiUrl, { timeout: 100000 });
    const results = res.data?.result;

    if (!Array.isArray(results) || results.length === 0) return;

    const images = results.slice(0, 8);
    const picked = [];

    for (const img of images) {
      try {
        const bufferRes = await axios.get(img.url, { responseType: "arraybuffer" });
        picked.push({ buffer: bufferRes.data, directLink: img.url });
      } catch {
        console.error("Image download failed:", img.url);
      }
    }

    if (picked.length === 0) return;

    if (deviceMode === 'iPhone') {
      for (let i = 0; i < Math.min(picked.length, 5); i++) {
        await client.sendMessage(from, {
          image: picked[i].buffer,
          caption: `📸 *Image ${i + 1}/${picked.length}*\n🔗 ${picked[i].directLink}`
        });
      }
      return;
    }

    for (let i = 0; i < Math.min(picked.length, 6); i++) {
      await client.sendMessage(from, {
        image: picked[i].buffer,
        caption: `📸 *Image ${i + 1}/${picked.length}* — 🔍 ${q}\n🔗 ${picked[i].directLink}`,
        contextInfo: XMD.getContextInfo()
      }, i === 0 ? { quoted: mek } : {});
    }

  } catch (err) {
    console.error("Image command error:", err);
  }
});
//========================================================================================================================
