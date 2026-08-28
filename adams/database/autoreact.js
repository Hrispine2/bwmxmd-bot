const { DataTypes } = require('sequelize');
const { database } = require('../../config');

const AutoReactDB = database.define('autoreact', {
    dmStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    dmEmojis: {
        type: DataTypes.TEXT,
        defaultValue: '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎',
        allowNull: false
    }
}, {
    timestamps: true
});

async function initAutoReactDB() {
    try {
        await AutoReactDB.sync({ alter: true });
        console.log('AutoReact table ready');
    } catch (error) {
        console.error('Error initializing AutoReact table:', error);
        throw error;
    }
}

async function getAutoReactSettings() {
    try {
        let settings = await AutoReactDB.findOne();
        if (!settings) {
            settings = await AutoReactDB.create({});
        }
        return {
            dmStatus: settings.dmStatus || false,
            dmEmojis: settings.dmEmojis || '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎'
        };
    } catch (error) {
        console.error('Error getting auto-react settings:', error);
        return {
            dmStatus: false,
            dmEmojis: '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎'
        };
    }
}

async function updateAutoReactSettings(updates) {
    try {
        let settings = await AutoReactDB.findOne();
        if (!settings) {
            settings = await AutoReactDB.create({});
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating auto-react settings:', error);
        return null;
    }
}

module.exports = {
    initAutoReactDB,
    getAutoReactSettings,
    updateAutoReactSettings,
    AutoReactDB
};
