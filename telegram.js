'use strict';

const TelegramBot = require('node-telegram-bot-api');
const { logger, MessageError, getConfig, startApp } = require('./common.js');
const config = getConfig('./telegram_conf.json', './config.json');

// Telegram
const bot = new TelegramBot(config.telegram.token, {
    polling: true,
});

bot.onText(/\/whois/, (msg) => {
    if (config.telegram.whoisCommand) {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `chatId = ${chatId}`).catch((err) => {
            logger.error(`whois Error: `, err);
        });
    }
});

const app = startApp({
    config,
    sendMessage: (target, message) => bot.sendMessage(target, message).catch((err) => {
        let d = err.response || {};
        d = d.body || {};
        d = d.description || '';
        throw new MessageError(d, err.code);
    }),
});
