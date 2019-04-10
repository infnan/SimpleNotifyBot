/**
 * 各聊天软件机器人所用的公共方法
 */
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const winston = require('winston');

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

const getParam = (req) => {
    if (req.method === 'GET') {
        return req.query;
    } else if (req.method === 'POST' || req.method === 'PUT') {
        return req.body;
    } else {
        return {};
    }
};

const getTarget = (mapping, target) => {
    if (!mapping) {
        return target;
    } else {
        return mapping[target] || target;
    }
};

const returnMsg = (res, status, message, httpStatus, code) => res.status(httpStatus || 200).json({
    status: status,
    message: message || '',
    code: code,
});

const readJson = (path) => {
    const str = fs.readFileSync(require.resolve(path));
    return JSON.parse(str);
};

class MessageError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}

module.exports = {
    logger,
    MessageError,

    getConfig: (...configs) => {
        for (let file of configs) {
            if (fs.existsSync(file)) {
                logger.info(`Read configuration file: ${file}`);
                return readJson(file);
            }
        }
        logger.error('No configuration file');
        return {};
    },

    startApp: (options) => {
        const config = options.config || {};

        // Express
        const app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));

        const host = config.server.host || '127.0.0.1';
        const port = config.server.port || 8000;
        const baseUrl = config.server.baseUrl || '/api/sendMsg';

        const checkMap = new Map();

        const appHandler = (req, res) => {
            // 获取参数
            const param = getParam(req);
            // 校验token
            if (param.token === config.server.apiToken) {
                if (param.checkcode && checkMap.has(param.checkcode)) {
                    // 可以通过传入checkcode来防止重复发送消息
                    returnMsg(res, 'FAILED', 'The checkcode has been used', 200, 'BADCHECKCODE');
                } else {
                    const target = getTarget(config.mapping, param.target);
                    const message = param.message;
                    const clientId = param.client || 'default';

                    logger.info(`ClientID = ${clientId}, Target = ${target}, Message = ${message}`);
                    if (!target) {
                        returnMsg(res, 'FAILED', 'No target', 200, 'NOTARGET');
                    } else if (!message) {
                        returnMsg(res, 'FAILED', 'No message', 200, 'NOMESSAGE');
                    } else {
                        checkMap.set(param.checkcode, true);

                        // 发送消息
                        options.sendMessage(target, message).then(() => {
                            returnMsg(res, 'SUCCESS');
                        }).catch((err) => {
                            logger.error(`Error while sending message: `, err);
                            checkMap.set(param.checkcode, false);
                            returnMsg(res, 'FAILED', err.message, 200, err.code || 'ERROR');
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

        // 使500报错也返回JSON，并防止页面暴露一些隐私
        app.use((err, req, res, next) => {
            logger.error('Error', err);
            returnMsg(res, 'ERROR', err.message, 500);
        });

        return app;
    },
};
