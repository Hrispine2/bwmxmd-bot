const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const session = process.env.SESSION || process.env.SESSION_ID || '';
const XMD_CONFIG = require("./adams/xmd");
const dev = process.env.OWNER_NUMBER || XMD_CONFIG.DEV_NUMBERS[0];
const { Sequelize } = require('sequelize'); 


const DATABASE_URL = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL || './database.db';
console.log(`[DATABASE] Using: ${DATABASE_URL.startsWith('postgres') ? 'PostgreSQL' : DATABASE_URL.startsWith('mysql') ? 'MySQL' : 'SQLite'}`); 

// Auto-detect database type from URL
const isPostgres = DATABASE_URL.startsWith('postgres');
const isMysql = DATABASE_URL.startsWith('mysql');
const isSqlite = !isPostgres && !isMysql;

let database;
if (isSqlite) {
    database = new Sequelize({
        dialect: 'sqlite',
        storage: DATABASE_URL,
        logging: false,
    });
} else if (isPostgres) {
    database = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false },
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        },
        logging: false,
        pool: {
            max: 5,
            min: 1,
            acquire: 60000,
            idle: 30000,
            evict: 10000,
        },
        retry: {
            max: 5,
            backoffBase: 1000,
            backoffExponent: 1.5,
        },
    });
} else if (isMysql) {
    database = new Sequelize(DATABASE_URL, {
        dialect: 'mysql',
        logging: false,
    });
}

module.exports = {  
  database,  
  dev,
  session,
  
  BOT: process.env.BOT_NAME || 'BWM XMD',
  PREFIX: process.env.PREFIX || '.',
  TZ: process.env.TZ || 'Africa/Nairobi',
  
  BOT_URL: process.env.BOT_URL ? process.env.BOT_URL.split(',') : [
    'https://on.bwmxmd.co.ke/veksnu.jpg',
    'https://on.bwmxmd.co.ke/ge01u0.jpg',
    'https://on.bwmxmd.co.ke/ztb02d.jpg'
  ],
  
  MENU_TOP_LEFT: process.env.MENU_TOP_LEFT || "*┌─❖*",
  MENU_BOT_NAME_LINE: process.env.MENU_BOT_NAME_LINE || "*│",
  MENU_BOTTOM_LEFT: process.env.MENU_BOTTOM_LEFT || "*└┬❖*",
  MENU_GREETING_LINE: process.env.MENU_GREETING_LINE || "   *│",
  MENU_DIVIDER: process.env.MENU_DIVIDER || "   *└────────┈❖*",
  MENU_USER_LINE: process.env.MENU_USER_LINE || "> 🕵️",
  MENU_DATE_LINE: process.env.MENU_DATE_LINE || "> 📅",
  MENU_TIME_LINE: process.env.MENU_TIME_LINE || "> ⏰",
  MENU_STATS_LINE: process.env.MENU_STATS_LINE || "> ⭐",
  MENU_BOTTOM_DIVIDER: process.env.MENU_BOTTOM_DIVIDER || "▬▬▬▬▬▬▬▬▬▬",
  
};

const XMD = require("./adams/xmd");
module.exports.NEWSLETTER_JID = XMD.NEWSLETTER_JID;
module.exports.getGlobalContextInfo = () => XMD.getContextInfo();
