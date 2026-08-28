const { bwmxmd } = require("../adams/commandHandler");
const moment = require("moment-timezone");
const s = require(__dirname + "/../config");
const XMD = require("../adams/xmd");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { getSettings } = require("../adams/database/settings");
const readMore = String.fromCharCode(8206).repeat(4000);

const PREFIX = s.PREFIX || ".";
const BOT_NAME = s.BOT || 'BWM XMD';
const MEDIA_URLS = s.BOT_URL || [];
const fetchWithRetry = async (url, retries = 2) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.head(url, { timeout: 5000 });
            if (res.status === 200) return url;
        } catch (e) {
            if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
};

const MENU_STYLES = {
    1: {
        top: "*┌─❖*",
        botName: "*│",
        bottomLeft: "*└┬❖*",
        greeting: "   *│",
        divider: "   *└────────┈❖*",
        mid: "▬▬▬▬▬▬▬▬▬▬",
        user: "> 🕵️",
        date: "> 📅",
        time: "> ⏰",
        stats: "> ⭐",
        bottom: "▬▬▬▬▬▬▬▬▬▬"
    },
    2: {
        top: "╔═❖",
        botName: "║ *",
        bottomLeft: "╠═❖",
        greeting: "╟ *",
        divider: "╚═══════❖",
        mid: "",
        user: "║🕵️ ",
        date: "║📅 ",
        time: "║⏰ ",
        stats: "║⭐ ",
        bottom: "╚═════════════❖"
    },
    3: {
        top: "┏━━❖",
        botName: "┃ *",
        bottomLeft: "┣━━❖",
        greeting: "┃ *",
        divider: "┗━━━━━━━━❖",
        mid: "",
        user: "┃🕵️ ",
        date: "┃📅 ",
        time: "┃⏰ ",
        stats: "┃⭐ ",
        bottom: "┗━━━━━━━━━━━━❖"
    }
};
const WEB = XMD.WEB;
const GURL = XMD.CHANNEL_URL;
const getGlobalContextInfo = (name) => XMD.getContextInfo(name);
const getContactMsg = (contactName, sender) =>
    XMD.getContactMsg(contactName, sender);

const randomMedia = () => {
    if (!MEDIA_URLS || MEDIA_URLS.length === 0) return null;
    const url = MEDIA_URLS[Math.floor(Math.random() * MEDIA_URLS.length)];
    if (typeof url === "string") {
        const trimmed = url.trim();
        return trimmed.startsWith("http") ? trimmed : null;
    }
    return null;
};


const convertToOpus = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        exec(
            `ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k -vbr on -compression_level 10 -frame_duration 60 -application voip "${outputPath}"`,
            (error) => {
                if (error) reject(error);
                else resolve(outputPath);
            },
        );
    });
};

const fetchGitHubStats = async () => {
    try {
        const response = await axios.get(XMD.GITHUB_REPO_API, {
            headers: { "User-Agent": "BWM-XMD-BOT" },
            timeout: 5000,
        });
        const forks = response.data.forks_count || 0;
        const stars = response.data.stargazers_count || 0;
        return forks * 2 + stars * 2;
    } catch (error) {
        return Math.floor(Math.random() * 1000) + 500;
    }
};

const getIbrahimCommands = () => {
    const commands = require("../adams/commandHandler").commands;
    const ibrahimCmds = {};

    commands.forEach((cmd) => {
        if (cmd.filename && cmd.filename.includes("Ibrahim")) {
            const category = (cmd.category || "General").toLowerCase();
            if (!ibrahimCmds[category]) ibrahimCmds[category] = [];
            ibrahimCmds[category].push(cmd.pattern);
        }
    });

    return ibrahimCmds;
};

const categories = {
    "1. 🤖 AI MENU": ["ai", "gpt"],
    "2. 🎨 EPHOTO MENU": ["ephoto", "photofunia", "effects"],
    "3. 📥 DOWNLOAD MENU": ["downloader", "search"],
    "4. 👨‍👨‍👦‍👦 GROUP MENU": ["group"],
    "5. ⚙️ SETTINGS MENU": ["settings", "owner"],
    "6. 😂 FUN MENU": ["fun", "anime"],
    "7. 🌍 GENERAL MENU": ["general", "utility", "tools", "tempgen", "shortener"],
    "8. ⚽ SPORTS MENU": ["sports"],
    "9. 🔍 STALKER MENU": ["stalker", "stalk"],
    "10. 🖼️ STICKER MENU": ["sticker"],
    "11. 🔧 SYSTEM MENU": ["system"],
    "12. 📚 EDUCATION MENU": ["education"],
    "13. 🔗 SHORTENER MENU": ["shortener"],
};

bwmxmd(
    {
        pattern: "menu",
        category: "general",
        description: "Interactive category-based menu",
    },
    async (from, client, conText) => {
        const { mek, pushName, reply, sender, deviceMode, botPic } = conText;
        const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';

        try {
            const ibrahimCommands = getIbrahimCommands();

            let dbSettings = {};
            try { dbSettings = await getSettings(); } catch (e) {}
            const tz = dbSettings.timezone || s.TZ || "Africa/Nairobi";
            moment.tz.setDefault(tz);
            const date = moment().format("DD/MM/YYYY");
            const time = moment().format("HH:mm:ss");
            const contactName = pushName || "User";

            const styleNum = dbSettings.menuStyle || 1;
            const sym = MENU_STYLES[styleNum] || MENU_STYLES[1];

            let contactMessage;
            try {
                contactMessage = getContactMsg(contactName, sender?.split("@")[0] || "0");
            } catch (e) {
                contactMessage = mek;
            }

            let githubStats = 500;
            try {
                githubStats = await fetchGitHubStats();
            } catch (e) {
                console.log("GitHub stats fetch failed, using default");
            }

            const hour = moment().hour();
            let greeting = "🌙 Good Night 😴";
            if (hour >= 5 && hour < 12) greeting = "🌅 Good Morning 🤗";
            else if (hour >= 12 && hour < 18) greeting = "☀️ Good Afternoon 😊";
            else if (hour >= 18 && hour < 22) greeting = "🌆 Good Evening 🤠";

            const menuOptions = `
*📋 MENU OPTIONS*

*1.* 🌐 OUR WEB

*2.* 📢 UPDATES

*3.* 🤖 AI MENU

*4.* 🎨 EPHOTO MENU

*5.* 📥 DOWNLOAD MENU

*6.* 👨‍👨‍👦‍👦 GROUP MENU

*7.* ⚙️ SETTINGS MENU

*8.* 😂 FUN MENU

*9.* 🌍 GENERAL MENU

*10.* ⚽ SPORTS MENU

*11.* 🔍 STALKER MENU

*12.* 🖼️ STICKER MENU

_Reply with a number (1-12) to access that section_`;

            const midLine = sym.mid ? `\n${sym.mid}` : '';
            const menuHeader = `${sym.top}
${sym.botName}${BOT_NAME}*    
${sym.bottomLeft}
${sym.greeting}${greeting}*
${sym.divider}${midLine}
${sym.user}ᴜsᴇʀ ɴᴀᴍᴇ: ${contactName}
${sym.date}ᴅᴀᴛᴇ: ${date}
${sym.time}ᴛɪᴍᴇ: ${time}       
${sym.stats}ᴜsᴇʀs: ${githubStats}       
${sym.bottom}`;

            const fullMenuText = `${menuHeader}\n\n${readMore}\n${menuOptions}`;

            const botPicUrl = (botPic && typeof botPic === 'string' && botPic.startsWith('http')) ? botPic : null;
            const rawMedia = botPicUrl || randomMedia();
            const selectedMedia = rawMedia ? await fetchWithRetry(rawMedia) : null;
            let mainMenuMsg;

            if (deviceMode === 'iPhone') {
                if (selectedMedia) {
                    try {
                        if (selectedMedia.match(/\.(mp4|gif)$/i)) {
                            mainMenuMsg = await client.sendMessage(
                                from,
                                {
                                    video: { url: selectedMedia },
                                    gifPlayback: true,
                                    width: 800,
                                    height: 800,
                                    caption: fullMenuText,
                                },
                                { quoted: mek },
                            );
                        } else {
                            mainMenuMsg = await client.sendMessage(
                                from,
                                {
                                    image: { url: selectedMedia },
                                    caption: fullMenuText,
                                },
                                { quoted: mek },
                            );
                        }
                    } catch (mediaErr) {
                        console.error("iPhone menu media error:", mediaErr.message);
                        mainMenuMsg = await client.sendMessage(from, { text: fullMenuText }, { quoted: mek });
                    }
                } else {
                    mainMenuMsg = await client.sendMessage(from, { text: fullMenuText }, { quoted: mek });
                }
            } else if (selectedMedia) {
                try {
                    if (selectedMedia.match(/\.(mp4|gif)$/i)) {
                        mainMenuMsg = await client.sendMessage(
                            from,
                            {
                                video: { url: selectedMedia },
                                gifPlayback: true,
                                width: 800,
                                height: 800,
                                caption: fullMenuText,
                                contextInfo: getGlobalContextInfo(BOT_NAME),
                            },
                            { quoted: contactMessage },
                        );
                    } else {
                        mainMenuMsg = await client.sendMessage(
                            from,
                            {
                                image: { url: selectedMedia },
                                caption: fullMenuText,
                                contextInfo: getGlobalContextInfo(BOT_NAME),
                            },
                            { quoted: contactMessage },
                        );
                    }
                } catch (mediaErr) {
                    console.error("Menu media error:", mediaErr.message);
                    mainMenuMsg = await client.sendMessage(
                        from,
                        {
                            text: fullMenuText,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        },
                        { quoted: contactMessage },
                    );
                }
            } else {
                mainMenuMsg = await client.sendMessage(
                    from,
                    { text: fullMenuText, contextInfo: getGlobalContextInfo(BOT_NAME) },
                    { quoted: contactMessage },
                );
            }

            const cleanup = () => {
                client.ev.off("messages.upsert", handleReply);
            };

            // Track all menu-related message IDs (main menu + sub-menu responses)
            const menuMessageIds = new Set();
            menuMessageIds.add(mainMenuMsg.key.id);

            // Helper to send a message and track its ID so replies to it are recognized
            const sendAndTrack = async (destChat, content, options) => {
                const sent = await client.sendMessage(destChat, content, options);
                if (sent?.key?.id) menuMessageIds.add(sent.key.id);
                return sent;
            };

            const sendMainMenu = async (destChat) => {
                const selectedMedia = randomMedia();
                if (selectedMedia) {
                    try {
                        if (selectedMedia.match(/\.(mp4|gif)$/i)) {
                            await sendAndTrack(
                                destChat,
                                {
                                    video: { url: selectedMedia },
                                    gifPlayback: true,
                                    width: 800,
                                    height: 800,
                                    caption: fullMenuText,
                                    contextInfo: getGlobalContextInfo(BOT_NAME),
                                },
                                { quoted: contactMessage },
                            );
                        } else {
                            await sendAndTrack(
                                destChat,
                                {
                                    image: { url: selectedMedia },
                                    caption: fullMenuText,
                                    contextInfo: getGlobalContextInfo(BOT_NAME),
                                },
                                { quoted: contactMessage },
                            );
                        }
                    } catch (e) {
                        await sendAndTrack(
                            destChat,
                            {
                                text: fullMenuText,
                                contextInfo: getGlobalContextInfo(BOT_NAME),
                            },
                            { quoted: contactMessage },
                        );
                    }
                } else {
                    await sendAndTrack(
                        destChat,
                        {
                            text: fullMenuText,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        },
                        { quoted: contactMessage },
                    );
                }
            };

            const handleReply = async (update) => {
                const message = update.messages[0];
                if (!message?.message) return;

                const destChat = message.key.remoteJid;
                const fromResolved = conText.resolvedJid || from;
                if (destChat !== from && destChat !== fromResolved) return;

                const quotedStanzaId =
                    message.message.extendedTextMessage?.contextInfo?.stanzaId;

                const responseText =
                    message.message.extendedTextMessage?.text?.trim() ||
                    message.message.conversation?.trim();

                if (!responseText) return;

                const isNumber = /^\d+$/.test(responseText) && parseInt(responseText) >= 0 && parseInt(responseText) <= 13;

                if (quotedStanzaId) {
                    if (!menuMessageIds.has(quotedStanzaId)) return;
                } else if (isNumber && (conText.deviceMode === 'iPhone' || !destChat.endsWith('@g.us'))) {
                    // iPhone mode OR private DM: accept plain number messages (0-13) without quote
                } else {
                    return;
                }

                const selectedIndex = parseInt(responseText);
                if (isNaN(selectedIndex)) return;

                const menuReactions = {
                    0: '🔄', 1: '🌐', 2: '🎵', 3: '📢',
                    4: '🤖', 5: '🎨', 6: '📥', 7: '👨‍👨‍👦‍👦',
                    8: '⚙️', 9: '😂', 10: '🌍', 11: '⚽',
                    12: '🔍', 13: '🖼️'
                };

                try {
                    const reactEmoji = menuReactions[selectedIndex] || '📋';
                    await client.sendMessage(destChat, { react: { text: reactEmoji, key: message.key } });
                } catch (e) {}

                try {
                    if (selectedIndex === 0) {
                        await sendMainMenu(destChat);
                        return;
                    }

                    switch (selectedIndex) {
                        case 1:
                            await sendAndTrack(
                                destChat,
                                {
                                    text: `🌐 *${BOT_NAME} WEB APP*\n\nVisit our official website here:\n${WEB}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                                    contextInfo: getGlobalContextInfo(BOT_NAME),
                                },
                                { quoted: contactMessage },
                            );
                            break;

                        case 2:
                            await sendAndTrack(
                                destChat,
                                {
                                    text: `📢 *${BOT_NAME} UPDATES CHANNEL*\n\nJoin our official updates channel:\n${GURL}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                                    contextInfo: getGlobalContextInfo(BOT_NAME),
                                },
                                { quoted: contactMessage },
                            );
                            break;

                        case 3:
                        case 4:
                        case 5:
                        case 6:
                        case 7:
                        case 8:
                        case 9:
                        case 10:
                        case 11:
                        case 12:
                            const catIndex = selectedIndex - 3;
                            const categoryNames = Object.keys(categories);
                            const categoryName = categoryNames[catIndex];

                            if (categoryName) {
                                const catKeys = categories[categoryName] || [];
                                let cmds = [];
                                catKeys.forEach((key) => {
                                    if (ibrahimCommands[key]) {
                                        cmds = cmds.concat(
                                            ibrahimCommands[key].map(
                                                (c) => `• ${PREFIX}${c}`,
                                            ),
                                        );
                                    }
                                });

                                if (cmds.length > 0) {
                                    await sendAndTrack(
                                        destChat,
                                        {
                                            text: `📋 *${categoryName}*\n\n${cmds.join("\n")}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                                            contextInfo: getGlobalContextInfo(BOT_NAME),
                                        },
                                        { quoted: contactMessage },
                                    );
                                } else {
                                    await sendAndTrack(
                                        destChat,
                                        {
                                            text: `📋 *${categoryName}*\n\nNo commands available in this category\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                                            contextInfo: getGlobalContextInfo(BOT_NAME),
                                        },
                                        { quoted: contactMessage },
                                    );
                                }
                            }
                            break;

                        default:
                            await sendAndTrack(
                                destChat,
                                {
                                    text: `*❌ Invalid number. Please select between 1-13.*\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                                    contextInfo: getGlobalContextInfo(BOT_NAME),
                                },
                                { quoted: contactMessage },
                            );
                            break;
                    }
                } catch (error) {
                    console.error("Menu reply error:", error);
                }
            };

            client.ev.on("messages.upsert", handleReply);
            setTimeout(cleanup, 300000);
        } catch (err) {
            console.error("Menu error:", err);
            // Send a simple text menu as fallback
            try {
                const simpleMenu = `*📋 ${BOT_NAME} MENU*

*1.* 🌐 OUR WEB
*2.* 📢 UPDATES
*3.* 🤖 AI MENU
*4.* 🎨 EPHOTO MENU
*5.* 📥 DOWNLOAD MENU
*6.* 👨‍👨‍👦‍👦 GROUP MENU
*7.* ⚙️ SETTINGS MENU
*8.* 😂 FUN MENU
*9.* 🌍 GENERAL MENU
*10.* ⚽ SPORTS MENU
*11.* 🔍 STALKER MENU
*12.* 🖼️ STICKER MENU

_Reply with a number (1-12)_`;
                await client.sendMessage(from, { text: simpleMenu }, { quoted: mek });
            } catch (fallbackErr) {
                reply("Menu is temporarily unavailable. Try .help instead.");
            }
        }
    },
);
