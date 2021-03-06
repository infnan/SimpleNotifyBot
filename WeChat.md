微信特别说明
===

为保证机器人安全可靠，本程序采用[Puppeteer](https://github.com/GoogleChrome/puppeteer)框架模拟人工操作微信网页版。在运行之前请认真阅读以下说明，以免翻车：

* 登录
  * 微信需要扫码登录，程序提供了查看网页截图的接口，例如`http://127.0.0.1:8000/api/screenshot?token=abcdefg`。具体url可通过配置文件的`screenshotUrl`进行配置。
  * 手机微信换账号或主动下线会导致网页版微信自动退出，建议找个闲置的专用手机来挂微信。
  * 使用手机模拟器登微信会导致封号，如果需要模拟器，请自行Google破解方法（例如安装xposed和xprivacy）。
  * 使用多开软件或功能之前先搜索一下靠不靠谱。有的会导致封号，而小米手机系统自带的双开功能就比较靠谱。
* 技术限制
  * 因为本程序的原理是模拟真人在浏览器操作，所以发送消息的效率比较低，可能会有一点延迟，而且**不支持并发**。请注意控制发送频率，不要太多或太快，否则不能准确发送，甚至招致封号。
  * 服务器需要良好的网络。如果微信响应太慢，程序会以为未找到目标而报错。
  * 因为网页版无法准确获取微信号，所以本程序也无法准确获取微信号。
  * 本程序通过**备注名称**来识别用户和群组，发送消息的操作也是模拟在搜索框输入备注名称，因此请给目标用户或群组起一个**独一无二**的备注名，并且避免和拼音简写相仿（否则检索起来比较浪费时间），不要带有特殊符号，而且不要随便改名。
  * 建议不定期往filehelper或专门的“keep-alive”群组发送消息（例如[古城钟楼](https://www.weibo.com/supertimer)），以免掉线。另外建议不定期检查这种消息，以确认机器人状态是否正常。
  * 程序提供了mapping设置热加载的接口，例如`http://127.0.0.1:8000/api/reload?token=abcdefg`，这样便可在不退出微信的情况下重新加载设置。具体url可通过配置文件的`reloadUrl`进行配置。不提供url的话则不提供接口。
* 账号及人身安全
  * 微信官方不仅不支持机器人，而且会**积极封杀**机器人（相比之下QQ机器人程序就比较安全）。如果因各种原因被封号，后果自负。
  * 建议注册专门的小号。
  * 建议小号加两三个真实的好友，以便出事之后恢复账号。
  * 建议实名制注册，绑定手机和银行卡，再往钱包里放一块钱，然后在真实的手机挂几天，把账号状态弄稳定之后才进行机器人操作。
  * 请注意频繁登录或切换账号容易导致封号。
  * 有一种封号方式是只允许手机登录，禁止网页版登录。
  * **微信平台没有言论自由**，因为群里发一句牢骚话而遭警方喝茶的案例有一大堆，因此请注意自身安全。
  * 为保护自身安全，可在banwords.lst中维护敏感词列表（正则表达式），程序会自动将匹配词语换成“?”。
  * 如果您使用港澳台或外国手机号注册微信：有消息指出，在敏感时期，使用中国大陆手机号注册与使用其他地区手机号注册的用户，即使都在同一群中，两方的消息也是不互通的，中国大陆收不到港澳台及外国用户的消息，港澳台及外国用户收不到中国大陆用户消息。
