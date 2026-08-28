// ============ LOG FILTER (Clean neon logs only) ============
const _origLog = console.log, _origWarn = console.warn, _origErr = console.error;
const _blockStr = (s) => {
    if (s.includes('Closing') || s.includes('SessionEntry') || s.includes('prekey') ||
        s.includes('Bad MAC') || s.includes('Session error') || s.includes('Failed to decrypt') ||
        s.includes('SESSION_CIPHER_FAIL') || s.includes('No valid sessions') || s.includes('Session auto-repair') ||
        s.includes('key(s) refreshed') || s.includes('session_cipher') || s.includes('doDecrypt') ||
        s.includes('decryptWithSessions') || s.includes('verifyMAC') || s.includes('libsignal') ||
        s.includes('_asyncQueueExecutor') || s.includes('chainType') || s.includes('messageKeys') ||
        s.includes('closed: -1') || s.includes('registrationId') ||
        s.includes('Decrypted message with closed session')) return true;
    if (s.includes('<Buffer') || s.includes('privKey') || s.includes('pubKey') ||
        s.includes('rootKey') || s.includes('chainKey') || s.includes('ephemeralKeyPair') ||
        s.includes('remoteIdentityKey') || s.includes( 'baseKey') || s.includes('_chains')) return true;
    if (s.includes('PEER_DATA_OPERATION') ||
        s.includes('peerDataOperationRequest') || s.includes('webMessageInfoBytes') ||
        s.includes('placeholderMessageResendResponse') || s.includes('stanzaId') ||
        s.includes('mediaUploadResult')) return true;
    if (s.includes('table ready') || s.includes('tables ready') || s.includes('[CLEANUP]') ||
        s.includes('[DATABASE] Using:') || s.includes('databases initialized') ||
        s.includes('[DEV BYPASS]') || s.includes('[DEBUG]') || s.includes('[GroupEvents]') ||
        s.includes('Message skipped') || s.includes('[SubBotManager]') ||
        s.includes('GPT Conversations table') || s.includes('Message sent →') ||
        s.includes('Message sent ') || s.includes('Session files already exist') ||
        s.includes('Session Error') || s.includes('BWM-XMD CONNECTED') ||
        s.includes('Bot identity set') || s.includes('Sudo number already')) return true;
    if (s.includes('MaxListenersExceededWarning') || s.includes('MaxListeners is') ||
        s.includes('Use emitter.setMaxListeners')) return true;
    if (s.includes('at Object.') || s.includes('at async') || s.includes('at Session') ||
        s.includes('node_modules/') || s.includes('    at ')) return true;
    return false;
};
const _blockAny = (m) => {
    if (m === undefined || m === null) return false;
    if (typeof m === 'object') {
        if (Buffer.isBuffer(m)) return true;
        if (m._chains || m.registrationId || m.currentRatchet || m.indexInfo || m.pubKey || m.privKey || m.chainKey || m.rootKey) return true;
        try { const j = JSON.stringify(m); if (j && _blockStr(j)) return true; } catch(e) {}
        return false;
    }
    if (typeof m === 'string') return _blockStr(m);
    return false;
};
const _filterLog = (fn) => (...a) => {
    for (const arg of a) { if (_blockAny(arg)) return; }
    const full = a.map(x => typeof x === 'string' ? x : '').join(' ');
    if (full && _blockStr(full)) return;
    fn.apply(console, a);
};
console.log = _filterLog(_origLog);
console.warn = _filterLog(_origWarn);
console.error = _filterLog(_origErr);
const _origStdout = process.stdout.write.bind(process.stdout);
const _origStderr = process.stderr.write.bind(process.stderr);
process.stdout.write = (chunk, ...rest) => {
    if (typeof chunk === 'string' && _blockStr(chunk)) return true;
    return _origStdout(chunk, ...rest);
};
process.stderr.write = (chunk, ...rest) => {
    if (typeof chunk === 'string' && _blockStr(chunk)) return true;
    return _origStderr(chunk, ...rest);
};

// ============ AUTO-FIX MODULE HANDLER (Lines 1-45) ============
const { execSync } = require('child_process');

function autoFixModules(errorMessage) {
    const missingModules = {
        '@whiskeysockets/baileys': 'npm:xmd-baileys@1.0.35',
        'wa-sticker-formatter': 'wa-sticker-formatter',
        'sharp': 'sharp',
        'fluent-ffmpeg': 'fluent-ffmpeg',
        'jimp': 'jimp@0.16.13',
        'axios': 'axios',
        'express': 'express',
        'sequelize': 'sequelize',
        'pino': 'pino',
        'qrcode-terminal': 'qrcode-terminal',
        '@hapi/boom': '@hapi/boom',
        'fs-extra': 'fs-extra',
        'form-data': 'form-data',
        'file-type': 'file-type'
    };

    for (const [moduleName, installName] of Object.entries(missingModules)) {
        if (errorMessage.includes(moduleName)) {
            console.log(`[BWM-XMD] Auto-fixing: Installing ${moduleName}...`);
            try {
                execSync(`npm install ${installName}`, { stdio: 'inherit', timeout: 120000 });
                console.log(`[BWM-XMD] Successfully installed ${moduleName}`);
                console.log(`[BWM-XMD] Restarting bot in 3s...`);
                setTimeout(() => {
                    const { spawn } = require('child_process');
                    const child = spawn(process.argv[0], process.argv.slice(1), {
                        stdio: 'inherit',
                        cwd: process.cwd(),
                        env: process.env
                    });
                    child.on('exit', () => process.exit(0));
                }, 3000);
                return;
            } catch (installErr) {
                console.log(`[BWM-XMD] Failed to auto-install ${moduleName}: ${installErr.message}`);
            }
        }
    }
}

process.on('uncaughtException', (err) => {
    if (err.message?.includes("Cannot find module")) {
        autoFixModules(err.message);
    }
});
// ============ END AUTO-FIX MODULE HANDLER ============

const { 
    default: bwmConnect, 
    isJidGroup, 
    jidNormalizedUser,
    isJidBroadcast,
    downloadMediaMessage, 
    downloadContentFromMessage,
    downloadAndSaveMediaMessage, 
    DisconnectReason, 
    getContentType,
    fetchLatestBaileysVersion, 
    useMultiFileAuthState, 
    makeCacheableSignalKeyStore,
    jidDecode 
} = require("@whiskeysockets/baileys");

const { 
    bwmStore,
    loadSession,
    bwmBuffer, 
    bwmJson, 
    formatAudio, 
    bwmRandom,
    formatVideo,
    verifyJidState
} = require("./adams/lib/botFunctions");

const { 
    wrapClientWithAntiBan, 
    sleep: antiBanSleep, 
    getRandomDelay,
    ANTI_BAN_CONFIG 
} = require("./adams/lib/antiBan");

const { getSudoNumbers, setSudo, delSudo, isSudo } = require("./adams/database/sudo");

const { session, dev, BOT } = require("./config");
const XMD = require("./adams/xmd");

const BOT_NAME = BOT || 'BWM XMD';
const NEWSLETTER_JID = XMD.NEWSLETTER_JID;


const getGlobalContextInfo = () => {
    if (botSettings?.hideViewChannel === 'on') return {};
    return XMD.getContextInfo(botSettings?.botname);
};

const { bwmxmd, commands, evt } = require("./adams/commandHandler");
const { 
    Sticker, 
    createSticker, 
    StickerTypes 
} = require("wa-sticker-formatter");
const BwmLogger = require('./adams/logger');
const pino = require("pino");
//const { dev, database, sessionName, session } = require("./settings");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { Boom } = require("@hapi/boom");
const express = require("express");
const { promisify } = require('util');
const stream = require('stream');
const FormData = require('form-data');
const pipeline = promisify(stream.pipeline);

//========================================================================================================================
// Global Error Handlers & Auto-Restart
//========================================================================================================================
//========================================================================================================================
// Global settings variable
let botSettings = {};
const RECONNECT_DELAY = 5000;

// ── Fast in-memory settings cache ────────────────────────────────────────────
// Stable settings (sudo, read, react, greet, presence, status) are cached for
// the full bot session — same approach as lidPhoneCache for groups.
// Group metadata and per-group settings use 30s TTL since members/admins change.
const _settingsCache = new Map();
const _SESSION_TTL = 86400000; // 24 h — effectively session-persistent
const _SHORT_TTL   = 30000;    // 30 s  — for data that changes often (group meta)

// Keys whose values rarely change — cache them for the entire session
const _STABLE_KEYS = new Set([
    'sudoNumbers',
    // NOTE: presenceSettings, greetSettings, autoReadSettings, autoReactSettings,
    // antiDeleteSettings, globalGroupSettings intentionally NOT here so commands
    // take effect within 30 seconds without restart
]);

function _ttlFor(key) {
    if (_STABLE_KEYS.has(key)) return _SESSION_TTL;
    return _SHORT_TTL;
}

async function cachedCall(key, fn) {
    const hit = _settingsCache.get(key);
    if (hit && (Date.now() - hit.ts < _ttlFor(key))) return hit.val;
    const val = await fn();
    _settingsCache.set(key, { val, ts: Date.now() });
    return val;
}

// Call this after any settings update so the cache doesn't serve stale data.
function invalidateSettingsCache(key) {
    if (key) _settingsCache.delete(key);
    else _settingsCache.clear();
}
// ─────────────────────────────────────────────────────────────────────────────

// Bot identity for multi-bot database isolation
// Each main bot uses its own phone number as bot_id, or BOT_ID env var if set
let mainBotId = process.env.BOT_ID || 'main';

// Connection ready flag - prevents processing old/history messages before bot is fully connected
let isConnectionReady = false;
let connectionOpenTimestamp = 0;
let _preKeyRefreshInterval = null;

// Message deduplication to prevent double responses from multi-device
const processedMessageIds = new Set();
const MESSAGE_CACHE_EXPIRY = 60000; // 1 minute

function isMessageProcessed(messageId) {
    if (processedMessageIds.has(messageId)) {
        return true;
    }
    processedMessageIds.add(messageId);
    setTimeout(() => {
        processedMessageIds.delete(messageId);
    }, MESSAGE_CACHE_EXPIRY);
    return false;
}

let _settingsLogShown = false;
async function loadBotSettings() {
    try {
        botSettings = await getSettings(mainBotId);
        if (botSettings.hideViewChannel !== 'on' && mainBotId !== 'main') {
            try {
                const mainRow = await getSettings('main');
                if (mainRow.hideViewChannel === 'on') {
                    botSettings.hideViewChannel = 'on';
                    updateSettings({ hideViewChannel: 'on' }, mainBotId).catch(() => {});
                }
            } catch (_e) {}
        }
        XMD.setHideViewChannel(botSettings.hideViewChannel);
        if (!_settingsLogShown) {
            BwmLogger._lastSpinnerMsg = 'Loading command plugins...';
            BwmLogger.stopSpinner('Bot settings loaded');
            _settingsLogShown = true;
        }
    } catch (error) {
        BwmLogger.error('Error loading bot settings:', error);
        botSettings = {
            prefix: ".",
            author: "Ibrahim Adams",
            url: "./adams/public/bot-image.jpg",
            gurl: XMD.GURL,
            timezone: "Africa/Nairobi",
            botname: "BWM-XMD",
            packname: "BWM-XMD",
            mode: "public"
        };
    }
}

let isRestarting = false;

async function gracefulRestart(reason) {
    if (isRestarting) return;
    isRestarting = true;
    
    const BwmLoggerRestart = require('./adams/logger');
    BwmLoggerRestart.warning(`Auto-recovery: ${reason} — restarting in ${RECONNECT_DELAY/1000}s`);
    
    setTimeout(() => {
        isRestarting = false;
        startBwmxmd().catch(err => {
            console.error('[AUTO-RECOVERY] Restart failed:', err.message);
            gracefulRestart('Restart failed, trying again...');
        });
    }, RECONNECT_DELAY);
}

process.on('uncaughtException', (err) => {
    const _L = require('./adams/logger');
    if (err.message?.includes('rate-overlimit') || err.data === 429) {
        _L.warning('Rate limit detected — continuing...');
    } else if (err.message?.includes('EADDRINUSE')) {
        _L.warning('Port in use — skipping restart');
    } else if (err.message?.includes('Connection') || err.message?.includes('socket')) {
        _L.error('Connection error: ' + err.message);
        gracefulRestart('Connection error');
    } else {
        _L.error('Uncaught: ' + err.message);
        gracefulRestart('Unexpected error');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    const _L = require('./adams/logger');
    if (reason?.message?.includes('rate-overlimit') || reason?.data === 429) {
        _L.warning('Rate limit detected — continuing...');
    } else if (reason?.message?.includes('SESSION_NOT_FOUND')) {
        _L.error('Session not found — please configure in config.env');
    } else {
        _L.error('Rejection: ' + (reason?.message || reason));
        if (!isRestarting) {
            gracefulRestart('Unhandled promise rejection');
        }
    }
});

process.on('SIGTERM', () => {
    const _L = require('./adams/logger');
    _L.connection('close', 'Shutting down (SIGTERM)');
    process.exit(0);
});

process.on('SIGINT', () => {
    const _L = require('./adams/logger');
    _L.connection('close', 'Shutting down (SIGINT)');
    process.exit(0);
});

//========================================================================================================================
// Database Imports
//========================================================================================================================
const { initAntiDeleteDB, getAntiDeleteSettings } = require('./adams/database/antidelete');
const { getGreetSettings, initGreetDB, repliedContacts, updateGreetSettings } = require('./adams/database/greet');
const { initAutoStatusDB, getAutoStatusSettings, updateAutoStatusSettings } = require('./adams/database/autostatus');

const { getAutoReadSettings, initAutoReadDB } = require('./adams/database/autoread');
const { getAutoReactSettings, initAutoReactDB, updateAutoReactSettings } = require('./adams/database/autoreact');
const { initSettingsDB, getSettings, updateSettings, getSetting } = require('./adams/database/settings');
const { initAutoBioDB, getAutoBioSettings, updateAutoBioSettings } = require('./adams/database/autobio');
const { initAntiLinkDB, getAntiLinkSettings, updateAntiLinkSettings, getWarnCount, incrementWarnCount, resetWarnCount, clearAllWarns } = require('./adams/database/antilink');
const { initAntiStatusMentionDB, getAntiStatusMentionSettings, updateAntiStatusMentionSettings, getStatusWarnCount, incrementStatusWarnCount, resetStatusWarnCount, clearAllStatusWarns } = require('./adams/database/antistatusmention');
const { initPresenceDB } = require('./adams/database/presence');
const { initChatbotDB, saveConversation, getConversationHistory, clearConversationHistory, getLastConversation, getChatbotSettings, updateChatbotSettings, availableVoices } = require('./adams/database/chatbot');
const { initGroupEventsDB, getGroupEventsSettings } = require('./adams/database/groupevents');
const { initAntiCallDB, getAntiCallSettings } = require('./adams/database/anticall');
const { GLOBAL_KEY, initGroupSettingsDB, getGroupSettings, getGlobalGroupSettings, updateGroupSettings, updateGlobalGroupSettings, getGroupWarnCount, incrementGroupWarnCount, resetGroupWarnCount, clearGroupWarns, getGroupTagWarnCount, incrementGroupTagWarnCount, resetGroupTagWarnCount, clearGroupTagWarns } = require('./adams/database/groupsettings');
const { initSubBotSettingsDB } = require('./adams/database/subbotSettings');
//const { getAutoDownloadStatusSettings, initAutoDownloadStatusDB } = require('./database/autodownloadstatus');
// Initialize all databases
async function initializeDatabases() {
    try {
        BwmLogger._lastSpinnerMsg = 'Loading bot settings...';
        BwmLogger.startSpinner('Syncing databases to PostgreSQL...');
        await initSettingsDB();
        await initAntiDeleteDB();
        await initGreetDB();
        
        await initAutoStatusDB();
        const envReply = process.env.AUTO_STATUS_REPLY;
        if (envReply && (envReply.toLowerCase() === 'off' || envReply.toLowerCase() === 'false')) {
            await updateAutoStatusSettings({ autoReplyStatus: 'false' });
        }
        await initAutoReadDB();
        await initAutoBioDB();
        await initAntiLinkDB();
        await initAntiStatusMentionDB();
      //  await initAntiSpamDB();
        await initAutoReactDB();
        await initPresenceDB();
        await initChatbotDB();
        await initGroupEventsDB();
        await initAntiCallDB();
        await initGroupSettingsDB();
        
        // Import SubBots here or ensure it's defined
        const { initSubBotsDB } = require('./adams/database/subbots');
        await initSubBotsDB();
        await initSubBotSettingsDB();
       // await initAutoDownloadStatusDB();
        BwmLogger._lastSpinnerMsg = 'Loading bot settings...';
        BwmLogger.stopSpinner('All databases synced');
        
        // Start database cleanup scheduler (runs every 6 hours)
        const { startCleanupScheduler } = require('./adams/database/cleanup');
        startCleanupScheduler({
            SubBots: require('./adams/database/subbots').SubBots,
            SubBotSettings: require('./adams/database/subbotSettings').SubBotSettings
        }, 6);
    } catch (error) {
        console.error('Error initializing databases:', error);
    }
}

initializeDatabases().catch(console.error);
//========================================================================================================================
const plugins = commands.filter(cmd => !cmd.dontAddCommandList).length;

//========================================================================================================================
// Chatbot Functions
//========================================================================================================================

// API call to BWM AI Text
async function getAIResponse(message, userJid) {
    try {
        const history = await getConversationHistory(userJid, 5);
        
        let context = '';
        if (history.length > 0) {
            context = history.map(conv => 
                `User: ${conv.user}\nAI: ${conv.ai}`
            ).join('\n') + '\n';
        }

        const systemPrompt = `[System: You are BWM XMD, a WhatsApp AI assistant made by Ibrahim Adams. You are NOT Keith AI and NOT made by Keithkeizzah. Only mention your name or creator if the user asks who you are or who made you. Otherwise just reply naturally without introducing yourself.]\n`;
        const fullMessage = systemPrompt + context + `Current: ${message}`;
        
        // Try primary API: Gemini
        try {
            const geminiRes = await axios.get(`https://api.bk9.dev/ai/gemini?q=${encodeURIComponent(fullMessage)}`, { timeout: 15000 });
            if (geminiRes.data && geminiRes.data.status && geminiRes.data.BK9) {
                return geminiRes.data.BK9;
            }
        } catch (e) {
            console.error('Gemini API failed, trying Llama...', e.message);
        }

        // Try secondary API: Llama
        try {
            const llamaRes = await axios.get(`https://api.bk9.dev/ai/llama?q=${encodeURIComponent(fullMessage)}`, { timeout: 15000 });
            if (llamaRes.data && llamaRes.data.status && llamaRes.data.BK9) {
                return llamaRes.data.BK9;
            }
        } catch (e) {
            console.error('Llama API failed, trying Keith API fallback...', e.message);
        }

        // Fallback: Keith API
        const response = await axios.get(XMD.API.AI.CHAT(fullMessage));
        if (response.data.status && response.data.result) {
            return response.data.result;
        } else {
            console.error('All chatbot APIs failed');
            return "I'm sorry, I couldn't process your message right now.";
        }
    } catch (error) {
        console.error('Chatbot API error:', error);
        return "I'm having trouble connecting right now. Please try again later.";
    }
}

// Text-to-Speech using Google Translate TTS
async function getAIAudioResponse(message, voice = 'en') {
    try {
        const maxLen = 200;
        const textToSpeak = message.length > maxLen ? message.substring(0, maxLen) : message;
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=en&client=tw-ob`;
        const audioBuffer = await axios.get(ttsUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (audioBuffer.data && audioBuffer.data.byteLength > 0) {
            return {
                buffer: Buffer.from(audioBuffer.data),
                text: message
            };
        }
        // Fallback to Keith API
        const response = await axios.get(XMD.API.AI.TEXT2SPEECH(message, voice), { timeout: 10000 });
        if (response.data.status && response.data.result && response.data.result.URL) {
            return {
                url: response.data.result.URL,
                text: message
            };
        }
        console.error('All Audio APIs failed');
        return null;
    } catch (error) {
        console.error('Chatbot Audio API error:', error.message);
        // Fallback to Keith API
        try {
            const response = await axios.get(XMD.API.AI.TEXT2SPEECH(message, voice), { timeout: 10000 });
            if (response.data.status && response.data.result && response.data.result.URL) {
                return { url: response.data.result.URL, text: message };
            }
        } catch (e) {
            console.error('Keith TTS fallback also failed:', e.message);
        }
        return null;
    }
}

// API call to BWM AI Text-to-Video
async function getAIVideoResponse(message) {
    try {
        const response = await axios.get(XMD.API.AI.TEXT2VIDEO(message));
        
        if (response.data.success && response.data.results) {
            return {
                url: response.data.results,
                text: `Generated video for: ${message}`
            };
        } else {
            console.error('Video API returned invalid response:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Chatbot Video API error:', error);
        return null;
    }
}

// API call to BWM AI Image Generation (Flux)
async function getAIImageResponse(message) {
    try {
        const response = await axios.get(XMD.API.AI.FLUX(message));
        
        // Since Flux returns image directly, we use the API URL as image source
        return {
            url: XMD.API.AI.FLUX(message),
            text: `Generated image for: ${message}`
        };
    } catch (error) {
        console.error('Chatbot Image API error:', error);
        return null;
    }
}

// API call to BWM AI Vision Analysis
async function getAIVisionResponse(imageUrl, question) {
    try {
        const response = await axios.get(XMD.API.AI.GEMINI_VISION(imageUrl, question));
        
        if (response.data.status && response.data.result) {
            return response.data.result;
        } else {
            console.error('Vision API returned invalid response:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Chatbot Vision API error:', error);
        return null;
    }
}

// Download media and convert to buffer
async function downloadMedia(mediaUrl) {
    try {
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Error downloading media:', error);
        return null;
    }
}

// Get direct image URL from WhatsApp message
function getImageUrl(message) {
    if (message?.imageMessage) {
        return message.imageMessage.url;
    }
    return null;
}

// Chatbot detection and response
async function handleChatbot(client, message, from, sender, isGroup, isSuperUser, quoted) {
    try {
        const settings = await getChatbotSettings();
        
        // Skip if chatbot is off
        if (settings.status === 'off') return;

        // Check mode restrictions
        if (settings.mode === 'private' && isGroup) return;
        if (settings.mode === 'group' && !isGroup) return;

        const text = message?.conversation || 
                    message?.extendedTextMessage?.text || 
                    message?.imageMessage?.caption || '';

        // Check for image message for vision analysis
        if (message?.imageMessage && text && (text.toLowerCase().includes('analyze') || text.toLowerCase().includes('what') || text.toLowerCase().includes('describe') || text.toLowerCase().includes('vision'))) {
            return await handleVisionAnalysis(client, message, from, sender, quoted);
        }

        if (!text) return;

        // Check trigger and determine response type
        let shouldRespond = false;
        let responseType = settings.default_response;
        let cleanMessage = text;
        
        if (settings.trigger === 'dm') {
            if (isGroup) {
                const botMention = `@${client.user.id.split(':')[0]}`;
                if (text.includes(botMention)) {
                    shouldRespond = true;
                    cleanMessage = text.replace(botMention, '').trim();
                    const detected = determineResponseType(cleanMessage);
                    responseType = detected !== 'text' ? detected : settings.default_response || 'text';
                    cleanMessage = cleanMessage.replace(/audio|voice|video|image|generate/gi, '').trim();
                }
            } else {
                shouldRespond = true;
                const detected = determineResponseType(cleanMessage);
                responseType = detected !== 'text' ? detected : settings.default_response || 'text';
                cleanMessage = cleanMessage.replace(/audio|voice|video|image|generate/gi, '').trim();
            }
        } else {
            shouldRespond = true;
            const detected = determineResponseType(cleanMessage);
            responseType = detected !== 'text' ? detected : settings.default_response || 'text';
            cleanMessage = cleanMessage.replace(/audio|voice|video|image|generate/gi, '').trim();
        }

        if (!shouldRespond || !cleanMessage) return;

        // Handle different response types
        switch (responseType) {
            case 'audio':
                await handleAudioResponse(client, from, sender, cleanMessage, settings.voice, quoted || message);
                break;
            case 'video':
                await handleVideoResponse(client, from, sender, cleanMessage, quoted || message);
                break;
            case 'image':
                await handleImageResponse(client, from, sender, cleanMessage, quoted || message);
                break;
            default:
                await handleTextResponse(client, from, sender, cleanMessage, quoted || message);
                break;
        }

    } catch (error) {
        console.error('Chatbot handler error:', error);
    }
}

// Determine response type based on message content
function determineResponseType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('video') || lowerMessage.includes('generate video')) {
        return 'video';
    } else if (lowerMessage.includes('image') || lowerMessage.includes('generate image') || lowerMessage.includes('picture')) {
        return 'image';
    } else if (lowerMessage.includes('audio') || lowerMessage.includes('voice')) {
        return 'audio';
    }
    return 'text';
}

// Handle text response
async function handleTextResponse(client, from, sender, message, quoted) {
    const aiResponse = await getAIResponse(message, sender);
    await client.sendMessage(from, { 
        text: aiResponse,
        contextInfo: {
            ...getGlobalContextInfo(),
            externalAdReply: {
                title: "AI Chat Assistant",
                body: "BWM-XMD Bot Support",
                thumbnailUrl: "https://files.catbox.moe/bkuj17.jpg",
                sourceUrl: "https://github.com/Bwmxmd254/BWM-XMD-GO",
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }, { 
        quoted: quoted 
    });
    await saveConversation(sender, message, aiResponse, 'text');
}

// Handle audio response - Get AI response first, then convert to audio
async function handleAudioResponse(client, from, sender, message, voice, quoted) {
    try {
        const aiTextResponse = await getAIResponse(message, sender);
        
        const audioData = await getAIAudioResponse(aiTextResponse, voice);
        
        if (audioData) {
            let audioBuffer = audioData.buffer || null;
            if (!audioBuffer && audioData.url) {
                audioBuffer = await downloadMedia(audioData.url);
            }
            if (audioBuffer) {
                await client.sendMessage(from, {
                    audio: audioBuffer,
                    ptt: true,
                    mimetype: 'audio/mpeg',
                    contextInfo: {
                        ...getGlobalContextInfo(),
                        externalAdReply: {
                            title: "AI Voice Assistant",
                            body: "BWM-XMD Bot Support",
                            thumbnailUrl: "https://files.catbox.moe/bkuj17.jpg",
                            sourceUrl: "https://github.com/Bwmxmd254/BWM-XMD-GO",
                            mediaType: 1,
                            renderLargerThumbnail: false
                        }
                    }
                }, { 
                    quoted: quoted 
                });
                await saveConversation(sender, message, aiTextResponse, 'audio');
                return;
            }
        }
        
        // Fallback to text if audio fails
        console.error('Audio generation failed, falling back to text response');
        await client.sendMessage(from, { 
            text: aiTextResponse,
            contextInfo: {
                ...getGlobalContextInfo(),
                externalAdReply: {
                    title: "AI Message Assistant",
                    body: "BWM-XMD Bot Support",
                    thumbnailUrl: "https://files.catbox.moe/bkuj17.jpg",
                    sourceUrl: "https://github.com/Bwmxmd254/BWM-XMD-GO",
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { 
            quoted: quoted 
        });
        await saveConversation(sender, message, aiTextResponse, 'text');
        
    } catch (error) {
        console.error('Audio response error:', error);
        // Fallback to text on error
        await handleTextResponse(client, from, sender, message, quoted);
    }
}

// Handle video response
async function handleVideoResponse(client, from, sender, message, quoted) {
    const videoData = await getAIVideoResponse(message);
    
    if (videoData && videoData.url) {
        const videoBuffer = await downloadMedia(videoData.url);
        if (videoBuffer) {
            await client.sendMessage(from, {
                video: videoBuffer,
                caption: `🎥 ${videoData.text}`,
                contextInfo: {
                    ...getGlobalContextInfo(),
                    externalAdReply: {
                        title: "AI Video Assistant",
                        body: "BWM-XMD Bot Support",
                        thumbnailUrl: "https://files.catbox.moe/bkuj17.jpg",
                        sourceUrl: "https://github.com/Bwmxmd254/BWM-XMD-GO",
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { 
                quoted: quoted 
            });
            await saveConversation(sender, message, videoData.text, 'video', videoData.url);
            return;
        }
    }
    
    console.error('Video generation failed for message:', message);
    // Don't send error message to chat
}

// Handle image response
async function handleImageResponse(client, from, sender, message, quoted) {
    const imageData = await getAIImageResponse(message);
    
    if (imageData && imageData.url) {
        const imageBuffer = await downloadMedia(imageData.url);
        if (imageBuffer) {
            await client.sendMessage(from, {
                image: imageBuffer,
                caption: `🖼️ ${imageData.text}`,
                contextInfo: {
                    ...getGlobalContextInfo(),
                    externalAdReply: {
                        title: "AI Image Assistant",
                        body: "BWM-XMD Bot Support",
                        thumbnailUrl: "https://files.catbox.moe/bkuj17.jpg",
                        sourceUrl: "https://github.com/Bwmxmd254/BWM-XMD-GO",
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { 
                quoted: quoted 
            });
            await saveConversation(sender, message, imageData.text, 'image', imageData.url);
            return;
        }
    }
    
    console.error('Image generation failed for message:', message);
    // Don't send error message to chat
}

// Handle vision analysis - SIMPLIFIED: Use direct image URL
async function handleVisionAnalysis(client, message, from, sender, quoted) {
    try {
        const imageUrl = getImageUrl(message);
        
        if (!imageUrl) {
            console.error('No image found for vision analysis');
            return;
        }

        const question = message.imageMessage.caption || "What's in this image?";
        const visionResponse = await getAIVisionResponse(imageUrl, question);
        
        if (visionResponse) {
            await client.sendMessage(from, { 
                text: `🔍 Vision Analysis:\n\n${visionResponse}`,
                contextInfo: {
                    ...getGlobalContextInfo(),
                    externalAdReply: {
                        title: "AI Vision Assistant",
                        body: "BWM-XMD Bot Support",
                        thumbnailUrl: "https://files.catbox.moe/bkuj17.jpg",
                        sourceUrl: "https://github.com/Bwmxmd254/BWM-XMD-GO",
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { 
                quoted: quoted 
            });
            await saveConversation(sender, question, visionResponse, 'vision', imageUrl);
        } else {
            console.error('Vision analysis failed for image:', imageUrl);
            // Don't send error message to chat
        }
    } catch (error) {
        console.error('Vision analysis error:', error);
        // Don't send error message to chat
    }
}

            
// Anti Status Mention Functions
//========================================================================================================================

// Check for status mention messages
function isStatusMention(message) {

    return !!message?.groupStatusMentionMessage;

}

// Helper to get participant name from group
async function getParticipantName(client, groupJid, participantJid, fallbackName) {
    try {
        if (fallbackName && fallbackName !== 'User') return fallbackName;
        const groupMeta = await client.groupMetadata(groupJid);
        if (groupMeta?.participants) {
            const found = groupMeta.participants.find(p => 
                p.id === participantJid || 
                p.pn === participantJid ||
                p.id?.split('@')[0] === participantJid?.split('@')[0] ||
                p.pn?.split('@')[0] === participantJid?.split('@')[0]
            );
            if (found?.notify) return found.notify;
            if (found?.name) return found.name;
        }
    } catch (e) {}
    return fallbackName || 'User';
}

// Anti Status Mention detection function
async function detectAndHandleStatusMention(client, message, isBotAdmin, isAdmin, isSuperAdmin, isSuperUser) {
    try {
        if (!message?.message || message.key.fromMe) return;
        
        const from = message.key.remoteJid; 
        const sender = message.key.participant || message.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        if (!isGroup) return;

        const groupSettings = await getGroupSettings(from);
        if (groupSettings.antitagStatus === 'off') return;
        
        if (XMD.isDev(sender)) return;
        if (isAdmin || isSuperAdmin || isSuperUser) return;

        if (!isStatusMention(message.message)) return;

        if (!isBotAdmin) {
            await client.sendMessage(from, { 
                text: `⚠️ Status mention detected! Promote me to admin to take action.`,
                contextInfo: getGlobalContextInfo()
            });
            return;
        }

        await client.sendMessage(from, { delete: message.key });

        if (groupSettings.antitagAction === 'remove') {
            await client.groupParticipantsUpdate(from, [sender], 'remove');
            await client.sendMessage(from, { 
                text: `🚫 A member was removed for sending status mention!`,
                contextInfo: getGlobalContextInfo()
            });
            resetGroupTagWarnCount(from, sender);
        } 
        else if (groupSettings.antitagAction === 'delete') {
            await client.sendMessage(from, { 
                text: `🗑️ Status mention deleted!`,
                contextInfo: getGlobalContextInfo()
            });
        } 
        else if (groupSettings.antitagAction === 'warn') {
            const warnCount = incrementGroupTagWarnCount(from, sender);
            
            if (warnCount >= groupSettings.antitagWarnLimit) {
                await client.groupParticipantsUpdate(from, [sender], 'remove');
                await client.sendMessage(from, { 
                    text: `🚫 A member was removed after ${warnCount} warnings for status mentions!`,
                    contextInfo: getGlobalContextInfo()
                });
                resetGroupTagWarnCount(from, sender);
            } else {
                await client.sendMessage(from, { 
                    text: `⚠️ Warning ${warnCount}/${groupSettings.antitagWarnLimit}! No status mentions allowed!`,
                    contextInfo: getGlobalContextInfo()
                });
            }
        }

    } catch (error) {
        console.error('Anti-status-mention error:', error);
    }
}

function isAnyLink(text) {

    if (!text) return false;

    const linkPattern = /https?:\/\/[^\s]+/gi;

    return linkPattern.test(text);

}

//
async function detectAndHandleLinks(client, message, isBotAdmin, isAdmin, isSuperAdmin, isSuperUser) {
    try {
        if (!message?.message || message.key.fromMe) return;
        
        const from = message.key.remoteJid; 
        const sender = message.key.participant || message.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        if (!isGroup) return;

        const groupSettings = await getGroupSettings(from);
        if (groupSettings.antilinkStatus === 'off') return;
        
        if (XMD.isDev(sender)) return;
        if (isAdmin || isSuperAdmin || isSuperUser) return;

        const text = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || 
                    message.message?.imageMessage?.caption || '';

        if (!text || !isAnyLink(text)) return;

        const senderName = await getParticipantName(client, from, sender, message.pushName);

        if (!isBotAdmin) {
            await client.sendMessage(from, { 
                text: `⚠️ Link detected! Promote me to admin to take action.`,
                contextInfo: getGlobalContextInfo()
            });
            return;
        }

        await client.sendMessage(from, { delete: message.key });

        if (groupSettings.antilinkAction === 'remove') {
            await client.groupParticipantsUpdate(from, [sender], 'remove');
            await client.sendMessage(from, { 
                text: `🚫 A member was removed for sending links!`,
                contextInfo: getGlobalContextInfo()
            });
            resetGroupWarnCount(from, sender);
        } 
        else if (groupSettings.antilinkAction === 'delete') {
            await client.sendMessage(from, { 
                text: `🗑️ Link deleted!`,
                contextInfo: getGlobalContextInfo()
            });
        } 
        else if (groupSettings.antilinkAction === 'warn') {
            const warnCount = incrementGroupWarnCount(from, sender);
            
            if (warnCount >= groupSettings.antilinkWarnLimit) {
                await client.groupParticipantsUpdate(from, [sender], 'remove');
                await client.sendMessage(from, { 
                    text: `🚫 A member was removed after ${warnCount} warnings for sending links!`,
                    contextInfo: getGlobalContextInfo()
                });
                resetGroupWarnCount(from, sender);
            } else {
                await client.sendMessage(from, { 
                    text: `⚠️ Warning ${warnCount}/${groupSettings.antilinkWarnLimit}! No links allowed!`,
                    contextInfo: getGlobalContextInfo()
                });
            }
        }

    } catch (error) {
        console.error('Anti-link error:', error);
    }
}
                    
     
        
//========================================================================================================================
//========================================================================================================================

const PORT = process.env.PORT || 5000;
const app = express();
let client;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, "adams/public");
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

app.use(express.static("adams/public"));
app.use(express.json());
app.get("/", (req, res) => res.sendFile(__dirname + "/adams/public/index.html"));

// Sub-bot deployment routes
const { deployNewBot, getActiveBotsCount, initializeAllSubBots } = require('./adams/subBotManager');
const { initSubBotsDB, getAllSubBots } = require('./adams/database/subbots');

app.get("/xmd", (req, res) => res.sendFile(__dirname + "/adams/public/xmd.html"));

app.post("/xmd/deploy", async (req, res) => {
    try {
        const { session } = req.body;
        if (!session || session.trim().length < 10) {
            return res.json({ success: false, message: 'Invalid session ID' });
        }
        
        const result = await deployNewBot(session.trim());
        res.json(result);
    } catch (error) {
        console.error('Deploy endpoint error:', error);
        res.json({ success: false, message: 'Server error. Please try again.' });
    }
});

app.get("/xmd/stats", async (req, res) => {
    try {
        const { getResourceStats } = require('./adams/subBotManager');
        const allBots = await getAllSubBots();
        const connectedFromDB = allBots.filter(b => b.status === 'connected').length;
        const activeCount = getActiveBotsCount();
        const resources = getResourceStats();
        
        res.json({ 
            activeBots: connectedFromDB > 0 ? connectedFromDB : activeCount,
            totalBots: allBots.length,
            pendingBots: allBots.filter(b => b.status === 'pending').length,
            resources: {
                memoryMB: resources.memoryUsedMB,
                maxMemoryMB: resources.maxMemoryMB,
                maxBots: resources.maxBots,
                canAcceptMore: resources.canAcceptMore
            }
        });
    } catch (error) {
        console.error('[/xmd/stats] Error:', error.message);
        res.json({ activeBots: getActiveBotsCount(), totalBots: 0 });
    }
});

app.post("/xmd/pair", async (req, res) => {
    try {
        const { number } = req.body;
        if (!number || number.length < 10) {
            return res.json({ success: false, message: 'Invalid phone number' });
        }
        
        const cleanNumber = number.replace(/\D/g, '');
        const response = await axios.get(XMD.SESSION_SCANNER(cleanNumber));
        
        if (response.data && response.data.code) {
            res.json({ 
                success: true, 
                code: response.data.code,
                message: 'Pairing code generated successfully'
            });
        } else {
            res.json({ success: false, message: 'Failed to generate pairing code' });
        }
    } catch (error) {
        console.error('Pair endpoint error:', error);
        res.json({ success: false, message: 'Failed to generate code. Please try again.' });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    BwmLogger._lastSpinnerMsg = 'Syncing databases...';
    BwmLogger.stopSpinner('Web server started on port ' + PORT);
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        BwmLogger.warning(`Port ${PORT} already in use`);
    } else {
        console.error('[SERVER] Error:', err.message);
    }
});

const sessionDir = path.join(__dirname, "session");

BwmLogger._lastSpinnerMsg = 'Starting web server...';
BwmLogger.startSpinner('Loading WhatsApp session...');
loadSession().catch(() => {});

let store; 
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;

async function startBwmxmd() {
    try {
        // Load settings before starting
        await loadBotSettings();
        
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        if (store) {
            store.destroy();
        }
        store = new bwmStore();
        
        const bwmSock = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['BWM-XMD', "safari", "1.0.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return { conversation: 'Error occurred' };
            },
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            generateHighQualityLinkPreview: false,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage ||
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            }
        };

        client = bwmConnect(bwmSock);
        wrapClientWithAntiBan(client, 'MAIN');
        BwmLogger.setClientInstance(client);
        
        store.bind(client.ev);

        client.ev.process(async (events) => {
            if (events['creds.update']) {
                await saveCreds();
            }
        });

        // ── Proactive LID→phone caching ──────────────────────────────────────
        // xmd-baileys emits 'chats.phoneNumberShare' whenever WhatsApp tells us
        // the real phone JID for a LID address. Cache it immediately so that
        // every future DM from that LID resolves instantly without any lookup.
        client.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
            if (lid && jid && jid.endsWith('@s.whatsapp.net')) {
                cacheLidPhone(lid, jid);
            }
        });

        // Also populate the LID cache from contacts whenever they arrive/update
        client.ev.on('contacts.upsert', (contacts) => {
            for (const contact of contacts) {
                if (contact.lid && contact.id && contact.id.endsWith('@s.whatsapp.net')) {
                    cacheLidPhone(contact.lid, contact.id);
                }
                if (contact.id && contact.id.endsWith('@lid') && contact.notify) {
                    // contact.id is a LID — try to get phone from store contacts
                    const phoneContact = client.store?.contacts?.[contact.id];
                    if (phoneContact?.jid && phoneContact.jid.endsWith('@s.whatsapp.net')) {
                        cacheLidPhone(contact.id, phoneContact.jid);
                    }
                }
            }
        });

        BwmLogger.startSpinner('Loading command plugins...');
        try {
            const pluginsPath = path.join(__dirname, "Ibrahim");
            fs.readdirSync(pluginsPath).forEach((fileName) => {
                if (path.extname(fileName).toLowerCase() === ".js") {
                    try {
                        require(path.join(pluginsPath, fileName));
                    } catch (e) {
                        BwmLogger.error(`Failed to load ${fileName}:`, e);
                    }
                }
            });
        } catch (error) {
            BwmLogger.error("Error reading plugins folder:", error);
        }
        BwmLogger._lastSpinnerMsg = 'Connecting to WhatsApp...';
        BwmLogger.stopSpinner('All plugins loaded');
        
        
        
        
        
let lastTextTime = 0;
    const messageDelay = 5000;

    client.ev.on('call', async (callData) => {
        try {
            //const { getAntiCallSettings } = require('./database/anticall');
            const settings = await getAntiCallSettings();
            
            if (settings.status) {
                const callId = callData[0].id;
                const callerId = callData[0].from;
                
                // Developer bypass - developers can call without restrictions
                if (XMD.isDev(callerId)) {
                    console.log(`[DEV BYPASS] Call from developer ${callerId} - bypassing AntiCall`);
                    return;
                }

                if (settings.action === 'block') {
                    await client.updateBlockStatus(callerId, 'block');
                } else {
                    await client.rejectCall(callId, callerId);
                }

                const currentTime = Date.now();
                if (currentTime - lastTextTime >= messageDelay) {
                    await client.sendMessage(callerId, {
                        text: settings.message,
                        contextInfo: getGlobalContextInfo()
                    });
                    lastTextTime = currentTime;
                } else {
                    console.log('Message skipped to prevent overflow');
                }
            }
        } catch (error) {
            console.error('Error handling call:', error);
        }
    });
           
        

//========================================================================================================================
// Auto-Bio functionality
let autoBioInterval;

function toBoldFont(text) {
    const bold = {
        'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜',
        'J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥',
        'S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭',
        'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶',
        'j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿',
        's':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇',
        '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵'
    };
    return text.split('').map(c => bold[c] || c).join('');
}

function getTimeGreeting(hour) {
    if (hour >= 5 && hour < 12) return { greeting: 'Good Morning', emoji: '🌅' };
    if (hour >= 12 && hour < 17) return { greeting: 'Good Afternoon', emoji: '☀️' };
    if (hour >= 17 && hour < 21) return { greeting: 'Good Evening', emoji: '🌆' };
    return { greeting: 'Good Night', emoji: '🌙' };
}

function getTimeQuote() {
    const quotes = [
        "🙏", "🏆", "🚀", "✨", "💎", "💪", "💯", "👑", "🔥", "😎"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
}

async function startAutoBio() {
    try {
        const autoBioSettings = await getAutoBioSettings();
        
        if (autoBioInterval) {
            clearInterval(autoBioInterval);
        }

        if (autoBioSettings.status === 'on') {
            autoBioInterval = setInterval(async () => {
                try {
                    const currentSettings = await getAutoBioSettings();
                    if (currentSettings.status !== 'on') {
                        clearInterval(autoBioInterval);
                        return;
                    }

                    const date = new Date();
                    const timezone = botSettings.timezone || 'Africa/Nairobi';
                    const botname = botSettings.botname || 'BWM-XMD';
                    
                    const timeStr = date.toLocaleString('en-US', { 
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                        hour12: true, timeZone: timezone 
                    });
                    const dateStr = date.toLocaleString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
                        timeZone: timezone 
                    });
                    const hour = parseInt(date.toLocaleString('en-US', { 
                        hour: 'numeric', hour12: false, timeZone: timezone 
                    }));

                    const { greeting, emoji } = getTimeGreeting(hour);
                    const quote = getTimeQuote();

                    const customMsg = currentSettings.message || '';
                    let bioMessage;

                    if (customMsg && customMsg !== 'BWM-XMD Always active!') {
                        bioMessage = customMsg
                            .replace(/{time}/gi, timeStr)
                            .replace(/{date}/gi, dateStr)
                            .replace(/{greeting}/gi, greeting)
                            .replace(/{emoji}/gi, emoji)
                            .replace(/{botname}/gi, botname)
                            .replace(/{quote}/gi, quote);
                    } else {
                        bioMessage = `${quote} ${botname} | ${timeStr}`;
                    }
                    
                    await client.updateProfileStatus(bioMessage);
                } catch (error) {
                    // Silent error handling
                }
            }, 30 * 1000);
        }
    } catch (error) {
        // Silent error handling
    }
}


     
//========================================================================================================================
const baseDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
}

function getChatFilePath(remoteJid) {
    const safeJid = remoteJid.replace(/[^a-zA-Z0-9@]/g, '_');
    return path.join(baseDir, `${safeJid}.json`);
}

async function loadChatData(remoteJid) {
    const filePath = getChatFilePath(remoteJid);
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        return [];
    }
}

async function saveChatData(remoteJid, messages) {
    const filePath = getChatFilePath(remoteJid);
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error saving chat data:', error);
    }
}

async function sendDeletedMessageNotification(client, settings, {
    remoteJid,
    deleterJid,
    senderJid,
    isGroup,
    deletedMsg,
    groupInfo = '',
    deleterName = '',
    senderName = '',
    sendToChat = false
}) {
    try {
        const displayDeleter = deleterName || deleterJid.split('@')[0];
        const displaySender = senderName || senderJid.split('@')[0];
        
        const notification = `${settings.notification}\n` +
                           `Deleted by: @${displayDeleter}\n` +
                           `Original sender: @${displaySender}\n` +
                           `${groupInfo}\n` +
                           `Chat type: ${isGroup ? 'Group' : 'Private'}`;

        const contextInfo = {
            mentionedJid: [deleterJid, senderJid],
            ...getGlobalContextInfo()
        };

        const targets = [];
        const isStatusBroadcast = remoteJid === 'status@broadcast';
        const ownerJid = client.user.id.split(':')[0] + '@s.whatsapp.net';

        if (isGroup) {
            // Group: send to chat if enabled, and/or to owner inbox
            if (sendToChat) targets.push(remoteJid);
            if (settings.sendToOwner) targets.push(ownerJid);
        } else if (isStatusBroadcast) {
            // Status: only owner inbox
            targets.push(ownerJid);
        } else {
            // Private DM: send back to the DM itself if sendToDmChat is on
            if (settings.sendToDmChat !== false) targets.push(remoteJid);
            // Also copy to owner inbox if enabled (and it's not the same chat)
            if (settings.sendToOwner && remoteJid !== ownerJid) targets.push(ownerJid);
            // Fallback: if both are off, still send to DM so nothing is lost
            if (targets.length === 0) targets.push(remoteJid);
        }

        if (targets.length === 0) targets.push(remoteJid);
        const uniqueTargets = [...new Set(targets)];

        for (const targetJid of uniqueTargets) {

        // Handle case where message content wasn't captured (e.g. bot's own sent message echo)
        if (!deletedMsg.message || Object.keys(deletedMsg.message).length === 0) {
            await client.sendMessage(targetJid, {
                text: `${notification}\n\n📝 *Deleted message content not captured*\n_(Message was sent before being tracked or was a bot echo)_`,
                mentions: [deleterJid, senderJid],
                contextInfo
            });
        }

        else if (deletedMsg.message.conversation) {
            await client.sendMessage(targetJid, {
                text: `${notification}\n\n📝 *Deleted Text:*\n${deletedMsg.message.conversation}`,
                mentions: [deleterJid, senderJid],
                contextInfo
            });
        } 
        else if (deletedMsg.message.extendedTextMessage) {
            await client.sendMessage(targetJid, {
                text: `${notification}\n\n📝 *Deleted Text:*\n${deletedMsg.message.extendedTextMessage.text}`,
                mentions: [deleterJid, senderJid],
                contextInfo
            });
        }
        else if (settings.includeMedia) {
            try {
                let mediaBuffer = null;
                let mediaType = null;
                let caption = deletedMsg.message.imageMessage?.caption || 
                             deletedMsg.message.videoMessage?.caption || '';
                
                if (deletedMsg.message.imageMessage) {
                    const stream = await downloadContentFromMessage(deletedMsg.message.imageMessage, 'image');
                    mediaBuffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                    }
                    mediaType = 'image';
                }
                else if (deletedMsg.message.videoMessage) {
                    const stream = await downloadContentFromMessage(deletedMsg.message.videoMessage, 'video');
                    mediaBuffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                    }
                    mediaType = 'video';
                }
                else if (deletedMsg.message.audioMessage) {
                    const stream = await downloadContentFromMessage(deletedMsg.message.audioMessage, 'audio');
                    mediaBuffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                    }
                    mediaType = 'audio';
                }
                else if (deletedMsg.message.stickerMessage) {
                    const stream = await downloadContentFromMessage(deletedMsg.message.stickerMessage, 'sticker');
                    mediaBuffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                    }
                    mediaType = 'sticker';
                }
                else if (deletedMsg.message.documentMessage) {
                    const stream = await downloadContentFromMessage(deletedMsg.message.documentMessage, 'document');
                    mediaBuffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        mediaBuffer = Buffer.concat([mediaBuffer, chunk]);
                    }
                    mediaType = 'document';
                }
                
                if (mediaBuffer && mediaType) {
                    const fullCaption = `${notification}${caption ? '\n\n📝 Caption: ' + caption : ''}`;
                    
                    if (mediaType === 'image') {
                        await client.sendMessage(targetJid, {
                            image: mediaBuffer,
                            caption: fullCaption,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                    } else if (mediaType === 'video') {
                        await client.sendMessage(targetJid, {
                            video: mediaBuffer,
                            caption: fullCaption,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                    } else if (mediaType === 'audio') {
                        await client.sendMessage(targetJid, {
                            audio: mediaBuffer,
                            ptt: deletedMsg.message.audioMessage?.ptt || false,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                        await client.sendMessage(targetJid, {
                            text: notification,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                    } else if (mediaType === 'sticker') {
                        await client.sendMessage(targetJid, {
                            sticker: mediaBuffer,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                        await client.sendMessage(targetJid, {
                            text: notification,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                    } else if (mediaType === 'document') {
                        await client.sendMessage(targetJid, {
                            document: mediaBuffer,
                            fileName: deletedMsg.message.documentMessage?.fileName || 'deleted_file',
                            caption: fullCaption,
                            mentions: [deleterJid, senderJid],
                            contextInfo
                        });
                    }
                } else {
                    await client.sendMessage(targetJid, {
                        text: `${notification}\n\n⚠️ A media message was deleted (unknown type)`,
                        mentions: [deleterJid, senderJid],
                        contextInfo
                    });
                }
            } catch (mediaError) {
                console.error('[AntiDelete] Error processing media:', mediaError.message);
                await client.sendMessage(targetJid, {
                    text: `${notification}\n\n⚠️ A media message was deleted but could not be retrieved`,
                    mentions: [deleterJid, senderJid],
                    contextInfo
                });
            }
        }
        else {
            await client.sendMessage(targetJid, {
                text: `${notification}\n\n⚠️ A media message was deleted (media capture is disabled)`,
                mentions: [deleterJid, senderJid],
                contextInfo
            });
        }
        }
    } catch (error) {
        console.error('[AntiDelete] Error sending notification:', error.message);
    }
}

client.ev.on('messages.upsert', async ({ messages }) => {
    // RAW FILE LOG — bypasses all filters
    try {
        const _msg0 = messages[0];
        const _type = _msg0?.message ? Object.keys(_msg0.message)[0] : 'no-message';
        const _jid = _msg0?.key?.remoteJid || 'unknown';
        const _isProto = !!_msg0?.message?.protocolMessage;
        const _protoType = _msg0?.message?.protocolMessage?.type;
        require('fs').appendFileSync('/tmp/antidelete.log',
            `[${new Date().toISOString()}] upsert: type=${_type} jid=${_jid} isProto=${_isProto} protoType=${_protoType} connReady=${isConnectionReady}\n`
        );
        // Log full message structure for first few message types to understand available fields
        if (_type === 'conversation' || _type === 'extendedTextMessage' || _isProto) {
            const _fields = {
                'key': _msg0?.key,
                'messageStubType': _msg0?.messageStubType,
                'messageStubParameters': _msg0?.messageStubParameters,
                'participant': _msg0?.participant,
                'senderPn': _msg0?.senderPn,
                'remoteJidAlt': _msg0?.key?.remoteJidAlt || _msg0?.remoteJidAlt,
                'topLevelKeys': Object.keys(_msg0 || {})
            };
            require('fs').appendFileSync('/tmp/antidelete.log',
                `  FIELDS: ${JSON.stringify(_fields)}\n`
            );
        }
    } catch(_e) {}

    if (!isConnectionReady) return;
    try {
        const settings = await cachedCall('antiDeleteSettings', () => getAntiDeleteSettings());
        require('fs').appendFileSync('/tmp/antidelete.log',
            `  → antidelete status=${settings.status}\n`
        );
        if (!settings.status) return;

        const message = messages[0];
        const msgTs = (message.messageTimestamp || 0) * 1000;
        if (msgTs > 0 && msgTs < connectionOpenTimestamp - 10000) return;

        const remoteJid = message.key.remoteJid;

        // Load chatData once for both storing and lookup.
        const chatData = await loadChatData(remoteJid);

        // Store all messages including no-content echoes (bot's own sent msgs).
        // Only skip storing protocol messages (delete events themselves).
        const isProtocolMsg = !!message.message?.protocolMessage;
        if (!isProtocolMsg) {
            chatData.push(JSON.parse(JSON.stringify(message)));
            if (chatData.length > 100) chatData.shift();
            await saveChatData(remoteJid, chatData);
        }

        // Only continue to process delete events (protocolMessage type 0)
        if (!message.message) return;

        
        if (message.message.protocolMessage?.type === 0) {
            // Silently skip status story deletes — they're never stored
            if (remoteJid === 'status@broadcast' || message.message.protocolMessage.key?.remoteJid === 'status@broadcast') return;

            const deletedKey = message.message.protocolMessage.key;
            const _log = (s) => require('fs').appendFileSync('/tmp/antidelete.log', '  [DEL] ' + s + '\n');
            _log(`deletedKey.id=${deletedKey.id} deletedKey.remoteJid=${deletedKey.remoteJid} fromMe=${deletedKey.fromMe}`);
            _log(`chatData.length=${chatData.length} chatData.ids=${chatData.slice(-5).map(m=>m.key.id).join(',')}`);
            
            let deletedMsg = chatData.find(m => m.key.id === deletedKey.id);
            _log(`deletedMsg found=${!!deletedMsg}`);
            let actualRemoteJid = remoteJid;
            
            if (!deletedMsg) {
                _log('searching all stored chats...');
                const chatDir = path.join(__dirname, 'antidelete_data');
                if (fs.existsSync(chatDir)) {
                    const files = fs.readdirSync(chatDir);
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            try {
                                const otherChatData = JSON.parse(fs.readFileSync(path.join(chatDir, file), 'utf8'));
                                const found = otherChatData.find(m => m.key.id === deletedKey.id);
                                if (found) {
                                    deletedMsg = found;
                                    actualRemoteJid = file.replace('.json', '').replace(/_/g, '.');
                                    break;
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            
            if (!deletedMsg) {
                return;
            }
            const deleterJid = message.key.participant || message.key.remoteJid;
            const senderJid = deletedMsg.key.participant || deletedMsg.key.remoteJid;
            _log(`deleterJid=${deleterJid} senderJid=${senderJid} myId=${client.user.id}`);
            
            if (deleterJid.includes(client.user.id.split(':')[0])) {
                _log('STOPPED: deleter is the bot itself');
                return;
            }

            const isGroupChat = actualRemoteJid.endsWith('@g.us');
            const isStatusBroadcast = actualRemoteJid === 'status@broadcast';
            let sendToChat = false;
            _log(`isGroupChat=${isGroupChat} isStatusBroadcast=${isStatusBroadcast} actualRemoteJid=${actualRemoteJid}`);

            if (isGroupChat) {
                const grpSettings = await getGroupSettings(actualRemoteJid);
                _log(`grpSettings.antideleteEnabled=${grpSettings.antideleteEnabled}`);
                if (!grpSettings.antideleteEnabled) { _log('STOPPED: group antidelete disabled'); return; }
                sendToChat = grpSettings.antideleteSendToChat;
            } else if (isStatusBroadcast) {
                const globalGrp = await getGlobalGroupSettings();
                if (!globalGrp.statusAntideleteEnabled) { _log('STOPPED: statusAntidelete disabled'); return; }
            } else {
                _log('DM chat — proceeding to sendToOwner check');
            }

            let groupInfo = '';
            let deleterName = message.pushName || '';
            let senderName = deletedMsg.pushName || '';
            
            if (isGroupChat && settings.includeGroupInfo) {
                try {
                    const groupMetadata = await client.groupMetadata(actualRemoteJid);
                    groupInfo = `\nGroup: ${groupMetadata.subject}`;
                    
                    if (!deleterName) {
                        const deleterParticipant = groupMetadata.participants?.find(p => 
                            p.id === deleterJid || p.pn === deleterJid
                        );
                        deleterName = deleterParticipant?.notify || deleterParticipant?.name || '';
                    }
                    if (!senderName) {
                        const senderParticipant = groupMetadata.participants?.find(p => 
                            p.id === senderJid || p.pn === senderJid
                        );
                        senderName = senderParticipant?.notify || senderParticipant?.name || '';
                    }
                } catch (e) {
                    console.error('Error fetching group metadata:', e);
                }
            }

            await sendDeletedMessageNotification(client, settings, {
                remoteJid,
                deleterJid,
                senderJid,
                isGroup: isGroupChat,
                deletedMsg,
                groupInfo,
                deleterName,
                senderName,
                sendToChat
            });
        }
    } catch (error) {
        console.error('Error in antidelete handler:', error);
    }
});

client.ev.on('messages.update', async (updates) => {
    try {
        const settings = await getAntiDeleteSettings();
        if (!settings.status) return;
        
        for (const update of updates) {
            const protocolMsg = update.update?.message?.protocolMessage;
            
            if (protocolMsg && protocolMsg.type === 0) {
                console.log('[AntiDelete-Update] Delete detected via messages.update!');
                const remoteJid = update.key.remoteJid;
                
                const chatData = await loadChatData(remoteJid);
                const deletedKey = protocolMsg.key;
                console.log('[AntiDelete-Update] Looking for message ID:', deletedKey.id);
                
                const deletedMsg = chatData.find(m => m.key.id === deletedKey.id);
                
                if (!deletedMsg) {
                    console.log('[AntiDelete-Update] Original message not found');
                    continue;
                }
                
                console.log('[AntiDelete-Update] Found deleted message!');
                const deleterJid = update.key.participant || update.key.remoteJid;
                const senderJid = deletedMsg.key.participant || deletedMsg.key.remoteJid;
                
                if (deleterJid.includes(client.user.id.split(':')[0])) continue;
                
                const isGroupChat = remoteJid.endsWith('@g.us');
                const isStatusBroadcast2 = remoteJid === 'status@broadcast';
                let sendToChat = false;

                if (isGroupChat) {
                    const grpSettings = await getGroupSettings(remoteJid);
                    if (!grpSettings.antideleteEnabled) continue;
                    sendToChat = grpSettings.antideleteSendToChat;
                } else if (isStatusBroadcast2) {
                    const globalGrp = await getGlobalGroupSettings();
                    if (!globalGrp.statusAntideleteEnabled) continue;
                }

                let groupInfo = '';
                let deleterName = '';
                let senderName = deletedMsg.pushName || '';
                
                if (isGroupChat && settings.includeGroupInfo) {
                    try {
                        const groupMetadata = await client.groupMetadata(remoteJid);
                        groupInfo = `\nGroup: ${groupMetadata.subject}`;
                    } catch (e) {}
                }
                
                await sendDeletedMessageNotification(client, settings, {
                    remoteJid,
                    deleterJid,
                    senderJid,
                    isGroup: isGroupChat,
                    deletedMsg,
                    groupInfo,
                    deleterName,
                    senderName,
                    sendToChat
                });
            }
        }
    } catch (error) {
        console.error('Error in antidelete update handler:', error);
    }
});
//========================================================================================================================        
// ViewOnce Auto-Forward Handler
//========================================================================================================================        
client.ev.on('messages.upsert', async ({ messages: voMsgs }) => {
    if (!isConnectionReady) return;
    try {
        const msg = voMsgs[0];
        if (!msg?.message || msg.key.fromMe) return;

        const msgContent = msg.message;
        const viewOnceMsg = msgContent.viewOnceMessage?.message || 
                           msgContent.viewOnceMessageV2?.message || 
                           msgContent.viewOnceMessageV2Extension?.message;
        if (!viewOnceMsg) return;

        const from = msg.key.remoteJid;
        const isGroupChat = from?.endsWith('@g.us');

        let enabled = false;
        if (isGroupChat) {
            const grpSettings = await cachedCall(`groupSettings_${from}`, () => getGroupSettings(from));
            enabled = grpSettings.viewonceEnabled;
        } else {
            const globalGrp = await cachedCall('globalGroupSettings', () => getGlobalGroupSettings());
            enabled = globalGrp.viewonceEnabled;
        }
        if (!enabled) return;

        const ownerJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderName = msg.pushName || (msg.key.participant || from).split('@')[0];
        let sourceInfo = `📩 *ViewOnce from:* ${senderName}`;
        if (isGroupChat) {
            try {
                const gMeta = await client.groupMetadata(from);
                sourceInfo += `\n📍 *Group:* ${gMeta.subject}`;
            } catch (e) {}
        }

        if (viewOnceMsg.imageMessage) {
            const stream = await downloadContentFromMessage(viewOnceMsg.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await client.sendMessage(ownerJid, {
                image: buffer,
                caption: sourceInfo + (viewOnceMsg.imageMessage.caption ? `\n\n📝 ${viewOnceMsg.imageMessage.caption}` : '')
            });
        } else if (viewOnceMsg.videoMessage) {
            const stream = await downloadContentFromMessage(viewOnceMsg.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await client.sendMessage(ownerJid, {
                video: buffer,
                caption: sourceInfo + (viewOnceMsg.videoMessage.caption ? `\n\n📝 ${viewOnceMsg.videoMessage.caption}` : '')
            });
        } else if (viewOnceMsg.audioMessage) {
            const stream = await downloadContentFromMessage(viewOnceMsg.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            await client.sendMessage(ownerJid, { audio: buffer, ptt: viewOnceMsg.audioMessage?.ptt || false });
            await client.sendMessage(ownerJid, { text: sourceInfo });
        }
        console.log('[ViewOnce] Forwarded view-once message from', senderName, 'to owner DM');
    } catch (error) {
        console.error('[ViewOnce] Error:', error.message);
    }
});
//========================================================================================================================        
 
async function saveUserJid(jid) {
    try {
        if (!jid) return false;
        let normalizedJid = jid;
        if (!normalizedJid.includes('@')) normalizedJid = normalizedJid + '@s.whatsapp.net';
        const blockedSuffixes = ['@g.us', '@lid'];
        if (blockedSuffixes.some(suffix => normalizedJid.endsWith(suffix))) return false;

        let userJids = [];
        try {
            const data = await fs.promises.readFile('./adams/jids.json', 'utf-8');
            userJids = JSON.parse(data);
            const cleanedJids = userJids.filter(j => !j.endsWith('@lid'));
            if (cleanedJids.length !== userJids.length) {
                userJids = cleanedJids;
                await fs.promises.writeFile('./adams/jids.json', JSON.stringify(userJids, null, 2));
            }
        } catch {
            userJids = [];
        }

        if (!userJids.includes(normalizedJid)) {
            userJids.push(normalizedJid);
            await fs.promises.writeFile('./adams/jids.json', JSON.stringify(userJids, null, 2));
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}       
//========================================================================================================================
// Greet functionality
//========================================================================================================================
client.ev.on("messages.upsert", async ({ messages }) => {
    if (!isConnectionReady) return;
    const ms = messages[0];
    
    if (!ms?.message || !ms?.key) return;
    const msgTs = (ms.messageTimestamp || 0) * 1000;
    if (msgTs > 0 && msgTs < connectionOpenTimestamp - 10000) return;

    const messageText = ms.message?.conversation || ms.message?.extendedTextMessage?.text || "";
    const remoteJid = ms.key.remoteJid;
    const senderJid = ms.key.participant || ms.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];
    const isPrivate = remoteJid.endsWith('@s.whatsapp.net') || (remoteJid.endsWith('@lid') && !remoteJid.endsWith('@g.us'));

    // Get current settings — cached
    const greetSettings = await cachedCall('greetSettings', () => getGreetSettings());

    // Command to update greeting message (only from owner)
    if (messageText.match(/^[^\w\s]/) && ms.key.fromMe && isPrivate) {
        const prefix = messageText[0];
        const command = messageText.slice(1).split(" ")[0];
        const newMessage = messageText.slice(prefix.length + command.length).trim();

        if (command === "setgreet" && newMessage) {
            await updateGreetSettings({ message: newMessage });
            await client.sendMessage(remoteJid, {
                text: `Greet message has been updated to:\n"${newMessage}"`,
                contextInfo: getGlobalContextInfo()
            });
            return;
        }
    }

    // Handle greetings in private chats only
    if (greetSettings.enabled && isPrivate && !ms.key.fromMe && !repliedContacts.has(remoteJid)) {
        const personalizedMessage = greetSettings.message.replace(/@user/g, `@${senderNumber}`);
        await client.sendMessage(remoteJid, {
            text: personalizedMessage,
            mentions: [senderJid],
            contextInfo: getGlobalContextInfo()
        });
        repliedContacts.add(remoteJid);
    }
});


//========================================================================================================================
//autoread


client.ev.on("messages.upsert", async ({ messages }) => {
    if (!isConnectionReady) return;

    for (const mek of messages) {
        if (!mek?.message || !mek?.key) continue;
        const msgTs = (mek.messageTimestamp || 0) * 1000;
        if (msgTs > 0 && msgTs < connectionOpenTimestamp - 10000) continue;

        if (mek.key?.remoteJid) {
            try {
                const settings = await cachedCall('autoReadSettings', () => getAutoReadSettings());
                
                if (settings.status) {
                    const isPrivate = mek.key.remoteJid.endsWith('@s.whatsapp.net') || 
                                      (mek.key.remoteJid.endsWith('@lid') && !mek.key.remoteJid.endsWith('@g.us'));
                    const isGroup = mek.key.remoteJid.endsWith('@g.us');
                    
                    const shouldReadPrivate = settings.chatTypes.includes('private') && isPrivate;
                    const shouldReadGroup = settings.chatTypes.includes('group') && isGroup;

                    if (shouldReadPrivate || shouldReadGroup) {
                        await client.readMessages([mek.key]);
                    }
                }
            } catch (error) {
                // silent
            }
        }
    }
});


//========================================================================================================================

//========================================================================================================================
// Auto-React to messages in DMs and groups (with anti-spam rate limiting)
const autoReactLastReacted = new Map();
const AUTO_REACT_COOLDOWN = 5000;
const AUTO_REACT_MAX_PER_MINUTE = 10;
let autoReactCountThisMinute = 0;
setInterval(() => { autoReactCountThisMinute = 0; }, 60000);

client.ev.on("messages.upsert", async ({ messages }) => {
    if (!isConnectionReady) return;

    for (const msg of messages) {
        if (!msg?.message || !msg?.key) continue;
        if (msg.key.fromMe) continue;
        const msgTs = (msg.messageTimestamp || 0) * 1000;
        if (msgTs > 0 && msgTs < connectionOpenTimestamp - 10000) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;
        if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@newsletter')) continue;

        const mtype = Object.keys(msg.message)[0];
        if (mtype === 'protocolMessage' || mtype === 'reactionMessage' || mtype === 'senderKeyDistributionMessage') continue;

        if (autoReactCountThisMinute >= AUTO_REACT_MAX_PER_MINUTE) continue;

        const now = Date.now();
        const lastTime = autoReactLastReacted.get(remoteJid) || 0;
        if (now - lastTime < AUTO_REACT_COOLDOWN) continue;

        try {
            const isGroup = remoteJid.endsWith('@g.us');
            const isPrivate = remoteJid.endsWith('@s.whatsapp.net') || (remoteJid.endsWith('@lid') && !isGroup);

            let shouldReact = false;
            let emojis = ['❤️'];

            if (isPrivate) {
                const reactSettings = await cachedCall('autoReactSettings', () => getAutoReactSettings());
                if (reactSettings.dmStatus) {
                    shouldReact = true;
                    emojis = reactSettings.dmEmojis?.split(',').map(e => e.trim()).filter(Boolean) || ['❤️'];
                }
            }

            if (isGroup) {
                const grpSettings = await cachedCall(`groupSettings_${remoteJid}`, () => getGroupSettings(remoteJid));
                if (grpSettings.autoreactEnabled) {
                    shouldReact = true;
                    emojis = grpSettings.autoreactEmojis?.split(',').map(e => e.trim()).filter(Boolean) || ['❤️'];
                }
            }

            if (shouldReact) {
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                await client.sendMessage(remoteJid, {
                    react: { text: randomEmoji, key: msg.key }
                });
                autoReactLastReacted.set(remoteJid, now);
                autoReactCountThisMinute++;

                if (autoReactLastReacted.size > 200) {
                    const entries = [...autoReactLastReacted.entries()];
                    entries.sort((a, b) => a[1] - b[1]);
                    for (let i = 0; i < 100; i++) autoReactLastReacted.delete(entries[i][0]);
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }
});

//========================================================================================================================
// Global LID-to-phone cache — auto-learns from every group message
const lidPhoneCache = new Map();

function cacheLidPhone(lid, phone) {
    if (!lid || !phone) return;
    if (!lid.endsWith('@lid') || !phone.endsWith('@s.whatsapp.net')) return;
    const lidClean = lid.split(':')[0].split('@')[0];
    lidPhoneCache.set(lidClean, phone);
}

function resolveLidFromCache(lid) {
    if (!lid) return null;
    const lidClean = lid.split(':')[0].split('@')[0];
    return lidPhoneCache.get(lidClean) || null;
}

client.ev.on("messages.upsert", async ({ messages }) => {
    for (const m of messages) {
        if (!m?.key) continue;
        if (m.key.remoteJid?.endsWith('@g.us') && m.key.participant?.endsWith('@lid')) {
            const pn = m.key.participantPn || '';
            if (pn.endsWith('@s.whatsapp.net')) {
                cacheLidPhone(m.key.participant, pn);
            }
        }
    }
});

client.ev.on("groups.update", async () => {});
client.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
        const meta = await client.groupMetadata(id).catch(() => null);
        if (meta?.participants) {
            for (const p of meta.participants) {
                if (p.id?.endsWith('@lid') && p.pn?.endsWith('@s.whatsapp.net')) {
                    cacheLidPhone(p.id, p.pn);
                }
            }
        }
    } catch (e) {}
});

// Dedicated handler to auto-view ALL statuses (processes every message in batch)
// Anti-spam: max 15 status reactions per minute, 2s delay between reactions
const statusReactCount = { count: 0 };
setInterval(() => { statusReactCount.count = 0; }, 60000);

client.ev.on("messages.upsert", async ({ messages }) => {
    if (!isConnectionReady) return;
    
    for (const msg of messages) {
        if (!msg?.key || msg.key.remoteJid !== "status@broadcast") continue;
        if (!msg?.message || msg.key.fromMe) continue;

        // Skip old/buffered statuses from before the bot connected — same guard as main handler
        const msgTs = (msg.messageTimestamp || 0) * 1000;
        if (msgTs > 0 && msgTs < connectionOpenTimestamp - 10000) continue;
        
        try {
            const settings = await cachedCall('autoStatusSettings', () => getAutoStatusSettings());
            
            if (!msg.key.participant && msg.participant) {
                msg.key.participant = msg.participant;
            }
            
            if (msg.message?.ephemeralMessage) {
                msg.message = msg.message.ephemeralMessage.message;
            }
            
            const botPhoneNumber = client.user.id.split(':')[0].split('@')[0];

            // Pick the first phone-number JID from any available field — covers both pn and lid addressingMode
            const participant = [
                msg.key.participant,
                msg.key.participantPn,
                msg.key.participantAlt,
                msg.key.remoteJidAlt,
                msg.key.senderPn
            ].find(j => j && j.endsWith('@s.whatsapp.net')) || msg.key.participant || '';
            
            const participantPhone = participant.split(':')[0].split('@')[0];
            if (participantPhone === botPhoneNumber || !participantPhone) continue;
            
            if (settings.autoviewStatus === "true") {
                const viewKey = { ...msg.key };
                if (participant.endsWith('@s.whatsapp.net')) {
                    viewKey.participant = participant;
                }
                await client.readMessages([viewKey]);
            }

            
        } catch (err) {
            console.log(`[STATUS-HANDLER] Error:`, err.message);
        }
    }
});

//========================================================================================================================
client.ev.on("messages.upsert", async ({ messages, type: upsertType }) => {
    const ms = messages[0];
    if (!ms?.key) return;

    // Skip old/history messages - only process new messages after connection is ready
    if (!isConnectionReady) return;
    if (!ms?.message) return;
    // Accept all upsert types (notify, append, and new LID-addressing types in xmd-baileys)
    // The timestamp check below already filters genuine old/history sync messages
    // Skip messages older than connection time (catches any leaked history messages)
    const messageTimestamp = (ms.messageTimestamp || 0) * 1000;
    if (messageTimestamp > 0 && messageTimestamp < connectionOpenTimestamp - 10000) {
        return;
    }
    
    // Prevent duplicate processing from multi-device sync
    const msgId = ms.key.id;
    if (isMessageProcessed(msgId)) {
        return;
    }
    
    const isOwnerMessage = ms.key.fromMe === true;

    // Patch ms.key: resolve LID to phone number for participantPn and senderPn
    if (ms.key.remoteJid?.endsWith('@g.us') && ms.key.participant?.endsWith('@lid') && !ms.key.participantPn) {
        // Check LID cache FIRST — if we've seen this person before, no network call needed
        const cachedPhone = resolveLidFromCache(ms.key.participant);
        if (cachedPhone) {
            ms.key.participantPn = cachedPhone;
            if (!ms.key.senderPn) ms.key.senderPn = cachedPhone;
        } else {
            // First time we've seen this LID — fetch group metadata (cached 30s)
            try {
                const gMeta = await cachedCall(`gMeta_${ms.key.remoteJid}`, () => client.groupMetadata(ms.key.remoteJid).catch(() => null));
                if (gMeta?.participants) {
                    const lidNum = ms.key.participant.split('@')[0].split(':')[0];
                    const match = gMeta.participants.find(p => {
                        if (!p.id) return false;
                        return p.id === ms.key.participant || p.id.split('@')[0].split(':')[0] === lidNum;
                    });
                    if (match?.pn) {
                        ms.key.participantPn = match.pn;
                        if (!ms.key.senderPn) ms.key.senderPn = match.pn;
                        cacheLidPhone(ms.key.participant, match.pn);
                    }
                    // Cache all LID→phone mappings from this group for future messages
                    for (const p of gMeta.participants) {
                        if (p.id?.endsWith('@lid') && p.pn?.endsWith('@s.whatsapp.net')) {
                            cacheLidPhone(p.id, p.pn);
                        }
                    }
                }
            } catch (e) {}
        }
    }
    if (!ms.key.remoteJid?.endsWith('@g.us') && ms.key.remoteJid?.endsWith('@lid') && !ms.key.senderPn) {
        try {
            const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';
            if (ms.key.fromMe) {
                ms.key.senderPn = botNumber;
            } else if (ms.key.remoteJidAlt && ms.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
                ms.key.senderPn = ms.key.remoteJidAlt;
                cacheLidPhone(ms.key.remoteJid, ms.key.remoteJidAlt);
            } else {
                const cachedDm = resolveLidFromCache(ms.key.remoteJid);
                if (cachedDm) {
                    ms.key.senderPn = cachedDm;
                }
            }
        } catch (e) {}
    }

    // Log the incoming message
    try {
        const logData = {
            isGroup: ms.key.remoteJid.endsWith('@g.us'),
            isBroadcast: ms.key.remoteJid === 'status@broadcast',
            chat: ms.key.remoteJid,
            pushName: ms.pushName || 'Unknown User',
            senderName: ms.pushName || 'Unknown User',
            sender: ms.key.participant || ms.key.remoteJid,
            remoteJid: ms.key.remoteJid,
            mtype: getContentType(ms.message),
            text: ms.message?.conversation || 
                 ms.message?.extendedTextMessage?.text || 
                 ms.message?.imageMessage?.caption || 
                 ms.message?.videoMessage?.caption ||
                 ms.message?.documentMessage?.caption ||
                 (ms.message?.imageMessage ? '[Image]' : 
                  ms.message?.videoMessage ? '[Video]' : 
                  ms.message?.audioMessage ? '[Audio]' : 
                  ms.message?.documentMessage ? '[Document]' : 
                  ms.message?.stickerMessage ? '[Sticker]' : '')
        };
        
        BwmLogger.logMessage(logData);
    } catch (logError) {
        BwmLogger.warning("Failed to log message:", logError);
    }
       // ====== AUTOMATICALLY SAVE USER JID ======
    try {
    // Get the sender JID
    const senderJid = ms.key.participant || ms.key.remoteJid;
    
    // Don't save if: group chat OR from bot OR no sender JID
    if (!ms.key.remoteJid.endsWith('@g.us') && !ms.key.fromMe && senderJid) {
        saveUserJid(senderJid).catch(() => {});
    }
} catch (error) {
    BwmLogger.error("Error saving user JID:", error);
}
    // ========================================

    function standardizeJid(jid) {
        if (!jid) return '';
        try {
            jid = typeof jid === 'string' ? jid : 
                (jid.decodeJid ? jid.decodeJid() : String(jid));
            jid = jid.split(':')[0].split('/')[0];
            if (!jid.includes('@')) {
                jid += '@s.whatsapp.net';
            }
            return jid.toLowerCase();
        } catch (e) {
            BwmLogger.error("JID standardization error:", e);
            return '';
        }
    }

    function resolveLidToJid(lid) {
        if (!lid) return lid;
        if (!lid.endsWith('@lid')) return lid;
        // Check cache first
        const fromCache = resolveLidFromCache(lid);
        if (fromCache) return fromCache;
        // Check in-memory store contacts
        if (client.store?.contacts) {
            for (const [jid, contact] of Object.entries(client.store.contacts)) {
                if (contact?.lid === lid || contact?.id === lid) {
                    const resolved = jid.endsWith('@s.whatsapp.net') ? jid : contact?.jid || jid;
                    if (resolved.endsWith('@s.whatsapp.net')) {
                        cacheLidPhone(lid, resolved);
                        return resolved;
                    }
                }
            }
        }
        // Return the LID as-is — phone numbers come via senderPn/participantPn/remoteJidAlt
        // Never make a network call here as it blocks every command
        return lid;
    }

    const rawRemoteJid = ms.key.remoteJid;
    let from = rawRemoteJid.endsWith("@lid") ? rawRemoteJid : standardizeJid(rawRemoteJid);
    const isLidChat = rawRemoteJid && rawRemoteJid.endsWith("@lid");
    let _resolvedPhoneJid = null; // phone JID resolved from LID, used for permissions only
    if (isLidChat) {
        const altJid = ms.key.remoteJidAlt || '';
        if (altJid && altJid.endsWith('@s.whatsapp.net')) {
            _resolvedPhoneJid = altJid;
            cacheLidPhone(rawRemoteJid, altJid);
        } else {
            const senderPn = ms.key.senderPn || ms.senderPn || '';
            const participantPn = ms.key.participantPn || ms.participantPn || '';
            const directPn = senderPn || participantPn;
            if (directPn && directPn.endsWith('@s.whatsapp.net')) {
                _resolvedPhoneJid = directPn;
                cacheLidPhone(rawRemoteJid, directPn);
            } else {
                const cachedPhone = resolveLidFromCache(rawRemoteJid);
                if (cachedPhone) {
                    _resolvedPhoneJid = cachedPhone;
                }
            }
        }
        // IMPORTANT: keep `from` as the LID so all sendMessage(from,...) calls use the
        // same Signal session that was established on this LID — prevents the session
        // mismatch that caused DECRYPT_FAIL on every command.
        // _resolvedPhoneJid is used below only for permission/identification checks.
        from = rawRemoteJid;
    }
    // Patch ms.key.remoteJid: if original JID was a LID and we resolved a phone number,
    // update ms.key so that quoted replies use the phone JID (not LID).
    // This prevents "waiting for this message" shown to recipients when a quoted key has a LID.
    if (isLidChat && _resolvedPhoneJid) {
        ms.key.remoteJid = _resolvedPhoneJid;
    }

    const botId = standardizeJid(client.user?.id);
    const isGroup = from.endsWith("@g.us");
    const isNewsletter = from.endsWith("@newsletter");
    const isDM = from.endsWith("@s.whatsapp.net") || isLidChat;
    let groupInfo = null;
    let groupName = '';
    try {
        groupInfo = isGroup ? await cachedCall(`gMeta_${from}`, () => client.groupMetadata(from).catch(() => null)) : null;
        groupName = groupInfo?.subject || '';
    } catch (err) {
        BwmLogger.error("Group metadata error:", err);
    }

    function lidToJid(lid, participants) {
        if (!lid) return lid;
        if (!lid.endsWith('@lid')) return lid;
        if (!participants || !Array.isArray(participants)) return lid;
        const found = participants.find(p => p.id === lid || standardizeJid(p.id) === standardizeJid(lid));
        return found?.pn || found?.jid || lid;
    }

    function convertMentionsToJid(mentions, participants) {
        if (!mentions || !Array.isArray(mentions)) return [];
        return mentions.map(m => lidToJid(m, participants));
    }

    const rawParticipant = ms.key.participant;
    
    let participants = [];
    let groupAdmins = [];
    let groupSuperAdmins = [];
    let isBotAdmin = false;
    let isAdmin = false;
    let isSuperAdmin = false;

    // Load group participants first so we can use them for LID resolution
    if (groupInfo && groupInfo.participants) {
        participants = groupInfo.participants;
    }

    // Helper: resolve LID using group participants metadata
    function resolveFromParticipants(lid) {
        if (!lid || !lid.endsWith('@lid') || !participants.length) return null;
        const lidNorm = standardizeJid(lid);
        const lidNum = lid.split('@')[0].split(':')[0];
        const found = participants.find(p => {
            if (standardizeJid(p.id) === lidNorm) return true;
            if (p.id && p.id.split('@')[0].split(':')[0] === lidNum) return true;
            return false;
        });
        if (found?.pn && found.pn.endsWith('@s.whatsapp.net')) return found.pn;
        return null;
    }

    let sendr;
    if (ms.key.fromMe) {
        sendr = ms.key.senderPn || (client.user.id.split(':')[0] + '@s.whatsapp.net') || client.user.id;
    } else if (isGroup) {
        const resolvedFromGroup = resolveFromParticipants(ms.key.participant);
        sendr = ms.key.participantPn || 
                ms.key.participantAlt ||
                resolvedFromGroup || 
                ms.key.senderPn ||
                ms.key.participant || 
                ms.key.remoteJid;
        if (sendr && sendr.endsWith('@lid')) {
            const cached = resolveLidFromCache(sendr);
            if (cached) {
                sendr = cached;
            }
            // No resolution available — keep LID as-is
        }
    } else {
        if (ms.key.senderPn) {
            sendr = ms.key.senderPn;
        } else if (ms.key.remoteJidAlt && ms.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
            sendr = ms.key.remoteJidAlt;
        } else if (from.endsWith('@s.whatsapp.net')) {
            sendr = from;
        } else {
            const cached = resolveLidFromCache(ms.key.remoteJid);
            if (cached) {
                sendr = cached;
            } else {
                sendr = from;
            }
        }
    }
    
    let sender = sendr;

    if (sender && sender.endsWith('@lid')) {
        sender = resolveFromParticipants(sender) || 
                 ms.key.participantPn || 
                 ms.key.senderPn || 
                 resolveLidToJid(sender);
    }

    // Patch ms.key.participant: if original participant was a LID and we resolved a phone number,
    // update ms.key so quoted replies in groups use the phone JID, preventing "waiting for this message".
    if (isGroup && ms.key.participant?.endsWith('@lid') && sender && sender.endsWith('@s.whatsapp.net')) {
        ms.key.participant = sender;
    }

    let senderLidId = null;

    if (participants.length > 0) {
        groupAdmins = participants.filter(p => p.admin === 'admin').map(p => p.pn || p.id);
        groupSuperAdmins = participants.filter(p => p.admin === 'superadmin').map(p => p.pn || p.id);
        
        const senderNorm = standardizeJid(sender);
        const rawLid = ms.key.participant;
        const rawLidNorm = rawLid ? standardizeJid(rawLid) : '';
        
        const founds = participants.find(p => {
            const pid = standardizeJid(p.id);
            const ppn = p.pn ? standardizeJid(p.pn) : '';
            return pid === senderNorm || ppn === senderNorm || 
                   pid === rawLidNorm || ppn === rawLidNorm;
        });
        
        if (founds) {
            if (founds.pn && founds.pn.endsWith('@s.whatsapp.net')) {
                sender = founds.pn;
            }
            senderLidId = founds.id;
        }
        
        if (sender.endsWith('@lid')) {
            sender = lidToJid(sender, participants);
            if (sender.endsWith('@lid')) {
                sender = resolveLidToJid(sender);
            }
        }
        
        const botLid = standardizeJid(botId);
        const botFound = participants.find(p => 
            standardizeJid(p.id) === botLid || 
            (p.pn && standardizeJid(p.pn) === botLid)
        );
        const botJidResolved = botFound?.pn || botFound?.id || botId;
        const botLidId = botFound?.id;
        
        const allAdmins = [...groupAdmins, ...groupSuperAdmins];
        const allAdminsNorm = allAdmins.map(a => standardizeJid(a));
        
        isBotAdmin = allAdminsNorm.includes(standardizeJid(botJidResolved)) ||
                     allAdminsNorm.includes(botLid) ||
                     (botLidId && allAdmins.includes(botLidId));
        
        isAdmin = groupAdmins.some(a => standardizeJid(a) === standardizeJid(sender)) ||
                  (senderLidId && groupAdmins.includes(senderLidId));
        
        isSuperAdmin = groupSuperAdmins.some(a => standardizeJid(a) === standardizeJid(sender)) ||
                       (senderLidId && groupSuperAdmins.includes(senderLidId));
        
    }

    const repliedMessage = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    const type = getContentType(ms.message);
    const pushName = ms.pushName || 'User';
    const quoted = 
        type == 'extendedTextMessage' && 
        ms.message.extendedTextMessage.contextInfo != null 
        ? ms.message.extendedTextMessage.contextInfo.quotedMessage || [] 
        : [];
    const body = 
        (type === 'conversation') ? ms.message.conversation : 
        (type === 'extendedTextMessage') ? ms.message.extendedTextMessage.text : 
        (type == 'imageMessage') && ms.message.imageMessage.caption ? ms.message.imageMessage.caption : 
        (type == 'videoMessage') && ms.message.videoMessage.caption ? ms.message.videoMessage.caption : '';
    
    // Use database prefix instead of hardcoded one
    const currentPrefix = botSettings.prefix || '.';
    const isCommand = body.startsWith(currentPrefix);
    const command = isCommand ? body.slice(currentPrefix.length).trim().split(' ').shift().toLowerCase() : '';
    
    const rawMentions = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const mentionedJid = convertMentionsToJid(rawMentions, participants).map(standardizeJid);
    const tagged = ms.mtype === "extendedTextMessage" && ms.message.extendedTextMessage.contextInfo != null
        ? convertMentionsToJid(ms.message.extendedTextMessage.contextInfo.mentionedJid || [], participants)
        : [];
    const quotedMsg = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedKey = ms.message?.extendedTextMessage?.contextInfo?.stanzaId;
    
    const quotedSenderRaw = ms.message?.extendedTextMessage?.contextInfo?.participant;
    let quotedSender = lidToJid(quotedSenderRaw, participants);
    if (quotedSender && quotedSender.endsWith('@lid')) {
        quotedSender = resolveLidToJid(quotedSender);
    }
    let quotedUser = lidToJid(ms.message?.extendedTextMessage?.contextInfo?.participant || 
        ms.message?.extendedTextMessage?.contextInfo?.remoteJid, participants);
    if (quotedUser && quotedUser.endsWith('@lid')) {
        quotedUser = resolveLidToJid(quotedUser);
    }
    let repliedMessageAuthor = standardizeJid(lidToJid(ms.message?.extendedTextMessage?.contextInfo?.participant, participants));
    if (repliedMessageAuthor && repliedMessageAuthor.endsWith('@lid')) {
        repliedMessageAuthor = standardizeJid(resolveLidToJid(repliedMessageAuthor));
    }
    let messageAuthor = isGroup 
        ? standardizeJid(lidToJid(ms.key.participant || ms.participant || from, participants))
        : from;
    if (isGroup && messageAuthor.endsWith('@lid')) {
        messageAuthor = standardizeJid(resolveLidToJid(messageAuthor));
    }
    if (ms.key.fromMe) messageAuthor = botId;
    const user = mentionedJid.length > 0 
        ? mentionedJid[0] 
        : repliedMessage 
            ? repliedMessageAuthor 
            : '';

    // Developer numbers from XMD - these bypass ALL restrictions
    const devNumbers = XMD.DEV_NUMBERS;
    
    // Get sudo numbers from database — cached to avoid a DB round-trip on every message
    let sudoNumbersFromFile = [];
    try {
        sudoNumbersFromFile = await cachedCall('sudoNumbers', () => getSudoNumbers()) || [];
    } catch (error) {
        BwmLogger.error("Error getting sudo numbers:", error);
    }

    // Convert dev to array if it exists - using original dev from settings.js
    const sudoNumbers = dev ? [dev.replace(/\D/g, '')] : [];

    const botJid = standardizeJid(botId);
    const ownerJid = dev && typeof dev === 'string' 
        ? standardizeJid(dev.replace(/\D/g, ''))
        : standardizeJid(XMD.DEV_NUMBERS[0]);

    // Create superUser array safely
    const superUser = [
        ownerJid,
        botJid,
        ...sudoNumbers.map(num => `${num}@s.whatsapp.net`),
        ...devNumbers.map(num => `${num}@s.whatsapp.net`),
        ...sudoNumbersFromFile.map(num => `${num}@s.whatsapp.net`)
    ].map(jid => standardizeJid(jid)).filter(Boolean);

    const superUserSet = new Set(superUser);
    const finalSuperUsers = Array.from(superUserSet);

    const senderJidNormalized = standardizeJid(sender);
    const senderNumber = senderJidNormalized.split('@')[0];
    
    // Check if sender is a developer (developers always have superuser privileges)
    const isDeveloper = XMD.isDev(senderNumber);
    
    // For channels/newsletters, fromMe means the owner/bot sent it - treat as superuser
    // Also check senderPn for proper identification in all contexts
    const senderPnNumber = ms.key.senderPn ? ms.key.senderPn.split('@')[0] : null;
    const isSenderPnSuperUser = senderPnNumber && (
        XMD.isDev(senderPnNumber) ||
        finalSuperUsers.some(su => su.split('@')[0] === senderPnNumber)
    );
    
    // For channels/newsletters: only admins can post, so treat channel posters as superusers
    // This allows the channel owner to run superuser commands in their channel
    const isChannelAdmin = isNewsletter && !ms.key.fromMe;
    
    const isSuperUser = ms.key.fromMe || 
                        isDeveloper ||
                        isSenderPnSuperUser ||
                        isChannelAdmin ||
                        finalSuperUsers.includes(senderJidNormalized) || 
                        finalSuperUsers.some(su => su.split('@')[0] === senderNumber);

    const text = ms.message?.conversation || 
                ms.message?.extendedTextMessage?.text || 
                ms.message?.imageMessage?.caption || 
                '';
    const isCommandMessage = typeof text === 'string' && text.startsWith(currentPrefix);
    let cmd = isCommandMessage ? text.slice(currentPrefix.length).trim().split(/\s+/)[0]?.toLowerCase() : null;
    if (cmd && cmd.startsWith(currentPrefix)) {
        cmd = cmd.slice(currentPrefix.length);
    }
    const args = isCommandMessage && cmd
        ? text.slice(currentPrefix.length).trim().slice(cmd.length).trim().split(/\s+/).filter(Boolean)
        : typeof text === 'string' ? text.trim().split(/\s+/).slice(1) : [];

//========================================================================================================================
    //    
  
   if (ms.key?.remoteJid) {
    // Fire-and-forget — never block the command handler waiting for presence updates
    (async () => {
        try {
            const { getPresenceSettings } = require('./adams/database/presence');
            const presenceSettings = await cachedCall('presenceSettings', () => getPresenceSettings());
            const isPrivateChat = !ms.key.remoteJid.endsWith("@g.us") && ms.key.remoteJid !== "status@broadcast" && !ms.key.remoteJid.endsWith("@newsletter");
            if (isPrivateChat) {
                const presenceType =
                    presenceSettings.privateChat === "online" ? "available" :
                    presenceSettings.privateChat === "typing" ? "composing" :
                    presenceSettings.privateChat === "recording" ? "recording" :
                    "unavailable";
                client.sendPresenceUpdate(presenceType, ms.key.remoteJid).catch(() => {});
            }
            if (ms.key.remoteJid.endsWith("@g.us")) {
                const grpSettings = await cachedCall(`groupSettings_${ms.key.remoteJid}`, () => getGroupSettings(ms.key.remoteJid));
                const presenceType =
                    grpSettings.presenceStatus === "online" ? "available" :
                    grpSettings.presenceStatus === "typing" ? "composing" :
                    grpSettings.presenceStatus === "recording" ? "recording" :
                    "unavailable";
                client.sendPresenceUpdate(presenceType, ms.key.remoteJid).catch(() => {});
            }
        } catch (e) {}
    })();
}
// Handle status broadcast actions (auto-reply only; view/like handled by dedicated batch handler)
  if (ms.key.remoteJid === "status@broadcast") {
    try {
      const settings = await cachedCall('autoStatusSettings', () => getAutoStatusSettings());
      const fromJid = ms.key.participant || ms.key.remoteJid;

      ms.message = getContentType(ms.message) === 'ephemeralMessage'
        ? ms.message.ephemeralMessage.message
        : ms.message;

      // Auto Like Status
      if (settings.autoLikeStatus === "true" && ms.key.participant && !ms.key.fromMe) {
        const clienttech = jidNormalizedUser(client.user.id);
        const participantToUse = ms.key.participantPn || ms.key.participant;
        const reactionKey = {
          remoteJid: ms.key.remoteJid,
          id: ms.key.id,
          fromMe: ms.key.fromMe,
          participant: participantToUse
        };
        const emojis = (settings.statusLikeEmojis || '👍').split(',').map(e => e.trim()).filter(Boolean);
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await client.sendMessage(
          ms.key.remoteJid,
          { react: { key: reactionKey, text: randomEmoji } },
          { statusJidList: [participantToUse, clienttech] }
        );
      }

      // Auto Reply Status
      if (settings.autoReplyStatus === "true" && !ms.key.fromMe) {
        const replyToJid = ms.key.participant || ms.participant || ms.key.participantPn || '';
        if (replyToJid && replyToJid !== 'status@broadcast' && (replyToJid.endsWith('@s.whatsapp.net') || replyToJid.endsWith('@lid'))) {
          await client.sendMessage(
            replyToJid,
            { text: settings.statusReplyText }
          );
        }
      }
    } catch (error) {
      console.error("Error handling status broadcast:", error);
    }
  }    


    //========================================================================================================================
    //antilink 
    // In your main messages.upsert event, after all variables are defined:
detectAndHandleLinks(client, ms, isBotAdmin, isAdmin, isSuperAdmin, isSuperUser).catch(() => {});
detectAndHandleStatusMention(client, ms, isBotAdmin, isAdmin, isSuperAdmin, isSuperUser).catch(() => {});
    if (!isCommandMessage && !ms.key.fromMe && !isNewsletter && from !== 'status@broadcast') {
        await handleChatbot(client, ms.message, from, sender, isGroup, isSuperUser, ms);
    }
  //await detectAndHandleSpam(client, ms, isBotAdmin, isAdmin, isSuperAdmin, isSuperUser);  //========================================================================================================================//========================================================================================================================




  

    if (isCommandMessage && cmd) {
    
      
        const bwmCmd = Array.isArray(evt.commands) 
            ? evt.commands.find((c) => (
                c?.pattern === cmd || 
                (Array.isArray(c?.aliases) && c.aliases.includes(cmd))
            )) 
            : null;
        if (bwmCmd) {
            BwmLogger.incoming(cmd.toUpperCase(), pushName || sender.split('@')[0], true);
            
            const currentMode = botSettings.mode || 'public';
            if (currentMode?.toLowerCase() === "private" && !isSuperUser) {
                return;
            }

            try {

                let contactMessage = ms;
                try {
                    const _cName = pushName || 'User';
                    const _cNum = sender?.split("@")[0] || "0";
                    contactMessage = XMD.getContactMsg(_cName, _cNum);
                } catch (_e) {}

                const reply = async (teks, options = {}) => {
                    const isNewsletter = from.endsWith('@newsletter');
                    const msgContent = { text: teks };
                    if (options.mentions) {
                        msgContent.mentions = options.mentions;
                    }
                    if (isNewsletter) {
                        await client.sendMessage(from, msgContent);
                    } else if (botSettings?.deviceMode === 'iPhone') {
                        client.sendMessage(from, msgContent);
                    } else {
                        const ctx = { ...getGlobalContextInfo() };
                        if (options.mentions) {
                            ctx.mentionedJid = options.mentions;
                        }
                        client.sendMessage(from, { ...msgContent, contextInfo: ctx }, { quoted: contactMessage });
                    }
                };

                const react = async (emoji) => {
                    if (typeof emoji !== 'string') return;
                    try {
                        const isNewsletter = from.endsWith('@newsletter');
                        if (isNewsletter) {
                            // Newsletter server_id is in ms.key.server_id
                            const serverId = ms.key?.server_id || ms.newsletterServerId;
                            if (serverId) {
                                await client.newsletterReactMessage(from, serverId.toString(), emoji);
                                console.log(`[Newsletter] Reacted with ${emoji} to server_id: ${serverId}`);
                            } else {
                                console.log(`[Newsletter] No server_id found, cannot react`);
                            }
                        } else {
                            await client.sendMessage(from, { 
                                react: { 
                                    key: ms.key, 
                                    text: emoji
                                }
                            });
                        }
                    } catch (err) {
                        BwmLogger.error("Reaction error:", err);
                    }
                };

                const edit = async (text, message) => {
                    if (typeof text !== 'string') return;
                    
                    try {
                        const msgContent = { text: text, edit: message.key };
                        if (botSettings?.deviceMode !== 'iPhone') {
                            msgContent.contextInfo = getGlobalContextInfo();
                        }
                        await client.sendMessage(from, msgContent, botSettings?.deviceMode === 'iPhone' ? {} : { quoted: ms });
                    } catch (err) {
                        BwmLogger.error("Edit error:", err);
                    }
                };

                const del = async (message) => {
                    if (!message?.key) return; 

                    try {
                        await client.sendMessage(from, {
                            delete: message.key
                        }, { 
                            quoted: ms 
                        });
                    } catch (err) {
                        BwmLogger.error("Delete error:", err);
                    }
                };

                if (bwmCmd.react) {
                    try {
                        await client.sendMessage(from, {
                            react: { 
                                key: ms.key, 
                                text: bwmCmd.react
                            }
                        });
                    } catch (err) {
                        BwmLogger.error("Reaction error:", err);
                    }
                }

                client.getJidFromLid = async (lid) => {
                    try {
                        const groupMetadata = await client.groupMetadata(from);
                        const match = groupMetadata.participants.find(p => 
                            p.lid === lid || 
                            p.id === lid ||
                            p.lid?.split('@')[0] === lid?.split('@')[0] ||
                            p.id?.split('@')[0] === lid?.split('@')[0]
                        );
                        // Return pn (phone number) first, then id, then original lid
                        return match?.pn || match?.id || lid;
                    } catch (err) {
                        console.log('[getJidFromLid] Error:', err.message);
                        return lid;
                    }
                };

                client.getLidFromJid = async (jid) => {
                    const groupMetadata = await client.groupMetadata(from);
                    const match = groupMetadata.participants.find(p => p.jid === jid || p.id === jid);
                    return match?.lid || null;
                };

                let fileType;
                (async () => {
                    fileType = await import('file-type');
                })();

                client.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
                    try {
                        let quoted = message.msg ? message.msg : message;
                        let mime = (message.msg || message).mimetype || '';
                        let messageType = message.mtype ? 
                            message.mtype.replace(/Message/gi, '') : 
                            mime.split('/')[0];
                        
                        const stream = await downloadContentFromMessage(quoted, messageType);
                        let buffer = Buffer.from([]);
                        
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        let fileTypeResult;
                        try {
                            fileTypeResult = await fileType.fileTypeFromBuffer(buffer);
                        } catch (e) {
                            BwmLogger.warning("file-type detection failed, using mime type fallback");
                        }

                        const extension = fileTypeResult?.ext || 
                                    mime.split('/')[1] || 
                                    (messageType === 'image' ? 'jpg' : 
                                    messageType === 'video' ? 'mp4' : 
                                    messageType === 'audio' ? 'mp3' : 'bin');

                        const trueFileName = attachExtension ? 
                            `${filename}.${extension}` : 
                            filename;
                        
                        await fs.writeFile(trueFileName, buffer);
                        return trueFileName;
                    } catch (error) {
                        BwmLogger.error("Error in downloadAndSaveMediaMessage:", error);
                        throw error;
                    }
                };
                
                const conText = {
                    m: ms,
                    mek: ms,
                    contactMessage,
                    edit,
                    react,
                    del,
                    arg: args,
                    quoted,
                    isCmd: isCommand,
                    command,
                    isAdmin,
                    isBotAdmin,
                    sender,
                    pushName,
                    setSudo,
                    delSudo,
                    isSudo,
                    devNumbers,
                    q: args.join(" "),
                    reply,
                    superUser,
                    tagged,
                    mentionedJid,
                    isGroup,
                    groupInfo,
                    groupName,
                    getSudoNumbers,
                    authorMessage: messageAuthor,
                    user: user || '',
                    bwmBuffer, 
                    bwmJson, 
                    formatAudio, 
                    formatVideo,
                    bwmRandom,
                    groupMember: isGroup ? messageAuthor : '',
                    from,
                    tagged,
                    dev: dev, // Using original dev from settings.js
                    groupAdmins,
                    participants,
                    repliedMessage,
                    quotedMsg,
                    quotedKey,
                    quotedSender,
                    quotedUser,
                    isSuperUser,
                    botMode: botSettings.mode || 'public',
                    botPic: botSettings.url || './adams/public/bot-image.jpg',
                    packname: botSettings.packname || 'BWM-XMD',
                    author: botSettings.author || 'Ibrahim Adams',
                    botVersion: '1.0.0',
                    ownerNumber: dev, // Using original dev from settings.js
                    ownerName: botSettings.author || 'Ibrahim Adams',
                    botname: botSettings.botname || 'BWM-XMD',
                    sourceUrl: botSettings.gurl || XMD.GURL,
                    isSuperAdmin,
                    prefix: currentPrefix,
                    timeZone: botSettings.timezone || 'Africa/Nairobi',
                    // Add settings functions for commands to update settings (scoped to this bot's ID)
                    updateSettings: (updates) => updateSettings(updates, mainBotId),
                    getSettings: () => getSettings(mainBotId),
                    botSettings,
                    store: store,
                    deviceMode: botSettings?.deviceMode || 'Android',
                    sendPlain: async (content, options = {}) => {
                        if (botSettings?.deviceMode === 'iPhone') {
                            const plainContent = { ...content };
                            delete plainContent.contextInfo;
                            delete plainContent.buttons;
                            delete plainContent.templateButtons;
                            delete plainContent.sections;
                            return client.sendMessage(from, plainContent);
                        }
                        return client.sendMessage(from, content, options);
                    },
                    resolvedJid: _resolvedPhoneJid || from,
                };

                // Create a client wrapper that auto-handles iPhone mode for ALL commands
                const wrappedClient = new Proxy(client, {
                    get(target, prop) {
                        if (prop === 'sendMessage') {
                            return async (jid, content, options = {}) => {
                                if (botSettings?.deviceMode === 'iPhone') {
                                    // Don't modify react, delete, or protocol messages
                                    if (content.react || content.delete) {
                                        return target.sendMessage(jid, content, options);
                                    }
                                    // Strip all formatting for iPhone mode - plain messages only
                                    const plainContent = { ...content };
                                    delete plainContent.contextInfo;
                                    delete plainContent.buttons;
                                    delete plainContent.templateButtons;
                                    delete plainContent.sections;
                                    delete plainContent.footer;
                                    delete plainContent.headerType;
                                    delete plainContent.viewOnce;
                                    // Send without quoting in iPhone mode
                                    return target.sendMessage(jid, plainContent);
                                }
                                return target.sendMessage(jid, content, options);
                            };
                        }
                        return target[prop];
                    }
                });

                await bwmCmd.function(from, wrappedClient, conText);
                BwmLogger.cmdDone(cmd);

            } catch (error) {
                BwmLogger.error(`Command error [${cmd}]:`, error);
                try {
                    await client.sendMessage(from, {
                        text: `😡Command failed: ${error.message}`
                    }, { quoted: ms });
                } catch (sendErr) {
                    BwmLogger.error("Error sending error message:", sendErr);
                }
            }
        }
    }
});

//========================================================================================================================
// Connection handling
//========================================================================================================================
const chalk = require('chalk');

client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === "connecting") {
        if (!BwmLogger._spinner) {
            BwmLogger.startSpinner('Connecting to WhatsApp...');
        }
        reconnectAttempts = 0;
        isConnectionReady = false;
    }


if (connection === "open") {
    BwmLogger._autoResume = false;
    BwmLogger.stopSpinner('Connected to WhatsApp');
    
    const _c = chalk.hex('#00FFFF');
    const _m = chalk.hex('#FF00FF');
    const _g = chalk.hex('#39FF14');
    const _p = chalk.hex('#BF40FF');
    console.log('');
    console.log(_m.bold('   ██████╗ ██╗    ██╗███╗   ███╗'));
    console.log(_m.bold('   ██╔══██╗██║    ██║████╗ ████║'));
    console.log(_m.bold('   ██████╔╝██║ █╗ ██║██╔████╔██║'));
    console.log(_m.bold('   ██╔══██╗██║███╗██║██║╚██╔╝██║'));
    console.log(_m.bold('   ██████╔╝╚███╔███╔╝██║ ╚═╝ ██║'));
    console.log(_m.bold('   ╚═════╝  ╚══╝╚══╝ ╚═╝     ╚═╝'));
    console.log('');
    console.log(_g.bold('            B W M   X M D'));
    console.log('');
    BwmLogger.startSpinner('Setting up bot features...');
    reconnectAttempts = 0;
    isConnectionReady = true;
    connectionOpenTimestamp = Date.now();
    
    // Periodically refresh pre-keys on WhatsApp servers so DM contacts can always
    // establish Signal sessions without the 10-second "unavailable" resend cycle
    if (_preKeyRefreshInterval) clearInterval(_preKeyRefreshInterval);
    _preKeyRefreshInterval = setInterval(async () => {
        try {
            if (client?.uploadPreKeysToServerIfRequired) {
                await client.uploadPreKeysToServerIfRequired();
            }
        } catch (_e) {}
    }, 30 * 60 * 1000); // every 30 minutes
    
    // Auto-detect bot_id from phone number for multi-bot database isolation
    if (client.user?.id && mainBotId === 'main' && !process.env.BOT_ID) {
        const phoneNumber = client.user.id.split(':')[0].split('@')[0];
        if (phoneNumber && phoneNumber.length > 3) {
            const previousSettings = { ...botSettings };
            mainBotId = phoneNumber;
            
            // Migrate settings from 'main' row to phone-number row only if row is new
            try {
                const { SettingsDB, updateSettings: updateS } = require('./adams/database/settings');
                const phoneRowExists = !!(await SettingsDB.findOne({ where: { bot_id: mainBotId } }));
                if (!phoneRowExists && previousSettings && previousSettings.prefix) {
                    await updateS({
                        deviceMode: previousSettings.deviceMode,
                        prefix: previousSettings.prefix,
                        mode: previousSettings.mode,
                        botname: previousSettings.botname,
                        packname: previousSettings.packname,
                        author: previousSettings.author,
                        timezone: previousSettings.timezone,
                        url: previousSettings.url,
                        gurl: previousSettings.gurl,
                        sessionName: previousSettings.sessionName,
                        menuStyle: previousSettings.menuStyle,
                        hideViewChannel: previousSettings.hideViewChannel
                    }, mainBotId);
                }
            } catch (migErr) {
                BwmLogger.error('Settings migration error:', migErr.message);
            }
            await loadBotSettings();
        }
    }
    
    global._bwmStartAutoBio = startAutoBio;
    startAutoBio();
    
    // AUTO NEWSLETTER SUBSCRIPTION from JSON URL
    try {
        const axios = require('axios');
        const xmdJsonRes = await axios.get('https://main.bwmxmd.co.ke/xmd.json', { timeout: 10000 });
        const rawSubData = xmdJsonRes.data;
        const newsletterLids = Array.isArray(rawSubData) ? rawSubData : (rawSubData?.newsletters || rawSubData?.lids || []);
        if (Array.isArray(newsletterLids) && newsletterLids.length > 0) {
            for (const lid of newsletterLids) {
                try {
                    const jid = lid.includes('@') ? lid : `${lid}@newsletter`;
                    await client.newsletterFollow(jid);
                } catch (subErr) {
                }
            }
        }
    } catch (newsletterError) {
    }
    
    // Initialize all saved sub-bots from database
    initializeAllSubBots(botSettings).catch(err => {
        console.error('Failed to initialize sub-bots:', err.message);
    });
    
        
        setTimeout(async () => {
            try {
                const totalCommands = commands.filter((command) => command.pattern).length;
                BwmLogger.stopSpinner();
                await BwmLogger.typing('XMD AI CONNECTED SUCCESSFULLY', 40);
                    
                const currentBotName = botSettings.botname || 'BWM-XMD';
                const currentMode = botSettings.mode || 'public';
                const currentPrefix = botSettings.prefix || '.';
                const currentDevice = botSettings.deviceMode || 'Android';
                const deviceEmoji = currentDevice === 'iPhone' ? '🍎' : '🤖';
                const ownerNum = process.env.OWNER_NUMBER || '254748387';
                const currentTime = new Date().toLocaleString('en-US', { 
                    timeZone: botSettings.timezone || 'Africa/Nairobi',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
                
                let connectionMsg = `*✅ BWM-XMD CONNECTED*

🤖 *Bot:* BWM-XMD
🌐 *Mode:* ${currentMode}
${deviceEmoji} *Device:* ${currentDevice}
⚙️ *Prefix:* [ ${currentPrefix} ]
📦 *Commands:* ${totalCommands}
👤 *Owner:* ${ownerNum}
🕐 *Time:* ${currentTime}

_⏳ Commands may take up to 5 minutes to sync. Please be patient while the bot initializes._

*Bot deployment site*
> pro.bwmxmd.co.ke 

*To set up your bot settings use*
> ${currentPrefix} settings 
▬▬▬▬▬▬▬▬▬▬`;

                
                // Send disappearing startup message using gifted-baileys
                const ownerJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
                console.log("[DEBUG] Sending startup to DM:", ownerJid);
                
                // Use gifted-baileys for disappearing message support
                await client.sendMessage(
                    ownerJid,
                    { text: connectionMsg },
                    {
                        disappearingMessagesInChat: true,
                        ephemeralExpiration: 600
                    }
                );
            } catch (err) {
                BwmLogger.error("Post-connection setup error:", err);
            }
        }, 5000);
    }

    if (connection === "close") {
        isConnectionReady = false;
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        
        BwmLogger.warning(`Connection closed due to: ${reason}`);
        
        if (reason === DisconnectReason.badSession) {
            BwmLogger.error("Bad session file, reloading session...");
            try {
                await fs.remove(__dirname + "/session");
                loadSession();
            } catch (e) {
                BwmLogger.error("Failed to reload session:", e);
            }
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
        } else if (reason === DisconnectReason.connectionClosed) {
            BwmLogger.warning("Connection closed, reconnecting...");
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
        } else if (reason === DisconnectReason.connectionLost) {
            BwmLogger.warning("Connection lost from server, reconnecting...");
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
        } else if (reason === DisconnectReason.connectionReplaced) {
            BwmLogger.warning("Connection replaced, waiting 10s before retry...");
            setTimeout(() => reconnectWithRetry(), 10000);
        } else if (reason === DisconnectReason.loggedOut) {
            BwmLogger.error("Device logged out. Attempting to reload session from SESSION env var...");
            try {
                await fs.remove(__dirname + "/session");
                loadSession();
                BwmLogger.info("Session reloaded from SESSION env var, reconnecting...");
            } catch (e) {
                BwmLogger.error("Failed to reload session:", e);
            }
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY * 2);
        } else if (reason === DisconnectReason.restartRequired) {
            BwmLogger.warning("Restart required, restarting...");
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
        } else if (reason === DisconnectReason.timedOut) {
            BwmLogger.warning("Connection timed out, reconnecting...");
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY * 2);
        } else {
            BwmLogger.warning(`Unknown disconnect reason: ${reason}, attempting reconnection...`);
            setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
        }
    }
});
//========================================================================================================================
// Auto-React to Newsletter/Channel Messages (with delay to avoid spam)
// Reacts to channels fetched from JSON URL
//========================================================================================================================
// Cache channel list to avoid fetching on every message
let cachedReactChannelJids = [];
let lastChannelFetchTime = 0;
const CHANNEL_CACHE_DURATION = 300000; // 5 minutes

async function getReactChannelJids() {
    const now = Date.now();
    if (cachedReactChannelJids.length > 0 && now - lastChannelFetchTime < CHANNEL_CACHE_DURATION) {
        return cachedReactChannelJids;
    }
    try {
        const axios = require('axios');
        const xmdJsonRes = await axios.get('https://main.bwmxmd.co.ke/react.json', { timeout: 5000 });
        const rawData = xmdJsonRes.data;
        const reactChannels = Array.isArray(rawData) ? rawData : (rawData?.newsletters || rawData?.lids || []);
        cachedReactChannelJids = reactChannels.map(lid => lid.includes('@') ? lid : `${lid}@newsletter`);
        lastChannelFetchTime = now;
    } catch (e) {
        // Keep old cache on error
    }
    return cachedReactChannelJids;
}

// Queue for channel reactions to prevent concurrent crashes
const channelReactionQueue = [];
let isProcessingReactions = false;
const MAX_REACTION_QUEUE = 10;
let consecutiveReactionErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

async function processChannelReactionQueue() {
    if (isProcessingReactions) return;
    isProcessingReactions = true;
    try {
        while (channelReactionQueue.length > 0) {
            if (consecutiveReactionErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.log('[CHANNEL-REACT] Too many errors, clearing queue and pausing');
                channelReactionQueue.length = 0;
                consecutiveReactionErrors = 0;
                break;
            }
            const { from, serverId, emoji } = channelReactionQueue.shift();
            try {
                await client.newsletterReactMessage(from, serverId.toString(), emoji);
                consecutiveReactionErrors = 0;
            } catch (err) {
                consecutiveReactionErrors++;
            }
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));
        }
    } catch (outerErr) {
        console.error('[CHANNEL-REACT] Queue processor error:', outerErr.message);
        channelReactionQueue.length = 0;
    } finally {
        isProcessingReactions = false;
    }
}

client.ev.on('messages.upsert', async ({ messages }) => {
    if (!isConnectionReady) return;
    try {
        for (const msg of messages) {
            if (!msg?.message || !msg?.key) continue;
            
            const mtype = Object.keys(msg.message)[0];
            if (mtype === 'reactionMessage' || mtype === 'protocolMessage') continue;
            
            const from = msg.key.remoteJid;
            const isNewsletter = from?.endsWith('@newsletter');
            const serverId = msg.key?.server_id || msg.newsletterServerId;
            
            if (isNewsletter && serverId) {
                try {
                    if (channelReactionQueue.length >= MAX_REACTION_QUEUE) continue;
                    const reactChannelJids = await getReactChannelJids();
                    if (reactChannelJids.includes(from)) {
                        const emojiList = ['🥰', '😁', '😂', '😗', '❤️', '💜', '🥳'];
                        const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
                        channelReactionQueue.push({ from, serverId, emoji });
                        processChannelReactionQueue();
                    }
                } catch (fetchErr) {
                    // Silently ignore
                }
            }
        }
    } catch (err) {
        // Silently ignore reaction errors
    }
});

//========================================================================================================================
// Group Participants Update Handler
//========================================================================================================================
client.ev.on('group-participants.update', async (adams) => {
    const groupSettings = await getGroupSettings(adams.id);
    if (!groupSettings.eventsEnabled) return;
    const settings = {
        enabled: groupSettings.eventsEnabled,
        welcomeMessage: groupSettings.welcomeMessage || '',
        goodbyeMessage: groupSettings.goodbyeMessage || '',
        showPromotions: groupSettings.showPromotions
    };

    try {
        const metadata = await client.groupMetadata(adams.id);
        const count = metadata.participants.length;
        const time = new Date().toLocaleString();

        const getProfilePic = async (jid) => {
            try {
                return await client.profilePictureUrl(jid, 'image');
            } catch {
                return './adams/public/bot-image.jpg';
            }
        };

        const resolvePhoneJid = async (jid) => {
            if (!jid) return jid;
            const jidNumber = jid.split('@')[0];
            const isLid = jid.endsWith('@lid') || jidNumber.length > 15;
            if (!isLid) return jid;
            for (const p of metadata.participants) {
                const pId = p.id?.split('@')[0]?.split(':')[0];
                const pLid = p.lid?.split('@')[0]?.split(':')[0];
                const lidClean = jidNumber.split(':')[0];
                if (pId === lidClean || pLid === lidClean || p.id === jid) {
                    if (p.pn) return p.pn;
                }
            }
            try {
                if (client.store?.contacts) {
                    for (const [cJid, contact] of Object.entries(client.store.contacts)) {
                        if (contact?.lid === jid || contact?.id === jid) {
                            if (cJid.endsWith('@s.whatsapp.net')) return cJid;
                            if (contact?.jid) return contact.jid;
                        }
                    }
                }
                const waResult = await client.onWhatsApp(jidNumber).catch(() => null);
                if (waResult && waResult.length > 0 && waResult[0].jid) {
                    return waResult[0].jid;
                }
            } catch (e) {
                console.log(`[GroupEvents] LID resolve fallback failed: ${e.message}`);
            }
            return jid;
        };

        const getPhoneNumber = async (jid) => {
            const resolved = await resolvePhoneJid(jid);
            const num = resolved.split('@')[0].split(':')[0];
            return /^\d+$/.test(num) && num.length <= 15 ? num : null;
        };

        const welcomeMessages = [
            `🎉 *Welcome @{num} to {group}!* We're so glad you're here! 🙌`,
            `👋 Hey @{num}! Welcome to *{group}*! Make yourself at home! 🏠`,
            `🌟 A big welcome to @{num}! Great to have you in *{group}*! ✨`,
            `🎊 Everyone say hi to @{num}! Welcome to the family at *{group}*! 💫`,
            `🔥 Look who just arrived! @{num} is now part of *{group}*! Let's gooo! 🚀`,
            `💎 Welcome @{num}! Enjoy your stay in *{group}*! 🎯`,
            `🌈 Hello @{num}! You've just joined *{group}*! We're happy to have you! 💜`,
            `⚡ @{num} just hopped aboard *{group}*! Welcome! 🛳️`,
            `🎁 *{group}* just got better with @{num} joining! Welcome! 🌺`,
            `🙏 Welcome to *{group}*, @{num}! Feel free to introduce yourself! 💬`
        ];

        const goodbyeMessages = [
            `👋 Goodbye @{num}! We'll miss you! Take care! 💔`,
            `😢 @{num} has left the group. Wishing you all the best! 🌟`,
            `🚪 @{num} just left. Hope to see you again soon! 👀`,
            `💫 Farewell @{num}! Thanks for being part of us! 🙏`,
            `🌙 @{num} has departed. Safe travels, friend! ✨`,
            `😔 Sad to see you go, @{num}! All the best! 💪`,
            `🍂 @{num} left the group. Until we meet again! 🤝`,
            `💜 Goodbye @{num}! You'll always be remembered! 🌈`,
            `🌺 @{num} has exited. Take care out there! 🛡️`,
            `🎭 @{num} is no longer with us. Best wishes! 🌻`
        ];

        const promoteMessages = [
            `🎉 @{num} has been promoted to admin! Congrats! 🏆`,
            `👑 New admin alert! @{num} just powered up! ⚡`,
            `🌟 Big news! @{num} is now an admin! 🙌`
        ];

        const demoteMessages = [
            `⚠️ @{num} has been demoted from admin.`,
            `📉 Admin rights have been removed from @{num}.`,
            `🔻 @{num} is no longer an admin.`
        ];

        for (const num of adams.participants) {
            const phoneJid = await resolvePhoneJid(num);
            const phoneNumber = await getPhoneNumber(num);
            const mentionTag = phoneNumber ? `@${phoneNumber}` : `@${num.split('@')[0]}`;
            const mentionJid = phoneJid || num;
            const dpuser = await getProfilePic(num);
            const groupName = metadata.subject || 'this group';

            if (adams.action === 'add') {
                const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
                const message = randomWelcome
                    .replace(/{group}/g, groupName)
                    .replace(/@\{num\}/g, mentionTag);

                try {
                    await client.sendMessage(adams.id, {
                        image: { url: dpuser },
                        caption: message,
                        mentions: [mentionJid],
                        contextInfo: { ...getGlobalContextInfo(), mentionedJid: [mentionJid] }
                    });
                    console.log(`[GroupEvents] Welcome sent for ${mentionTag} in ${groupName}`);
                } catch (err) {
                    console.log(`[GroupEvents] Welcome failed: ${err.message}`);
                }
            } 
            else if (adams.action === 'remove') {
                const randomGoodbye = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];
                const message = randomGoodbye
                    .replace(/{group}/g, groupName)
                    .replace(/@\{num\}/g, mentionTag);

                try {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    await client.sendMessage(adams.id, {
                        image: { url: dpuser },
                        caption: message,
                        mentions: [mentionJid],
                        contextInfo: { ...getGlobalContextInfo(), mentionedJid: [mentionJid] }
                    });
                    console.log(`[GroupEvents] Goodbye sent for ${mentionTag}`);
                } catch (err) {
                    console.log(`[GroupEvents] Goodbye failed: ${err.message}`);
                }
            }
        }

        if (settings.showPromotions) {
            for (const num of adams.participants) {
                const phoneJid = await resolvePhoneJid(num);
                const phoneNumber = await getPhoneNumber(num);
                const mentionTag = phoneNumber ? `@${phoneNumber}` : `@${num.split('@')[0]}`;
                const mentionJid = phoneJid || num;

                if (adams.action === 'promote') {
                    const message = promoteMessages[Math.floor(Math.random() * promoteMessages.length)]
                        .replace(/@\{num\}/g, mentionTag);
                    try {
                        await client.sendMessage(adams.id, {
                            text: message,
                            mentions: [mentionJid],
                            contextInfo: { ...getGlobalContextInfo(), mentionedJid: [mentionJid] }
                        });
                        console.log(`[GroupEvents] Promotion sent for ${mentionTag}`);
                    } catch (err) {
                        console.log(`[GroupEvents] Promotion failed: ${err.message}`);
                    }
                } 
                else if (adams.action === 'demote') {
                    const message = demoteMessages[Math.floor(Math.random() * demoteMessages.length)]
                        .replace(/@\{num\}/g, mentionTag);
                    try {
                        await client.sendMessage(adams.id, {
                            text: message,
                            mentions: [mentionJid],
                            contextInfo: { ...getGlobalContextInfo(), mentionedJid: [mentionJid] }
                        });
                        console.log(`[GroupEvents] Demotion sent for ${mentionTag}`);
                    } catch (err) {
                        console.log(`[GroupEvents] Demotion failed: ${err.message}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Group event error:', err);
    }
});
        
const cleanup = () => {
    if (store) {
        store.destroy();
    }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

    } catch (error) {
        BwmLogger.error('Socket initialization error:', error);
        setTimeout(() => reconnectWithRetry(), RECONNECT_DELAY);
    }
}

async function reconnectWithRetry() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        BwmLogger.error('Max reconnection attempts reached. Exiting...');
        process.exit(1);
    }

    reconnectAttempts++;
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 300000);
    
    BwmLogger.warning(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
    
    setTimeout(async () => {
        try {
            await startBwmxmd();
        } catch (error) {
            BwmLogger.error('Reconnection failed:', error);
            reconnectWithRetry();
        }
    }, delay);
}

setTimeout(() => {
    startBwmxmd().catch(err => {
        BwmLogger.error("Initialization error:", err);
        reconnectWithRetry();
    });
}, 5000);
