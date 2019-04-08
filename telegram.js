'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const winston = require('winston');
const TelegramBot = require('node-telegram-bot-api');

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format(info => {
            info.level = info.level.toUpperCase();
            return info;
        })(),
        winston.format.colorize(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `[${info.timestamp}] <${info.level}> ${info.message}`)
    ),
    transports: [new winston.transports.Console()]
});

const config = ((...configs) => {
    for (let file of configs) {
        if (fs.existsSync(file)) {
            logger.info(`Read configuration file: ${file}`);
            return require(file);
        }
    }
    logger.error('No configuration file');
    return {};
})('./telegram_conf.json', './config.json');

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

// Express
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const host = config.server.host || '127.0.0.1';
const port = config.server.port || 8000;
const baseUrl = config.server.baseUrl || '/api/sendMsg';
const apiToken = config.server.apiToken;

const checkMap = new Map();

const getParam = (req) => {
    if (req.method === 'GET') {
        return req.query;
    } else if (req.method === 'POST' || req.method === 'PUT') {
        return req.body;
    } else {
        return {};
    }
};

const getTarget = (target) => {
    if (!config.mapping) {
        return target;
    } else {
        return config.mapping[target] || target;
    }
};

const returnMsg = (res, status, message, httpStatus, code) => res.status(httpStatus || 200).json({
    status: status,
    message: message || '',
    code: code,
});

const appHandler = (req, res) => {
    const param = getParam(req);
    if (param.token === apiToken) {
        if (param.checkcode && checkMap.has(param.checkcode)) {
            returnMsg(res, 'FAILED', 'The checkcode has been used', 200, 'BADCHECKCODE');
        } else {
            const target = getTarget(param.target);
            const message = param.message;
            const clientId = param.client || 'default';

            logger.info(`ClientID = ${clientId}, Target = ${target}, Message = ${message}`);
            if (!target) {
                returnMsg(res, 'FAILED', 'No target', 200, 'NOTARGET');
            } else if (!message) {
                returnMsg(res, 'FAILED', 'No message', 200, 'NOMESSAGE');
            } else {
                checkMap.set(param.checkcode, true);
                bot.sendMessage(target, message).then(() => {
                    returnMsg(res, 'SUCCESS');
                }).catch((err) => {
                    logger.error(`Error while sending message: `, err);
                    checkMap.set(param.checkcode, false);
                    let d = err.response || {};
                    d = d.body || {};
                    d = d.description || '';
                    returnMsg(res, 'FAILED', d, 200, err.code || 'ERROR');
                });
            }
        }
    } else {
        returnMsg(res, 'FAILED', 'Invalid token', 200, 'INVALIDTOKEN');
    }
};

app.get(baseUrl, appHandler);
app.post(baseUrl, appHandler);

app.listen(port, host, () => {
    logger.info(`Listening on ${host}:${port}...`);
});

app.use((err, req, res, next) => {
    logger.error('Error', err);
    returnMsg(res, 'ERROR', err.message, 500);
});
