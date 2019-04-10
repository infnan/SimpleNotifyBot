# SimpleNotifyBot
基于HTTP API和聊天软件的简易消息通知机器人。对指定URL发送请求，使机器人直接向目标发送消息。

目前支持：
* Telegram
* 微信（[请认真阅读特别说明，以免翻车](https://github.com/infnan/SimpleNotifyBot/blob/master/WeChat.md)）

## 安装方法
以Telegram为例：

1. 申请Telegram的机器人，记录其Token（操作方法请自行Google）。
2. 将`telegram_conf.example.json`改名为`telegram_conf.json`，然后修改：
```js
{
    "telegram": {
        "token": "Telgram机器人的Token",
        "whoisCommand": true              // 启动之后用/whois命令获取chatID
    },
    "server": {
        "host": "0.0.0.0",                // 监听地址
        "port": 8000,                     // 监听端口
        "baseUrl": "/api/sendMsg",        // 指定url
        "apiToken": "你自己用来认证的token"
    },
    "mapping": {
        "mygroup": "-123123"              // target别名。将target指定为mygroup相当于向chatID为-123123的群组发送消息。
    }
}
```
3. 运行
```
npm install
node telegram.js
```
4. API需要传入三个参数：token、target、message，分别表示“你自己用来认证的token”、目标用户或群组的chatId、消息内容。可以使用GET、POST（application/x-www-form-urlencoded或JSON）三种方式使机器人往指定群组发消息，例如`curl 'http://127.0.0.1:8000/api/sendMsg?token=你自己用来认证的token&target=-123123123&message=YourMessage'`或`curl -X POST -d 'token=你自己用来认证的token&target=-123123123&message=YourMessage' http://127.0.0.1:8000/api/sendMsg`
5. 接口会返回一个JSON，例如
```json
{"status":"SUCCESS","message":""}
```
status分为三个状态，SUCCESS成功、FAILED失败、ERROR服务器错误，具体错误信息可通过message和code参数来判断。另外，为了安全起见，部分接口在token不正确时会返回404。

## 其他事项
* 将接口暴露到公网的话，建议采取HTTPS、访问控制、速率限制、HTTP认证等安全性措施，这可以通过在应用外头套一层Nginx/Caddy来实现。
* 本程序使用了[Puppeteer](https://github.com/GoogleChrome/puppeteer)框架，在中国安装时需要挂代理。但是，如果不使用微信的话，可以直接忽略此依赖。

