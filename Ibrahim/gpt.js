
const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');
const XMD = require('../adams/xmd');
const { 
    saveConversation, 
    getConversationHistory, 
    clearConversationHistory,
    getLastConversation 
} = require('../adams/database/gpt');
//========================================================================================================================
//========================================================================================================================

bwmxmd({
  pattern: "gpt",
  aliases: ['ai', 'ask'],
  //react: "🤖",
  category: "gpt",
  description: "Chat with GPT AI",
}, async (from, client, conText) => {
  const { mek, reply, react, arg, sender, pushName } = conText;

  if (!arg || arg.length === 0) {
    await react("❓");
    return reply(`🤖 *BWM-XMD GPT AI*\n\nAsk me anything!\n\nExample: gpt What is JavaScript?`);
  }

  try {
    await react("⏳");
    
    const question = arg.join(' ');
    
    // Get last conversation for context
    const lastConv = await getLastConversation(sender);
    let context = '';
    
    if (lastConv) {
      context = `Previous conversation:\nYou: ${lastConv.user}\nAI: ${lastConv.ai}\n\nCurrent question: ${question}`;
    }

    const systemPrompt = `[System: You are BWM XMD, a WhatsApp AI assistant made by Ibrahim Adams. You are NOT Keith AI and NOT made by Keithkeizzah. Only mention your name or creator if the user asks who you are or who made you. Otherwise just reply naturally without introducing yourself.]\n`;
    const fullQuery = systemPrompt + (context || question);

    let aiResponse = null;

    // Primary: Gifted AI (confirmed working ~2.3s)
    try {
      const giftedRes = await axios.get(XMD.GIFTED.AI.GIFTED(fullQuery), { timeout: 15000 });
      if (giftedRes.data?.success && giftedRes.data?.result) {
        aiResponse = giftedRes.data.result;
      }
    } catch (e) {
      console.error('GPT cmd: Gifted AI failed, trying GPT-4o...', e.message);
    }

    // Secondary: GPT-4o via Gifted (~2.9s)
    if (!aiResponse) {
      try {
        const gpt4oRes = await axios.get(XMD.GIFTED.AI.GPT4O(fullQuery), { timeout: 15000 });
        if (gpt4oRes.data?.success && gpt4oRes.data?.result) {
          aiResponse = gpt4oRes.data.result;
        }
      } catch (e) {
        console.error('GPT cmd: GPT-4o failed, trying Pollinations...', e.message);
      }
    }

    // Tertiary: Pollinations via Gifted (~2.5s)
    if (!aiResponse) {
      try {
        const polRes = await axios.get(XMD.GIFTED.AI.POLLINATIONS(fullQuery), { timeout: 15000 });
        if (polRes.data?.success && polRes.data?.result) {
          aiResponse = polRes.data.result;
        }
      } catch (e) {
        console.error('GPT cmd: Pollinations failed, trying BK9 Gemini...', e.message);
      }
    }

    // Fallback 1: BK9 Gemini
    if (!aiResponse) {
      try {
        const geminiRes = await axios.get(`https://api.bk9.dev/ai/gemini?q=${encodeURIComponent(fullQuery)}`, { timeout: 15000 });
        if (geminiRes.data?.status && geminiRes.data?.BK9) {
          aiResponse = geminiRes.data.BK9;
        }
      } catch (e) {
        console.error('GPT cmd: BK9 Gemini failed, trying Llama...', e.message);
      }
    }

    // Fallback 2: BK9 Llama
    if (!aiResponse) {
      try {
        const llamaRes = await axios.get(`https://api.bk9.dev/ai/llama?q=${encodeURIComponent(fullQuery)}`, { timeout: 15000 });
        if (llamaRes.data?.status && llamaRes.data?.BK9) {
          aiResponse = llamaRes.data.BK9;
        }
      } catch (e) {
        console.error('GPT cmd: Llama failed, trying Keith fallback...', e.message);
      }
    }

    // Fallback 3: Keith API
    if (!aiResponse) {
      try {
        const keithRes = await axios.get(XMD.API.AI.GPT(context || question), { timeout: 15000 });
        if (keithRes.data?.status && keithRes.data?.result) {
          aiResponse = keithRes.data.result;
        }
      } catch (e) {
        console.error('GPT cmd: Keith API also failed:', e.message);
      }
    }

    if (aiResponse) {
      await saveConversation(sender, question, aiResponse);
      await react("✅");
      await reply(`${aiResponse}`);
    } else {
      await react("❌");
      await reply("❌ Sorry, I couldn't process your request at the moment.");
    }

  } catch (error) {
    console.error("gpt error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "gpthistory",
  aliases: ['aihistory', 'chathistory'],
  //react: "📚",
  category: "gpt",
  description: "View GPT conversation history",
}, async (from, client, conText) => {
  const { reply, react, sender, pushName } = conText;

  try {
    await react("📚");
    
    const history = await getConversationHistory(sender, 5); // Last 5 conversations
    
    if (!history.length) {
      return reply(`📚 *Chat History*\n\nNo previous conversations found. Start chatting with *gpt <question>*`);
    }

    let historyMsg = `📚 *Chat History for ${pushName}*\n\n`;
    
    history.forEach((conv, index) => {
      const shortUser = conv.user.length > 30 ? conv.user.substring(0, 30) + '...' : conv.user;
      const shortAI = conv.ai.length > 30 ? conv.ai.substring(0, 30) + '...' : conv.ai;
      
      historyMsg += `*${index + 1}. You:* ${shortUser}\n   *AI:* ${shortAI}\n\n`;
    });

    historyMsg += `_Total conversations: ${history.length}_`;
    
    await reply(historyMsg);

  } catch (error) {
    console.error("gpt history error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "lastchat",
  aliases: ['last conversation', 'previous chat'],
  react: "🕒",
  category: "gpt",
  description: "Get last GPT conversation",
}, async (from, client, conText) => {
  const { reply, react, sender, pushName } = conText;

  try {
  //  await react("🕒");
    
    const lastConv = await getLastConversation(sender);
    
    if (!lastConv) {
      return reply(`🕒 *Last Conversation*\n\nNo previous conversation found. Start chatting with *gpt <question>*`);
    }

    const lastChatMsg = `🕒 *Last Conversation*\n\n💬 *You:* ${lastConv.user}\n\n🤖 *AI:* ${lastConv.ai}`;
    
    await reply(lastChatMsg);

  } catch (error) {
    console.error("lastchat error:", error);
  //  await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "clearai",
  aliases: ['cleargpt', 'clearchat', 'deletehistory'],
  //react: "🗑️",
  category: "gpt",
  description: "Clear GPT conversation history",
}, async (from, client, conText) => {
  const { reply, react, sender, pushName } = conText;

  try {
    await react("🗑️");
    
    const cleared = await clearConversationHistory(sender);
    
    if (cleared) {
      await reply(`🗑️ *Chat History Cleared*\n\nAll your conversation history with GPT has been deleted successfully.`);
    } else {
      await reply(`ℹ️ *No History Found*\n\nYou don't have any conversation history to clear.`);
    }

  } catch (error) {
    console.error("clearai error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});

//========================================================================================================================
