const { bwmxmd } = require("../adams/commandHandler");
const moment = require("moment-timezone");
const s = require(__dirname + "/../config");
const XMD = require("../adams/xmd");

const PREFIX = s.PREFIX || ".";
const getGlobalContextInfo = (name) => XMD.getContextInfo(name);

const categoryEmojis = {
    "ai": "🤖",
    "gpt": "🤖",
    "ephoto": "🎨",
    "photofunia": "🎨",
    "effects": "🎨",
    "downloader": "📥",
    "search": "🔍",
    "group": "👨‍👨‍👦‍👦",
    "settings": "⚙️",
    "owner": "👑",
    "fun": "😂",
    "anime": "🎌",
    "general": "🌍",
    "utility": "🔧",
    "tools": "🔧",
    "sports": "⚽",
    "stalker": "🕵️",
    "stalk": "🕵️",
    "sticker": "🖼️",
    "system": "💻",
    "education": "📚",
    "shortener": "🔗",
    "tempgen": "📱",
    "movie": "🎬",
    "anonymous": "👤",
    "payment": "💳",
    "uploader": "📤",
    "repo": "📦",
    "update": "🔄",
    "report": "📝",
    "text-tools": "✏️",
    "url-fetch": "🌐",
    "video-effects": "🎥",
    "audio-tools": "🎵",
};

const categoryMerge = {
    "ai": "AI",
    "gpt": "AI",
    "ephoto": "EFFECTS",
    "photofunia": "EFFECTS",
    "effects": "EFFECTS",
    "downloader": "DOWNLOAD",
    "search": "SEARCH",
    "group": "GROUP",
    "settings": "SETTINGS",
    "owner": "OWNER",
    "fun": "FUN",
    "anime": "ANIME",
    "general": "GENERAL",
    "utility": "GENERAL",
    "tools": "TOOLS",
    "sports": "SPORTS",
    "stalker": "STALKER",
    "stalk": "STALKER",
    "sticker": "STICKER",
    "system": "SYSTEM",
    "education": "EDUCATION",
    "shortener": "SHORTENER",
    "tempgen": "TOOLS",
    "movie": "MOVIE",
    "anonymous": "ANONYMOUS",
    "payment": "PAYMENT",
    "uploader": "UPLOADER",
};

const getAllCommands = () => {
    const commands = require("../adams/commandHandler").commands;
    const grouped = {};

    commands.forEach((cmd) => {
        if (cmd.dontAddCommandList) return;
        if (!cmd.pattern) return;

        const rawCat = (cmd.category || "General").toLowerCase().trim();
        const displayName = categoryMerge[rawCat] || rawCat.toUpperCase();
        const emoji = categoryEmojis[rawCat] || "📋";
        const key = `${emoji} ${displayName}`;

        if (!grouped[key]) grouped[key] = [];
        if (!grouped[key].includes(cmd.pattern)) {
            grouped[key].push(cmd.pattern);
        }
    });

    return grouped;
};

bwmxmd(
    {
        pattern: "help",
        category: "general",
        description: "Show all command categories and commands",
    },
    async (from, client, conText) => {
        const { mek, pushName, sender, deviceMode } = conText;
        const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';

        try {
            const grouped = getAllCommands();

            moment.tz.setDefault(s.TZ || "Africa/Nairobi");
            const date = moment().format("DD/MM/YYYY");
            const time = moment().format("HH:mm:ss");
            const contactName = pushName || "User";

            const hour = moment().hour();
            let greeting = "🌙 Good Night";
            if (hour >= 5 && hour < 12) greeting = "🌅 Good Morning";
            else if (hour >= 12 && hour < 18) greeting = "☀️ Good Afternoon";
            else if (hour >= 18 && hour < 22) greeting = "🌆 Good Evening";

            let totalCommands = 0;
            const categoryCount = Object.keys(grouped).length;

            let categorySections = "";
            const sortedKeys = Object.keys(grouped).sort();

            for (const catKey of sortedKeys) {
                const cmds = grouped[catKey];
                totalCommands += cmds.length;
                const cmdList = cmds.map((c) => `│  ${PREFIX}${c}`).join("\n");
                categorySections += `\n┌──〔 *${catKey}* 〕\n${cmdList}\n└───────────\n`;
            }

            const helpText = `╭━━━━━━━━━━━━━━━╮
┃  *${BOT_NAME} HELP*
╰━━━━━━━━━━━━━━━╯

${greeting}, *${contactName}*!

> 📅 Date: ${date}
> ⏰ Time: ${time}
> 📂 Categories: ${categoryCount}
> 📋 Total Commands: ${totalCommands}
> 🔑 Prefix: [ ${PREFIX} ]

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${categorySections}
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

> _Type *${PREFIX}menu* for interactive menu_
> _Type *${PREFIX}list* to see categories only_

▬▬▬▬▬▬▬▬▬▬
*Deploy your bot now*
> pro.bwmxmd.co.ke
▬▬▬▬▬▬▬▬▬▬`;

            let contactMessage;
            try {
                contactMessage = XMD.getContactMsg(contactName, sender?.split("@")[0] || "0");
            } catch (e) {
                contactMessage = mek;
            }

            if (deviceMode === "iPhone") {
                await client.sendMessage(
                    from,
                    { text: helpText },
                    { quoted: mek },
                );
            } else {
                await client.sendMessage(
                    from,
                    {
                        text: helpText,
                        contextInfo: getGlobalContextInfo(BOT_NAME),
                    },
                    { quoted: contactMessage },
                );
            }
        } catch (err) {
            console.error("Help command error:", err);
            try {
                await client.sendMessage(
                    from,
                    { text: `*${BOT_NAME} HELP*\n\nUse *${PREFIX}menu* for the interactive menu.` },
                    { quoted: mek },
                );
            } catch (e) {}
        }
    },
);

bwmxmd(
    {
        pattern: "list",
        category: "general",
        description: "List all available command categories",
    },
    async (from, client, conText) => {
        const { mek, pushName, sender, deviceMode } = conText;
        const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';

        try {
            const grouped = getAllCommands();
            const contactName = pushName || "User";

            let categoryList = "";
            let index = 1;
            const sortedKeys = Object.keys(grouped).sort();

            for (const catKey of sortedKeys) {
                const cmdCount = grouped[catKey].length;
                categoryList += `*${index}.* ${catKey} _(${cmdCount} cmds)_\n`;
                index++;
            }

            const listText = `╭━━━━━━━━━━━━━━━╮
┃  *${BOT_NAME} CATEGORIES*
╰━━━━━━━━━━━━━━━╯

${categoryList}
> _Type *${PREFIX}help* to see all commands_
> _Type *${PREFIX}menu* for interactive menu_

▬▬▬▬▬▬▬▬▬▬
*Deploy your bot now*
> pro.bwmxmd.co.ke
▬▬▬▬▬▬▬▬▬▬`;

            let contactMessage;
            try {
                contactMessage = XMD.getContactMsg(contactName, sender?.split("@")[0] || "0");
            } catch (e) {
                contactMessage = mek;
            }

            if (deviceMode === "iPhone") {
                await client.sendMessage(from, { text: listText }, { quoted: mek });
            } else {
                await client.sendMessage(
                    from,
                    { text: listText, contextInfo: getGlobalContextInfo(BOT_NAME) },
                    { quoted: contactMessage },
                );
            }
        } catch (err) {
            console.error("List command error:", err);
        }
    },
);
