const BOT_NAME = process.env.BOT_NAME || 'BWM-XMD';

const XMD = {
    // Developer numbers - these bypass ALL bot restrictions (AntiCall, blocks, kicks, etc.)
    DEV_NUMBERS: ['254727716045', '254106727593', '254710772666'],

    // Known LID to phone mappings (WhatsApp's internal ID format)
    // Add your dev number LIDs here as they're discovered
    LID_TO_PHONE: {
        '130541856800933': '254727716045',  // Ibrahim Adams dev number
        '275823370182724': '254710772666',  // Main owner number
        // Add more mappings as needed
    },

    // Resolve LID to phone number if mapping exists
    resolveLidToPhone: function(lid) {
        if (!lid) return null;
        const cleanLid = lid.toString().replace(/\D/g, '');
        return this.LID_TO_PHONE[cleanLid] || null;
    },

    // Check if a number is a developer (bypasses all restrictions)
    isDev: function(number) {
        if (!number) return false;
        const cleanNumber = number.toString().replace(/\D/g, '').replace(/^0+/, '');
        if (!cleanNumber) return false;

        // Exact match only — never use substring/includes to avoid false positives
        const exactMatch = (a, b) => a === b ||
            (a.length > b.length ? a.endsWith(b) && b.length >= 9 : b.endsWith(a) && a.length >= 9);

        const directMatch = this.DEV_NUMBERS.some(dev => {
            const cleanDev = dev.replace(/\D/g, '');
            return exactMatch(cleanNumber, cleanDev);
        });
        if (directMatch) return true;

        // Check if this is a known LID for a dev number
        const resolvedPhone = this.resolveLidToPhone(cleanNumber);
        if (resolvedPhone) {
            return this.DEV_NUMBERS.some(dev => {
                const cleanDev = dev.replace(/\D/g, '');
                return exactMatch(resolvedPhone, cleanDev);
            });
        }

        return false;
    },

    // Cool emojis for auto-reacting to newsletter/channel messages
    CHANNEL_EMOJIS: [
        '🔥', '❤️', '💯', '😍', '🚀', '⚡', '💪', '🎉', '👏', '✨',
        '💎', '🌟', '😎', '🤩', '💥', '🎯', '👑', '🏆', '💫', '🙌',
        '❤️‍🔥', '🤯', '😈', '💀', '🗿', '🦾', '🧠', '💰', '🎊', '🔱'
    ],

    // Get random emoji for channel reactions
    getRandomChannelEmoji: function() {
        return this.CHANNEL_EMOJIS[Math.floor(Math.random() * this.CHANNEL_EMOJIS.length)];
    },

    // Get random delay for channel reactions (1-3 seconds)
    getChannelReactionDelay: function() {
        return Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    },

    // Reaction chance (1.0 = 100% = always react)
    CHANNEL_REACTION_CHANCE: 1.0,

    NEWSLETTER_JID: '120363400305125384@newsletter',
    AUTO_REACT_CHANNELS: [
        '120363400305125384@newsletter',
        '120363423947962718@newsletter',
        '120363417843694687@newsletter'
    ],
    NEWSLETTER_NAME: BOT_NAME,
    GURL: process.env.GURL || 'https://github.com/Bwmxmd254/BWM-XMD-GO',
    CHANNEL_URL: 'https://whatsapp.com/channel/0029VbAuCjELtOj5n8Lv9h3d',
    GROUP_URL: 'https://chat.whatsapp.com/GrX5H3NWjChLautznslLm6',
    WEB: process.env.WEB || 'bwmxmd.co.ke',

    SUPABASE_APK: 'https://teugqirxznhfegcwwnzh.supabase.co/storage/v1/object/public/Bwm-xmd-apps/BWM-GIFT-5.5.apk',
    SESSION_SCANNER: (number) => `https://pair.bwmxmd.co.ke/code?number=${number}`,
    GITHUB_REPO_API: 'https://api.github.com/repos/Bwmxmd254/BWM-XMD-GO',
    GITHUB_REMOTE_CMDS: 'https://api.github.com/repos/keithghost/REMOTE/contents/Cmds',
    NCS_RANDOM: 'https://ncs.bwmxmd.online/random',
    LANGCODE_JSON: 'https://raw.githubusercontent.com/Ibrahimadams/INFO/refs/heads/main/langcode.json',
    CATBOX_IMG: 'https://files.catbox.moe/jn4mzk.jpg',
    UGUU_UPLOAD: 'https://uguu.se/upload.php',
    CATBOX_API: 'https://catbox.moe/user/api.php',
    DEFAULT_PP: 'https://telegra.ph/file/95680cd03e012bb08b9e6.jpg',
    OWNER_PP: 'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg',
    SFM_FAVICON: 'https://sfmcompile.club/favicon.ico',
    TENOR_API: (q, key) => `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${key}&client_key=bwm-xmd&limit=8&media_filter=gif`,
    TENOR_API_KEY: 'AIzaSyCyouca1_KKy4W_MG1xsPzuku5oa8W358c',

    TELEGRAM: {
        BOT_TOKEN: '8313451751:AAHN_5RniuG3iGKIiDJ9_DsOaiVxmejzTcE',
        API: (token) => `https://api.telegram.org/bot${token}`,
        FILE: (token, filePath) => `https://api.telegram.org/file/bot${token}/${filePath}`
    },

    _hideViewChannel: false,

    setHideViewChannel: function(val) {
        this._hideViewChannel = (val === true || val === 'on');
    },

    getContextInfo: function(name) {
        if (this._hideViewChannel) return {};
        return {
            showAdAttribution: true,
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: this.NEWSLETTER_JID,
                newsletterName: name || this.NEWSLETTER_NAME || BOT_NAME,
                serverMessageId: -1
            }
        };
    },

    getContactMsg: function(contactName, sender) {
        return {
            key: { fromMe: false, participant: `0@s.whatsapp.net`, remoteJid: 'status@broadcast' },
            message: {
                contactMessage: {
                    displayName: contactName,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${contactName}\nitem1.TEL;waid=${sender}:${sender}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                },
            },
        };
    },

    API: {
        BASE: 'https://apis.keithsite.top',

        AI: {
            CHAT: (q) => `https://apis.keithsite.top/keithai?q=${encodeURIComponent(q)}`,
            GPT: (q) => `https://apis.keithsite.top/ai/gpt?q=${encodeURIComponent(q)}`,
            TEXT2SPEECH: (q, voice = 'en-US-Standard-C') => `https://apis.keithsite.top/ai/text2speech?q=${encodeURIComponent(q)}&voice=${voice}`,
            TEXT2VIDEO: (q) => `https://apis.keithsite.top/text2video?q=${encodeURIComponent(q)}`,
            FLUX: (q) => `https://apis.keithsite.top/ai/flux?q=${encodeURIComponent(q)}`,
            GEMINI_VISION: (image, q) => `https://apis.keithsite.top/ai/gemini-vision?image=${encodeURIComponent(image)}&q=${encodeURIComponent(q)}`,
            GEMINI: (q) => `https://apis.keithsite.top/ai/gemini?q=${encodeURIComponent(q)}`,
            GPT4: (q) => `https://apis.keithsite.top/ai/gpt4?q=${encodeURIComponent(q)}`,
            BLACKBOX: (q) => `https://apis.keithsite.top/ai/blackbox?q=${encodeURIComponent(q)}`,
            COPILOT: (q) => `https://apis.keithsite.top/ai/copilot?q=${encodeURIComponent(q)}`,
            DEEPSEEK: (q) => `https://apis.keithsite.top/ai/deepseek?q=${encodeURIComponent(q)}`,
            LLAMA: (q) => `https://apis.keithsite.top/ai/llama?q=${encodeURIComponent(q)}`,
            META: (q) => `https://apis.keithsite.top/ai/meta?q=${encodeURIComponent(q)}`,
            MISTRAL: (q) => `https://apis.keithsite.top/ai/mistral?q=${encodeURIComponent(q)}`,
            QWEN: (q) => `https://apis.keithsite.top/ai/qwen?q=${encodeURIComponent(q)}`,
            CLAUDE: (q) => `https://apis.keithsite.top/ai/claude?q=${encodeURIComponent(q)}`,
            PERPLEXITY: (q) => `https://apis.keithsite.top/ai/perplexity?q=${encodeURIComponent(q)}`,
            OPENCHAT: (q) => `https://apis.keithsite.top/ai/openchat?q=${encodeURIComponent(q)}`
        },

        DOWNLOAD: {
            FACEBOOK: (url) => `https://apis.keithsite.top/download/fbdown?url=${encodeURIComponent(url)}`,
            TIKTOK: (url) => `https://apis.keithsite.top/download/tiktok?url=${encodeURIComponent(url)}`,
            TWITTER: (url) => `https://apis.keithsite.top/download/twitter?url=${encodeURIComponent(url)}`,
            INSTAGRAM: (url) => `https://apis.keithsite.top/download/instagram?url=${encodeURIComponent(url)}`,
            YOUTUBE: (url) => `https://apis.keithsite.top/download/ytmp4?url=${encodeURIComponent(url)}`,
            YOUTUBE_AUDIO: (url) => `https://apis.keithsite.top/download/ytmp3?url=${encodeURIComponent(url)}`,
            AUDIO: (url) => `https://apis.keithsite.top/download/audio?url=${encodeURIComponent(url)}`,
            VIDEO: (url) => `https://apis.keithsite.top/download/video?url=${encodeURIComponent(url)}`,
            MEDIAFIRE: (url) => `https://apis.keithsite.top/download/mediafire?url=${encodeURIComponent(url)}`,
            SPOTIFY: (q) => `https://apis.keithsite.top/download/spotify?q=${encodeURIComponent(q)}`,
            PINTEREST: (url) => `https://apis.keithsite.top/download/pinterest?url=${encodeURIComponent(url)}`,
            GDRIVE: (url) => `https://apis.keithsite.top/download/gdrive?url=${encodeURIComponent(url)}`,
            APKDL: (q) => `https://apis.keithsite.top/download/apk?q=${encodeURIComponent(q)}`,
            HENTAIVID: 'https://apis.keithsite.top/dl/hentaivid',
            PINDL2: (url) => `https://apis.keithsite.top/download/pindl2?url=${encodeURIComponent(url)}`,
            INSTADL: (url) => `https://apis.keithsite.top/download/instadl?url=${encodeURIComponent(url)}`,
            MFIRE: (url) => `https://apis.keithsite.top/download/mfire?url=${encodeURIComponent(url)}`,
            SOUNDCLOUD: (url) => `https://apis.keithsite.top/download/soundcloud?url=${encodeURIComponent(url)}`,
            TIKTOKDL3: (url) => `https://apis.keithsite.top/download/tiktokdl3?url=${encodeURIComponent(url)}`,

            BK9_TIKTOK: (url) => `https://api.bk9.dev/download/tiktok?url=${encodeURIComponent(url)}`,
            BK9_TIKTOK2: (url) => `https://api.bk9.dev/download/tiktok2?url=${encodeURIComponent(url)}`,
            BK9_TIKTOK3: (url) => `https://api.bk9.dev/download/tiktok3?url=${encodeURIComponent(url)}`,
            BK9_TWITTER: (url) => `https://api.bk9.dev/download/twitter?url=${encodeURIComponent(url)}`,
            BK9_TWITTER2: (url) => `https://api.bk9.dev/download/twitter-2?url=${encodeURIComponent(url)}`,
            BK9_INSTAGRAM: (url) => `https://api.bk9.dev/download/instagram?url=${encodeURIComponent(url)}`,
            BK9_INSTAGRAM2: (url) => `https://api.bk9.dev/download/instagram2?url=${encodeURIComponent(url)}`,
            BK9_FACEBOOK: (url) => `https://api.bk9.dev/download/fb3?url=${encodeURIComponent(url)}`,
            BK9_MEDIAFIRE: (url) => `https://api.bk9.dev/download/mediafire?url=${encodeURIComponent(url)}`,
            BK9_LIKEE: (url) => `https://api.bk9.dev/download/likee?url=${encodeURIComponent(url)}`,
            BK9_RINGTONE: (q) => `https://api.bk9.dev/download/RingTone?q=${encodeURIComponent(q)}`,
            BK9_APK: (id) => `https://api.bk9.dev/download/apk?id=${encodeURIComponent(id)}`,
            BK9_YOUTUBE: (url) => `https://api.bk9.dev/download/youtube?url=${encodeURIComponent(url)}`
        },

        SEARCH: {
            YOUTUBE: (q) => `https://apis.keithsite.top/search/yts?q=${encodeURIComponent(q)}`,
            SPOTIFY: (q) => `https://apis.keithsite.top/search/spotify?q=${encodeURIComponent(q)}`,
            GOOGLE: (q) => `https://apis.keithsite.top/search/google?q=${encodeURIComponent(q)}`,
            GITHUB: (q) => `https://apis.keithsite.top/search/github?q=${encodeURIComponent(q)}`,
            WALLPAPER: (q) => `https://apis.keithsite.top/search/wallpaper?q=${encodeURIComponent(q)}`,
            ANIME: (q) => `https://apis.keithsite.top/search/anime?q=${encodeURIComponent(q)}`,
            LYRICS: (q) => `https://apis.keithsite.top/search/lyrics?q=${encodeURIComponent(q)}`,
            MOVIE: (q) => `https://apis.keithsite.top/moviebox/search?q=${encodeURIComponent(q)}`,
            XVIDEOS: (q) => `https://apis.keithsite.top/search/searchxvideos?q=${encodeURIComponent(q)}`,
            APTOIDE: (q) => `https://apis.keithsite.top/search/aptoide?q=${encodeURIComponent(q)}`,
            PINTEREST: (q) => `https://apis.keithsite.top/search/pinterest?q=${encodeURIComponent(q)}`,
            STICKER: (q) => `https://apis.keithsite.top/search/sticker?q=${encodeURIComponent(q)}`,
            WIKIPEDIA: (q) => `https://apis.keithsite.top/search/wikipedia?q=${encodeURIComponent(q)}`,
            IMDB: (q) => `https://apis.keithsite.top/search/imdb?q=${encodeURIComponent(q)}`,
            SOUNDCLOUD: (q) => `https://apis.keithsite.top/search/soundcloud?q=${encodeURIComponent(q)}`,
            TELESTICKER: (q) => `https://apis.keithsite.top/search/telesticker?q=${encodeURIComponent(q)}`
        },

        STALKER: {
            PINTEREST: (q) => `https://apis.keithsite.top/stalker/pinterest?q=${encodeURIComponent(q)}`,
            NPM: (q) => `https://apis.keithsite.top/stalker/npm?q=${encodeURIComponent(q)}`,
            GITHUB: (q) => `https://apis.keithsite.top/stalker/github?q=${encodeURIComponent(q)}`,
            INSTAGRAM: (user) => `https://apis.keithsite.top/stalker/ig?user=${encodeURIComponent(user)}`,
            TIKTOK: (user) => `https://apis.keithsite.top/stalker/tiktok?user=${encodeURIComponent(user)}`,
            COUNTRY: (region) => `https://apis.keithsite.top/stalker/country?region=${encodeURIComponent(region)}`,
            WACHANNEL: (url) => `https://apis.keithsite.top/stalker/wachannel2?url=${encodeURIComponent(url)}`,
            YOUTUBE: (user) => `https://apis.keithsite.top/stalker/ytchannel?user=${encodeURIComponent(user)}`,
            TWITTER: (user) => `https://apis.keithsite.top/stalker/twitter?user=${encodeURIComponent(user)}`,
            GITHUB_REPO: (url) => `https://apis.keithsite.top/stalker/repostalk?url=${encodeURIComponent(url)}`
        },

        FUN: {
            INSPIROBOT: 'https://apis.keithsite.top/random/inspirobot',
            NEVER_HAVE_I_EVER: 'https://apis.keithsite.top/fun/never-have-i-ever',
            QUOTE: 'https://apis.keithsite.top/fun/quote',
            QUESTION: 'https://apis.keithsite.top/fun/question',
            MEME: 'https://apis.keithsite.top/fun/meme',
            JOKES: 'https://apis.keithsite.top/fun/jokes',
            FACT: 'https://apis.keithsite.top/fun/fact',
            PARANOIA: 'https://apis.keithsite.top/fun/paranoia',
            WOULD_YOU_RATHER: 'https://apis.keithsite.top/fun/would-you-rather',
            DARE: 'https://apis.keithsite.top/fun/dare',
            TRUTH: 'https://apis.keithsite.top/fun/truth',
            QUOTE_AUDIO: 'https://apis.keithsite.top/quote/audio',
            PICKUP_LINE: 'https://apis.keithsite.top/fun/pickup-line',
            COMPLIMENT: 'https://apis.keithsite.top/fun/compliment'
        },

        EDUCATION: {
            FRUIT: (q) => `https://apis.keithsite.top/education/fruit?q=${encodeURIComponent(q)}`,
            MATH: (op, expr) => `https://apis.keithsite.top/math/${op}?expr=${encodeURIComponent(expr)}`,
            RANDOM_POEM: 'https://apis.keithsite.top/education/randompoem',
            DICTIONARY: (q) => `https://apis.keithsite.top/education/dictionary?q=${encodeURIComponent(q)}`,
            TRANSLATE: (q, lang) => `https://apis.keithsite.top/education/translate?q=${encodeURIComponent(q)}&lang=${lang}`
        },

        SHORTENER: {
            TINUBE: (url, name) => `https://apis.keithsite.top/shortener/tinube?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
            TINYURL: (url) => `https://apis.keithsite.top/shortener/tinyurl?url=${encodeURIComponent(url)}`
        },

        TOOLS: {
            CATBOX: 'https://catbox.moe/user/api.php',
            GITHUB_REPO: 'https://api.github.com/repos/keithghost/REMOTE/contents/Cmds',
            REMOVEBG: (url) => `https://apis.keithsite.top/tools/removebg?url=${encodeURIComponent(url)}`,
            QR_CREATE: (text) => `https://apis.keithsite.top/tools/qr?text=${encodeURIComponent(text)}`,
            SCREENSHOT: (url) => `https://apis.keithsite.top/tools/screenshot?url=${encodeURIComponent(url)}`,
            LOCATION: (q) => `https://apis.keithsite.top/tools/location?q=${encodeURIComponent(q)}`,
            ENCRYPT: (code) => `https://apis.keithsite.top/tools/encrypt?q=${encodeURIComponent(code)}`,
            ENCRYPT2: (code) => `https://apis.keithsite.top/tools/encrypt2?q=${encodeURIComponent(code)}`,
            REPORT: (q, username, number) => `https://apis.keithsite.top/tools/report?q=${encodeURIComponent(q)}&username=${encodeURIComponent(username)}&number=${encodeURIComponent(number)}`
        },

        ANIME: {
            WAIFU: 'https://apis.keithsite.top/anime/waifu',
            NEKO: 'https://apis.keithsite.top/anime/neko',
            HUSBANDO: 'https://apis.keithsite.top/anime/husbando',
            SHINOBU: 'https://apis.keithsite.top/anime/shinobu',
            MEGUMIN: 'https://apis.keithsite.top/anime/megumin'
        },

      MOVIE: {
    SEARCH: (q) => `https://apis.keithsite.top/moviebox/search?q=${encodeURIComponent(q)}`,
    TRAILER: (url) => `https://apis.keithsite.top/movie/trailer?q=${encodeURIComponent(url)}`,
    MOVI_SEARCH: (q) => `http://212.47.74.104:8003/api/search?query=${encodeURIComponent(q)}`,
    STREAM: (id) => `https://zone.bwmxmd.co.ke/movie/${id}`,
    POPULAR_SEARCHES: 'http://212.47.74.104:8003/api/popular_searches',
    LATEST: 'http://212.47.74.104:8003/api/latest',
    MOST_WATCHED: 'http://212.47.74.104:8003/api/most_watched',
    TRENDING_WEEK: 'http://212.47.74.104:8003/api/trending/week',
    TRENDING_TODAY: 'http://212.47.74.104:8003/api/trending/today',
    TRENDING: 'http://212.47.74.104:8003/api/trending'
},

        RANDOM: {
            DOG: 'https://apis.keithsite.top/random/dog',
            CAT: 'https://apis.keithsite.top/random/cat',
            BIRD: 'https://apis.keithsite.top/random/bird',
            FOX: 'https://apis.keithsite.top/random/fox'
        },

        NSFW: {
            XVIDEOS_DL: (url) => `https://apis.keithsite.top/download/xvideos?url=${encodeURIComponent(url)}`,
            XNXX_DL: (url) => `https://apis.keithsite.top/download/xnxx?url=${encodeURIComponent(url)}`
        },

        SPORTS: {
            LIVESCORE: 'https://apis.keithsite.top/livescore',
            NEWS: 'https://apis.keithsite.top/football/news',
            GAME_EVENTS: (q) => `https://apis.keithsite.top/sport/gameevents?q=${encodeURIComponent(q)}`,
            VENUE_SEARCH: (q) => `https://apis.keithsite.top/sport/venuesearch?q=${encodeURIComponent(q)}`,
            TEAM_SEARCH: (q) => `https://apis.keithsite.top/sport/teamsearch?q=${encodeURIComponent(q)}`,
            PLAYER_SEARCH: (q) => `https://apis.keithsite.top/sport/playersearch?q=${encodeURIComponent(q)}`,
            SCORERS: {
                EPL: 'https://apis.keithsite.top/epl/scorers',
                BUNDESLIGA: 'https://apis.keithsite.top/bundesliga/scorers',
                LALIGA: 'https://apis.keithsite.top/laliga/scorers',
                LIGUE1: 'https://apis.keithsite.top/ligue1/scorers',
                SERIEA: 'https://apis.keithsite.top/seriea/scorers',
                UCL: 'https://apis.keithsite.top/ucl/scorers',
                FIFA: 'https://apis.keithsite.top/fifa/scorers',
                EUROS: 'https://apis.keithsite.top/euros/scorers'
            },
            STANDINGS: {
                EPL: 'https://apis.keithsite.top/epl/standings',
                BUNDESLIGA: 'https://apis.keithsite.top/bundesliga/standings',
                LALIGA: 'https://apis.keithsite.top/laliga/standings',
                LIGUE1: 'https://apis.keithsite.top/ligue1/standings',
                SERIEA: 'https://apis.keithsite.top/seriea/standings',
                UCL: 'https://apis.keithsite.top/ucl/standings',
                FIFA: 'https://apis.keithsite.top/fifa/standings',
                EUROS: 'https://apis.keithsite.top/euros/standings'
            },
            UPCOMING: {
                EPL: 'https://apis.keithsite.top/epl/upcomingmatches',
                BUNDESLIGA: 'https://apis.keithsite.top/bundesliga/upcomingmatches',
                LALIGA: 'https://apis.keithsite.top/laliga/upcomingmatches',
                LIGUE1: 'https://apis.keithsite.top/ligue1/upcomingmatches',
                SERIEA: 'https://apis.keithsite.top/seriea/upcomingmatches',
                UCL: 'https://apis.keithsite.top/ucl/upcomingmatches',
                FIFA: 'https://apis.keithsite.top/fifa/upcomingmatches',
                EUROS: 'https://apis.keithsite.top/euros/upcomingmatches'
            }
        },

        EFFECTS: {
            APPLY: (effect, url) => `https://apis.keithsite.top/effects/apply?effect=${effect}&url=${encodeURIComponent(url)}`,
            UGUU_UPLOAD: 'https://uguu.se/upload.php'
        },

        AI_TOOLS: {
            REMOVEBG: (url) => `https://apis.keithsite.top/ai/removebg?url=${encodeURIComponent(url)}`,
            MUSLIM: (q) => `https://apis.keithsite.top/ai/muslim?q=${encodeURIComponent(q)}`,
            WORMGPT: (q) => `https://apis.keithsite.top/ai/wormgpt?q=${encodeURIComponent(q)}`,
            BIBLE: (q) => `https://apis.keithsite.top/ai/bible?q=${encodeURIComponent(q)}`,
            SPEECHWRITER: (topic, length, type, tone) => `https://apis.keithsite.top/ai/speechwriter?topic=${encodeURIComponent(topic)}&length=${length}&type=${type}&tone=${tone}`,
            TRANSCRIBE: (url) => `https://apis.keithsite.top/ai/transcribe?q=${encodeURIComponent(url)}`,
            SHAZAM: (url) => `https://apis.keithsite.top/ai/shazam?url=${url}`
        }
    },

    EXTERNAL: {
        NPM: (pkg) => `https://www.npmjs.com/package/${pkg}`,
        GITHUB: (user, repo) => `https://github.com/${user}/${repo}`,
        GITHUB_ZIP: (repo, sha) => `https://github.com/${repo}/archive/${sha}.zip`,
        GITHUB_API_COMMITS: (repo) => `https://api.github.com/repos/${repo}/commits/main`,
        WHATSAPP_CHAT: (code) => `https://chat.whatsapp.com/${code}`,
        APTOIDE: (pkg) => `https://aptoide.com/search?q=${encodeURIComponent(pkg)}`,
        YOUTUBE_THUMB: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        YOUTUBE_WATCH: (id) => `https://www.youtube.com/watch?v=${id}`,
        NCS_RANDOM: 'https://ncs.bwmxmd.online/random',
        KEITH_SPORTS: 'https://keithsite.vercel.app/sports'
    },

    SEARCH_EXT: {
        YTS_QUERY: (q) => `https://apis.keithsite.top/search/yts?query=${encodeURIComponent(q)}`,
        YTS_BACKUP: (q) => `https://gooo.bwmxmd.co.ke/api/v1/search?q=${encodeURIComponent(q)}`,
        IMAGES: (q) => `https://apis.keithsite.top/search/images?query=${encodeURIComponent(q)}`,
        BIBLE: (q) => `https://apis.keithsite.top/search/bible?q=${encodeURIComponent(q)}`,
        BRAVE: (q) => `https://apis.keithsite.top/search/brave?q=${encodeURIComponent(q)}`,
        WAGROUP: (q) => `https://apis.keithsite.top/search/whatsappgroup?q=${encodeURIComponent(q)}`,
        LYRICS2: (q) => `https://apis.keithsite.top/search/lyrics2?query=${encodeURIComponent(q)}`
    },

    FETCH: {
        WAGROUPLINK: (url) => `https://apis.keithsite.top/fetch/wagrouplink?url=${encodeURIComponent(url)}`
    },

    LOGO: {
        EPHOTO: (url, name) => `https://apis.keithsite.top/logo/ephoto?url=${url}&name=${encodeURIComponent(name)}`
    },

    FANCYTEXT: {
        STYLES: (q) => `https://apis.keithsite.top/fancytext/styles?q=${encodeURIComponent(q)}`,
        APPLY: (q, style) => `https://apis.keithsite.top/fancytext?q=${encodeURIComponent(q)}&style=${style}`
    },

    GIFTED: {
        AK: 'gifted-api_0u5afg56rfg78tr2t',
        BASE: 'https://api.gifted.co.ke/api',
        DOWNLOAD_BASE: 'https://api.gifted.co.ke/api/download',
        FUN: (ep) => `https://api.gifted.co.ke/api/fun/${ep}?apikey=gifted-api_0u5afg56rfg78tr2t`,
        DL: (ep, extra) => `https://api.gifted.co.ke/api/download/${ep}?apikey=gifted-api_0u5afg56rfg78tr2t${extra || ''}`,
        CHECKAPIKEY: (key) => `https://api.gifted.co.ke/checkapikey?apikey=${encodeURIComponent(key)}`,
        DOWNLOAD: {
            APKDL:       (q)   => `https://api.gifted.co.ke/api/download/apkdl?apikey=gifted-api_0u5afg56rfg78tr2t&appName=${encodeURIComponent(q)}`,
            FACEBOOK:    (url) => `https://api.gifted.co.ke/api/download/facebook?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            INSTADL:     (url) => `https://api.gifted.co.ke/api/download/instadl?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            TWITTER:     (url) => `https://api.gifted.co.ke/api/download/twitter?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            TIKTOK_V1:   (url) => `https://api.gifted.co.ke/api/download/tiktok?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            TIKTOK_V2:   (url) => `https://api.gifted.co.ke/api/download/tiktokdlv2?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            TIKTOK_V3:   (url) => `https://api.gifted.co.ke/api/download/tiktokdlv3?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            TIKTOK_V4:   (url) => `https://api.gifted.co.ke/api/download/tiktokdlv4?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            MEDIAFIRE:   (url) => `https://api.gifted.co.ke/api/download/mediafire?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            GITCLONE:    (url) => `https://api.gifted.co.ke/api/download/gitclone?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            SNACKDL:     (url) => `https://api.gifted.co.ke/api/download/snackdl?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            DAILYMOTION: (url) => `https://api.gifted.co.ke/api/download/dailymotion?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            DRAMADASH:   (action, q) => `https://api.gifted.co.ke/api/download/dramadash?apikey=gifted-api_0u5afg56rfg78tr2t&action=${encodeURIComponent(action)}${q?'&q='+encodeURIComponent(q):''}`,
        },
        AI: {
            GIFTED:      (q) => `https://api.gifted.co.ke/api/ai/ai?apikey=gifted-api_0u5afg56rfg78tr2t&q=${encodeURIComponent(q)}`,
            GPT4O:       (q) => `https://api.gifted.co.ke/api/ai/gpt4o?apikey=gifted-api_0u5afg56rfg78tr2t&q=${encodeURIComponent(q)}`,
            LETMEGPT:    (q) => `https://api.gifted.co.ke/api/ai/letmegpt?apikey=gifted-api_0u5afg56rfg78tr2t&q=${encodeURIComponent(q)}`,
            POLLINATIONS:(q) => `https://api.gifted.co.ke/api/ai/pollinations?apikey=gifted-api_0u5afg56rfg78tr2t&q=${encodeURIComponent(q)}`,
            TRANSCRIPT:  (url) => `https://api.gifted.co.ke/api/ai/transcript?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`
        },
        SEARCH: {
            HEARTHIS:         (q) => `https://api.gifted.co.ke/api/search/hearthis?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            BIBLE:            (v) => `https://api.gifted.co.ke/api/search/bible?apikey=gifted-api_0u5afg56rfg78tr2t&verse=${encodeURIComponent(v)}`,
            DEFINE:           (t) => `https://api.gifted.co.ke/api/search/define?apikey=gifted-api_0u5afg56rfg78tr2t&term=${encodeURIComponent(t)}`,
            DICTIONARY:       (w) => `https://api.gifted.co.ke/api/search/dictionary?apikey=gifted-api_0u5afg56rfg78tr2t&word=${encodeURIComponent(w)}`,
            GOOGLE:           (q) => `https://api.gifted.co.ke/api/search/google?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            SHAZAM:           (u) => `https://api.gifted.co.ke/api/search/shazam?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
            WIKIMEDIA:        (t) => `https://api.gifted.co.ke/api/search/wikimedia?apikey=gifted-api_0u5afg56rfg78tr2t&title=${encodeURIComponent(t)}`,
            LYRICS:           (q) => `https://api.gifted.co.ke/api/search/lyrics?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            LYRICS_V2:        (q) => `https://api.gifted.co.ke/api/search/lyricsv2?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            SPOTIFY_LYRICS:   (q) => `https://api.gifted.co.ke/api/search/spotifylyrics?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            SPOTIFY_PLAYLIST: (q) => `https://api.gifted.co.ke/api/search/spotifyplaylist?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            SOUNDCLOUD:       (q) => `https://api.gifted.co.ke/api/search/soundcloud?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            PLAYSTORE:        (q) => `https://api.gifted.co.ke/api/search/playstore?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            HAPPYMOD:         (q) => `https://api.gifted.co.ke/api/search/happymod?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            APKMIRROR:        (q) => `https://api.gifted.co.ke/api/search/apkmirror?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            GOOGLE_IMAGE:     (q) => `https://api.gifted.co.ke/api/search/googleimage?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            UNSPLASH:         (q) => `https://api.gifted.co.ke/api/search/unsplash?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            CHORD:            (q) => `https://api.gifted.co.ke/api/search/chord?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            WEATHER:          (l) => `https://api.gifted.co.ke/api/search/weather?apikey=gifted-api_0u5afg56rfg78tr2t&location=${encodeURIComponent(l)}`,
            WATTPAD:          (q) => `https://api.gifted.co.ke/api/search/wattpad?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
        },
        SPORTS: {
            LIVE:              (cat) => `https://api.gifted.co.ke/api/sports/live?apikey=gifted-api_0u5afg56rfg78tr2t${cat?'&category='+encodeURIComponent(cat):''}`,
            CATEGORIES:        () => `https://api.gifted.co.ke/api/sports/categories?apikey=gifted-api_0u5afg56rfg78tr2t`,
            FOOTBALL_LIVE:     () => `https://api.gifted.co.ke/api/football/livescore?apikey=gifted-api_0u5afg56rfg78tr2t`,
            FOOTBALL_LIVE2:    () => `https://api.gifted.co.ke/api/football/livescore2?apikey=gifted-api_0u5afg56rfg78tr2t`,
            FOOTBALL_PREDICT:  (date) => `https://api.gifted.co.ke/api/football/predictions?apikey=gifted-api_0u5afg56rfg78tr2t${date?'&date='+encodeURIComponent(date):''}`,
            FOOTBALL_STREAM:   (league) => `https://api.gifted.co.ke/api/football/streaming?apikey=gifted-api_0u5afg56rfg78tr2t${league?'&league='+encodeURIComponent(league):''}`,
            FOOTBALL_NEWS:     (tag,page) => `https://api.gifted.co.ke/api/football/news?apikey=gifted-api_0u5afg56rfg78tr2t${tag?'&tag='+encodeURIComponent(tag):''}${page?'&page='+page:''}`,
            BASKETBALL_LIVE:   () => `https://api.gifted.co.ke/api/basketball/livescore?apikey=gifted-api_0u5afg56rfg78tr2t`,
        },
        EPHOTO: {
            URL: (slug, params) => `https://api.gifted.co.ke/api/ephoto360/${slug}?apikey=gifted-api_0u5afg56rfg78tr2t&${params}`,
        },
        TEXTPRO: {
            URL: (slug, params) => `https://api.gifted.co.ke/api/textpro/${slug}?apikey=gifted-api_0u5afg56rfg78tr2t&${params}`,
        },
        PHOTOFUNIA: {
            URL: (slug, params) => `https://api.gifted.co.ke/api/photofunia/${slug}?apikey=gifted-api_0u5afg56rfg78tr2t&${params}`,
        },
        SHORTENER: {
            TINYURL:   (u) => `https://api.gifted.co.ke/api/tools/tinyurl?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
            CLEANURI:  (u) => `https://api.gifted.co.ke/api/tools/cleanuri?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
            REBRANDLY: (u) => `https://api.gifted.co.ke/api/tools/rebrandly?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
            VURL:      (u) => `https://api.gifted.co.ke/api/tools/vurl?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
            ADFOC:     (u) => `https://api.gifted.co.ke/api/tools/adfoc?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
            SSUR:      (u) => `https://api.gifted.co.ke/api/tools/ssur?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(u)}`,
        },
        TEMPGEN: {
            EMAIL_GEN:   (mode) => `https://api.gifted.co.ke/api/tempgen/v2/generate?apikey=gifted-api_0u5afg56rfg78tr2t${mode?'&mode='+encodeURIComponent(mode):''}`,
            EMAIL_INBOX: (email) => `https://api.gifted.co.ke/api/tempgen/v2/inbox?apikey=gifted-api_0u5afg56rfg78tr2t&email=${encodeURIComponent(email)}`,
            SMS_GEN:     (country) => `https://api.gifted.co.ke/api/tempgen/sms/generate?apikey=gifted-api_0u5afg56rfg78tr2t${country?'&country='+encodeURIComponent(country):''}`,
            SMS_INBOX:   (number) => `https://api.gifted.co.ke/api/tempgen/sms/inbox?apikey=gifted-api_0u5afg56rfg78tr2t&number=${encodeURIComponent(number)}`,
        },
        STALK: {
            GITHUB:    (u) => `https://api.gifted.co.ke/api/stalk/gitstalk?apikey=gifted-api_0u5afg56rfg78tr2t&username=${encodeURIComponent(u)}`,
            TWITTER:   (u) => `https://api.gifted.co.ke/api/stalk/twitterstalk?apikey=gifted-api_0u5afg56rfg78tr2t&username=${encodeURIComponent(u)}`,
            WACHANNEL: (url) => `https://api.gifted.co.ke/api/stalk/wachannel?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            IP:        (a) => `https://api.gifted.co.ke/api/stalk/ipstalk?apikey=gifted-api_0u5afg56rfg78tr2t&address=${encodeURIComponent(a)}`,
            NPM:       (p) => `https://api.gifted.co.ke/api/stalk/npmstalk?apikey=gifted-api_0u5afg56rfg78tr2t&packagename=${encodeURIComponent(p)}`,
            TIKTOK:    (u) => `https://api.gifted.co.ke/api/stalk/tiktokstalk?apikey=gifted-api_0u5afg56rfg78tr2t&username=${encodeURIComponent(u)}`,
            INSTAGRAM: (u) => `https://api.gifted.co.ke/api/stalk/igstalk?apikey=gifted-api_0u5afg56rfg78tr2t&username=${encodeURIComponent(u)}`,
        },
        ANIME: {
            NEKO:    () => `https://api.gifted.co.ke/api/anime/neko?apikey=gifted-api_0u5afg56rfg78tr2t`,
            WAIFU:   () => `https://api.gifted.co.ke/api/anime/waifu?apikey=gifted-api_0u5afg56rfg78tr2t`,
            KONACHAN:() => `https://api.gifted.co.ke/api/anime/konachan?apikey=gifted-api_0u5afg56rfg78tr2t`,
            RANDOM:  () => `https://api.gifted.co.ke/api/anime/random?apikey=gifted-api_0u5afg56rfg78tr2t`,
            QUOTES:  () => `https://api.gifted.co.ke/api/anime/quotes?apikey=gifted-api_0u5afg56rfg78tr2t`,
            LOLI:    () => `https://api.gifted.co.ke/api/anime/loli?apikey=gifted-api_0u5afg56rfg78tr2t`,
            MILF:    () => `https://api.gifted.co.ke/api/anime/milf?apikey=gifted-api_0u5afg56rfg78tr2t`,
            HWAIFU:  () => `https://api.gifted.co.ke/api/anime/hwaifu?apikey=gifted-api_0u5afg56rfg78tr2t`,
            HNEKO:   () => `https://api.gifted.co.ke/api/anime/hneko?apikey=gifted-api_0u5afg56rfg78tr2t`,
            MEGUMIN: () => `https://api.gifted.co.ke/api/anime/megumin?apikey=gifted-api_0u5afg56rfg78tr2t`,
            AWOO:    () => `https://api.gifted.co.ke/api/anime/awoo?apikey=gifted-api_0u5afg56rfg78tr2t`,
        },
        TOOLS: {
            VOCAL_REMOVER:    (url) => `https://api.gifted.co.ke/api/tools/vocalremover?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            VOCAL_REMOVER_V2: (url) => `https://api.gifted.co.ke/api/tools/vocalremoverv2?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            NOISE_REMOVER:    (url) => `https://api.gifted.co.ke/api/tools/noiseremover?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            REMOVE_BG:        (url) => `https://api.gifted.co.ke/api/tools/removebg?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            REMOVE_BG_V2:     (url) => `https://api.gifted.co.ke/api/tools/removebgv2?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            REMINI:           (url) => `https://api.gifted.co.ke/api/tools/remini?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            IMG_UPSCALER:     (url, model) => `https://api.gifted.co.ke/api/tools/imageupscaler?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}${model?'&model='+model:''}`,
            IMG_ENHANCER:     (url) => `https://api.gifted.co.ke/api/tools/imageenhancer?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            WATERMARK_RM:     (url) => `https://api.gifted.co.ke/api/tools/watermarkremover?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            MAGIC_ERASER:     (url) => `https://api.gifted.co.ke/api/tools/magiceraser?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            OCR:              (url) => `https://api.gifted.co.ke/api/tools/ocr?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            SS_FULL:          (url) => `https://api.gifted.co.ke/api/tools/fullssweb?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            SS_PHONE:         (url) => `https://api.gifted.co.ke/api/tools/ssphone?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            SS_TAB:           (url) => `https://api.gifted.co.ke/api/tools/sstab?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            SS_PC:            (url) => `https://api.gifted.co.ke/api/tools/sspc?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            EBINARY:          (q) => `https://api.gifted.co.ke/api/tools/ebinary?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            DBINARY:          (q) => `https://api.gifted.co.ke/api/tools/dbinary?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            EBASE64:          (q) => `https://api.gifted.co.ke/api/tools/ebase?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            DBASE64:          (q) => `https://api.gifted.co.ke/api/tools/dbase?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            TTP:              (q) => `https://api.gifted.co.ke/api/tools/ttp?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            FANCY:            (t) => `https://api.gifted.co.ke/api/tools/fancy?apikey=gifted-api_0u5afg56rfg78tr2t&text=${encodeURIComponent(t)}`,
            FANCY_V2:         (t) => `https://api.gifted.co.ke/api/tools/fancyv2?apikey=gifted-api_0u5afg56rfg78tr2t&text=${encodeURIComponent(t)}`,
            EMOJIMIX:         (e1, e2) => `https://api.gifted.co.ke/api/tools/emojimix?apikey=gifted-api_0u5afg56rfg78tr2t&emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
            CREATE_QR:        (q) => `https://api.gifted.co.ke/api/tools/createqr?apikey=gifted-api_0u5afg56rfg78tr2t&query=${encodeURIComponent(q)}`,
            READ_QR:          (url) => `https://api.gifted.co.ke/api/tools/readqr?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            CARBON:           (code) => `https://api.gifted.co.ke/api/tools/carbon?apikey=gifted-api_0u5afg56rfg78tr2t&code=${encodeURIComponent(code)}`,
            CANVAS_CARD:      (title, type, text) => `https://api.gifted.co.ke/api/tools/canvascard?apikey=gifted-api_0u5afg56rfg78tr2t&title=${encodeURIComponent(title)}&type=${type||'spotify'}&text=${encodeURIComponent(text||'')}`,
            QUOTE_GEN:        (text, name, avatar) => `https://api.gifted.co.ke/api/tools/quotegenerator?apikey=gifted-api_0u5afg56rfg78tr2t&text=${encodeURIComponent(text)}&name=${encodeURIComponent(name||'BWM XMD')}${avatar?'&avatar='+encodeURIComponent(avatar):''}`,
            DNS_CHECKER:      (domain) => `https://api.gifted.co.ke/api/tools/dnschecker?apikey=gifted-api_0u5afg56rfg78tr2t&domain=${encodeURIComponent(domain)}`,
            WEB2ZIP:          (url) => `https://api.gifted.co.ke/api/tools/web2zip?apikey=gifted-api_0u5afg56rfg78tr2t&url=${encodeURIComponent(url)}`,
            FREE_PROXY:       () => `https://api.gifted.co.ke/api/tools/freeproxy?apikey=gifted-api_0u5afg56rfg78tr2t`,
        }
    },

    TRANSLATE: (text, to) => `https://apis.keithsite.top/translate?text=${encodeURIComponent(text)}&to=${encodeURIComponent(to)}`,

    SCRIPTS: {
        REMOTE_BASE: 'https://api.github.com/repos/keithghost/REMOTE/contents/Cmds',
        RAW_BASE: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds',
        
        LIST: [
            { name: 'menu', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/menu.js', category: 'general' },
            { name: 'help', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/help.js', category: 'general' },
            { name: 'alive', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/alive.js', category: 'general' },
            { name: 'ping', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/ping.js', category: 'general' },
            { name: 'owner', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/owner.js', category: 'general' },
            { name: 'repo', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/repo.js', category: 'general' },
            { name: 'runtime', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/runtime.js', category: 'general' },
            { name: 'tts', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/tts.js', category: 'tools' },
            { name: 'sticker', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/sticker.js', category: 'media' },
            { name: 'toimg', url: 'https://raw.githubusercontent.com/keithghost/REMOTE/main/Cmds/toimg.js', category: 'media' }
        ],

        getScriptUrl: function(name) {
            const script = this.LIST.find(s => s.name.toLowerCase() === name.toLowerCase());
            return script ? script.url : null;
        },

        getScriptsByCategory: function(category) {
            return this.LIST.filter(s => s.category === category);
        },

        getAllScriptNames: function() {
            return this.LIST.map(s => s.name);
        }
    }
};

module.exports = XMD;
