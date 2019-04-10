'use strict';

const puppeteer = require('puppeteer');
const async = require('async');

const { logger, MessageError, getConfig, startApp } = require('./common.js');
let config = getConfig('./wechat_conf.json', './config.json');

// 用await延时
const sleep = (timeout) => new Promise((resolve, reject) => { setTimeout(() => resolve(), timeout); });

(async () => {

    // 开启无头浏览器
    const browser = await puppeteer.launch({
        headless: true,
    });

    const page = (await browser.pages())[0];                 // 取浏览器第一个Tab页
    await page.setViewport({ width: 1366, height: 768 });    // 浏览器窗口大小

    // 使用简体中文界面
    await page.goto('https://wx.qq.com/?lang=zh_CN');

    const sendMessage = async (target, message) => {

        // 判断是否登录
        const unloginTest = await page.$('body.unlogin');
        if (unloginTest) {
            throw new MessageError('Not login', 'NOLOGIN');
        }

        if (!target) {
            throw new MessageError('Target not found', 'NOTARGET');
        }

        // 如果当前聊天就是目标，那么不用搜了，直接蹦到聊天框
        const testEle1 = await page.$('#chatArea a.title_name');
        const test1 = await (await testEle1.getProperty('textContent')).jsonValue();
        
        if (test1 !== target) {
            const searchEle = await page.$('#search_bar > input');

            // 清空搜索框和搜索结果
            await page.$eval('#search_bar input', node => node.value = '');
            await searchEle.focus();
            await searchEle.type(' ');
            await searchEle.press('Backspace');
            // 延时，使页面上原有的搜索结果消失
            for (let timeout = 40; timeout >= 0; timeout--) {
                const testEle2 = await page.$('#search_bar div.mmpop');
                if (!testEle2) {
                    break;
                }
                await sleep(50);
            }

            // 输入目标群组名称
            await searchEle.type(target);

            // 等待出现搜索结果，最长等待5秒
            let ok = false;
            for (let timeout = 100; timeout >= 0; timeout--) {
                const testEle3 = await page.$('#search_bar div.mmpop h4.contact_title');
                if (testEle3) {
                    const test3 = await (await testEle3.getProperty('textContent')).jsonValue();
                    if (test3 === '找不到匹配的结果') {
                        throw new MessageError('Target not found', 'NOTARGET');
                    } else {
                        ok = true;
                        break;
                    }
                }
                await sleep(50);
            }
            if (!ok) {
                throw new MessageError('WeChat not responding', 'NORESPONSE');
            }

            // 遍历搜索结果
            // 由于overflow数字不大，且翻页需要消耗操作和等待网络请求的时间，建议目标名称独一无二，免得不好找。
            const pop = await page.$('#search_bar div.mmpop');
            let lastname = '';
            ok = false;
            for (let overflow = 100; overflow >= 0; overflow--) {
                const nowEle = await pop.$('div.contact_item.on');
                // 说明正在loading
                if (!nowEle) {
                    await sleep(50);
                    continue;
                }
                let currname = await (await (await nowEle.$('h4')).getProperty('textContent')).jsonValue();
                if (lastname === currname) {
                    // 未找到目标，结束
                    ok = false;
                    break;
                }
                lastname = currname;

                // 如果没找到而且能往下翻那么就继续往下翻
                // 找到的话按一下回车键，进入聊天界面
                if (currname === target) {
                    ok = true;
                    await searchEle.press('Enter');
                    break;
                } else {
                    await searchEle.press('ArrowDown');

                    // 等待微信响应
                    for (let timeout = 10; timeout >= 0; timeout--) {
                        const nowEle2 = await pop.$('div.contact_item.on');
                        if (nowEle2) {
                            let currname2 = await (await (await nowEle2.$('h4')).getProperty('textContent')).jsonValue();
                            if (currname !== currname2) {
                                break;
                            }
                            await sleep(20);
                        } else {
                            // 暂时到底了，需要loading
                            await sleep(200);
                        }
                    }
                }
            }
            if (!ok) {
                throw new MessageError('Target not found', 'NOTARGET');
            }

            // 等待进入聊天界面
            for (let timeout = 50; timeout >= 0; timeout--) {
                const titleEle = await page.$('#chatArea a.title_name');
                const title = await (await titleEle.getProperty('textContent')).jsonValue();
                if (title === target) {
                    break;
                }
                await sleep(20);
            }
        }

        const testEle4 = await page.$('#chatArea a.title_name');
        const test4 = await (await testEle4.getProperty('textContent')).jsonValue();
        if (test4 === target) {
            // 输入消息
            await page.$eval('#editArea', node => node.textContent = '');

            const editEle = await page.$('#editArea');
            await editEle.focus();
            for (const [i, line] of message.split('\n').entries()) {
                if (i > 0) {
                    // 发送多行消息时需要用 Ctrl+Enter 换行
                    await page.keyboard.down('Control');
                    await page.keyboard.press('Enter');
                    await page.keyboard.up('Control');
                }
                await editEle.type(line);
            }

            // 按下发送按钮
            await page.keyboard.press('Enter');
        } else {
            throw new MessageError('Target not confirmed', 'NORESPONSE');
        }
    };

    // 模拟浏览器操作，每次操作需要花点时间，而且不支持并行，所以需要使用队列处理
    const queue = async.queue((param, callback) => {
        sendMessage(param.target, param.message).then(() => {
            callback(null);
        }).catch((err) => {
            callback(err);
        });
    }, 1);

    // 启动API
    const app = startApp({
        config,
        sendMessage: (target, message) => new Promise((resolve, reject) => {
            queue.push({ target, message }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }),
    });

    // 以下是其他API

    // 获取网页截图
    app.get(config.wechat.screenshotUrl, async (req, res, next) => {
        if (req.query.token === config.server.apiToken) {
            const buffer = await page.screenshot({
                fullPage: true,
            });
            res.status(200).header({'Content-Type': 'image/png'}).send(buffer);
        } else {
            res.status(404);
            next();
        }
    });

    // 检测是否登录
    if (config.wechat.isLoginUrl) {
        app.get(config.wechat.isLoginUrl, async (req, res, next) => {
            if (req.query.token === config.server.apiToken) {
                // 判断是否登录
                const unloginTest = await page.$('body.unlogin');
                if (unloginTest) {
                    res.status(200).json({
                        isLogin: false,
                    });
                } else {
                    res.status(200).json({
                        isLogin: true,
                    });
                }
            } else {
                res.status(404);
                next();
            }
        });
    }

    // 重新加载设置（实际上仅限token和mapping）
    if (config.wechat.reloadUrl) {
        app.get(config.wechat.reloadUrl, (req, res, next) => {
            if (req.query.token === config.server.apiToken) {
                try {
                    const newconfig = getConfig('./wechat_conf.json', './config.json');

                    config.server = newconfig.server;
                    config.mapping = newconfig.mapping;

                    res.status(200).json({
                        status: 'SUCCESS',
                        message: '',
                    });
                } catch (e) {
                    logger.error(`Error reading config: `, e);
                    res.status(200).json({
                        status: 'FAILED',
                        message: e.message,
                    });
                }
            } else {
                res.status(404);
                next();
            }
        });
    }
})();
