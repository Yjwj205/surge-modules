# 可莉 Loon 插件 → Surge 模块

把 [可莉插件中心 275 个 Loon 插件](https://github.com/Yjwj205/loon-kelee-archive) 全量转换为 Surge 模块。
转换时间：2026-11-12 · 共 **275** 个模块

## 安装

Surge → 首页「模块」→ 安装新模块，粘贴对应 `raw` 地址：

```
https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/<文件名>.sgmodule
```

按需安装即可，**不要一次全装**：规则会插入到规则列表顶部，装太多会互相干扰、也会明显变慢。

## 转换规则（做了什么）

| Loon | Surge | 说明 |
|---|---|---|
| `[Rule]` | `[Rule]` | 规则类型完全对应；`REJECT-DICT` → `REJECT`，`REJECT-IMG` → `REJECT-TINYGIF` |
| `reject(404)` / `reject_dict(200)` / `reject_img(200)` | `[Map Local]` | 返回空响应 / `{}` / 1px GIF，状态码一致 |
| `response.body.mock(json, ...)` | `[Map Local]` | Loon 在请求上游前就生成响应，与 Map Local 等价；body 用 base64 存入，避免引号转义问题 |
| `redirect(307, url)` | `[URL Rewrite] ... 307` | 保持 307 |
| `url.replace(url)` | `[URL Rewrite] ... header` | 透明改写 |
| `request/response.header.*` | `[Header Rewrite]` | `set` → `header-replace` |
| `response.json.jq/delete/replace/jq_file` | `[Body Rewrite] ...-jq` | Surge 原生 jq，表达式原样搬运；已用 jq 1.7 逐条校验 |
| `response.body.replace` | `[Body Rewrite]` 正则 | — |
| `script(...)` | `[Script]` | `requires_body` → `requires-body=1`、`binary_body_mode` → `binary-body-mode=1`、`max-size=-1` |
| `cron` / `generic` / `network-changed` | `type=cron` / `generic` / `event` | 事件名 `network-changed` |
| `[MitM] hostname` | `[MITM] hostname = %APPEND%` | 模块只追加，不覆盖你的配置 |
| `[Argument]` | `#!arguments` | 开关/输入框变成 Surge 的参数表；`switch` 以 `true/false` 字符串存在 |

脚本全部本地化到本仓库 `scripts/`，**不再依赖 kelee.one**；源站以后加密也不影响。

## 已知限制

1. **策略参数**：规则里出现 `PROXY` 的模块会生成参数 `policy`（默认 `PROXY`）。如果你的配置里没有叫 `PROXY` 的策略或策略组，请在模块参数里改成自己的（例如 `Proxy`）。
2. **`REJECT-DICT` 语义**：Surge 没有该策略，已改为 `REJECT`。部分 App 期待拿到 `{}` 而不是错误页，可能表现不同（共 16 条规则）。
3. **`header.set`**：Surge 的 `header-replace` 在该 Header 不存在时不会新建（影响 1 条规则）。
4. **Loon 专用脚本**：少数脚本直接读 `$loon`，Surge 下会抛错、插件功能不生效，已在表中标注「⚠️ Loon 专用脚本」。
5. **脚本参数**：Loon 的 `$argument` 是对象，Surge 是字符串。已给需要的 2 个脚本加兼容垫片（`__arg`），其余脚本本身兼容。
6. **`[General] real-ip`**：映射为 `always-real-ip`。
7. **MITM 覆盖**：个别插件的改写目标不在其 MitM 列表里（原插件即如此），未自动补齐，见文末清单。

## 校验方式

- 275 个模块全部通过段落/规则类型/正则可编译/字段完整性检查；
- 全部 jq 表达式用 `jq 1.7` 逐条解析（1 条仅在空输入时报运行期错，实际响应下正常）；
- 95 个本地脚本全部通过 `node --check`，并用模拟 Surge 运行时（`$request`/`$response`/`$done`/`$httpClient`/`$environment`…）做了冒烟执行；
- 183 处脚本引用逐个确认文件存在。

## 模块索引



### 去广告（254）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [12306去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/12306_remove_ads.sgmodule) | 过滤12306应用内广告及开屏广告 | 1 | 1 | 1 |
| [123云盘去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/123NetWorkDisk_remove_ads.sgmodule) | 移除开屏广告、应用内横幅广告。 | 0 | 0 | 1 |
| [360摄像机去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/360SmartCamera_remove_ads.sgmodule) | 移除开屏广告、首页推广、底栏商城入口及我的页面推广。 | 2 | 0 | 1 |
| [360智慧生活去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SafetyHome_remove_ads.sgmodule) | 移除开屏广告、首页推广横幅、商城入口及我的页面推广。 | 1 | 0 | 1 |
| [36氪去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/36Kr_remove_ads.sgmodule) | 移除开屏广告、首页右上角运营位、信息流广告、文末广告，移除相关文章推荐、大家都在看及皮肤配置… | 2 | 0 | 12 |
| [555电影去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/555DY_remove_ads.sgmodule) | 移除开屏广告和各类横幅广告，支持iPadOS。 | 0 | 0 | 1 |
| [5EPlay去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/5EPlay_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、活动角标、商城。 | 0 | 0 | 4 |
| [B612咔叽去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SnowCamera_remove_ads.sgmodule) | 移除开屏广告、弹窗及拍摄页面底部横幅广告。 | 3 | 0 | 0 |
| [CC直播去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CCLive_remove_ads.sgmodule) | 移除信息流推广和横幅，精简顶部标签。 | 0 | 0 | 7 |
| [DJ多多去广告 ⚠️Loon专用脚本](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DjDuoDuo_remove_ads.sgmodule) | 移除开屏广告及歌单广告 | 0 | 1 | 0 |
| [DREAME去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DREAME_remove_ads.sgmodule) | 移除开屏广告、首页大图推广、横幅推广，精简底栏，阻止桌面图标替换。仅支持2.5.1版。 | 0 | 0 | 5 |
| [Dlabel云标签去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Dlabel_remove_ads.sgmodule) | 移除开屏广告及首页横幅。 | 0 | 0 | 2 |
| [ECOVACS HOME去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/EcovacsHome_remove_ads.sgmodule) | 移除横幅推广，精简底栏。 | 0 | 0 | 3 |
| [Foodie去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Foodie_remove_ads.sgmodule) | 移除开屏广告和弹窗广告 | 3 | 0 | 0 |
| [Google搜索重定向](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Google.sgmodule) | 将Google搜索重定向至.com域名，如遇频繁跳转请禁用本插件。 | 0 | 0 | 2 |
| [HTTPDNS拦截器 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Block_HTTPDNS.sgmodule) | 此插件是所有去广告插件的依赖，拦截常见的HTTPDNS服务，以确保这些请求都能够在Loon的… | 160 | 0 | 6 |
| [Hong Kong Toolbar去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/HongKongToolbar_remove_ads.sgmodule) | 移除开屏互动广告、直播前贴片广告及视频广告 | 2 | 0 | 0 |
| [IT之家去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/IThome_remove_ads.sgmodule) | 过滤IT之家信息流广告和文末广告，自定义移除置顶和轮播图，自定义移除项需在插件配置。 | 0 | 1 | 1 |
| [Jump去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Jump_remove_ads.sgmodule) | 移除Jump开屏广告 | 7 | 0 | 2 |
| [KOOK去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KOOK_remove_ads.sgmodule) | 移除开屏广告、房间横幅推广、促销活动、精简发现页面频道及我的页面，移除底栏商城入口。 | 0 | 0 | 5 |
| [Keep去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Keep_remove_ads.sgmodule) | 移除开屏广告、搜索推荐和弹窗广告，精简底栏和首页标签。移除关注推荐、文章相关推荐和信息流中的… | 1 | 0 | 13 |
| [Line去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Line_remove_ads.sgmodule) | 移除Line各类广告 | 15 | 0 | 19 |
| [OKOK去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/OKOK_remove_ads.sgmodule) | 移除开屏广告、横幅广告，精简首页，拦截优惠购页面。 | 0 | 0 | 4 |
| [PICOOC去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PICOOC_remove_ads.sgmodule) | 移除开屏广告、悬浮广告，拦截发现页，精简我的页面。 | 0 | 0 | 5 |
| [Pinterest去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Pinterest_remove_ads.sgmodule) | 移除瀑布流、更多探索内容中的广告 | 0 | 0 | 2 |
| [QQ链接解锁](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QQ_Redirect.sgmodule) | 解除QQ内访问非白名单之外的地址提示停止访问该页面的限制，并移除跟踪参数，使用前需要清除QQ… | 0 | 0 | 8 |
| [QQ音乐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QQMusic_remove_ads.sgmodule) | 过滤QQ音乐广告 | 11 | 0 | 0 |
| [RQrun去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/RQrun_remove_ads.sgmodule) | 移除开屏广告 | 0 | 0 | 1 |
| [Reddit去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Reddit_remove_ads.sgmodule) | 过滤应用内推广，阻止NSFW提示。 | 0 | 0 | 1 |
| [ReelShort去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ReelShort_remove_ads.sgmodule) | 移除开屏广告、为你推荐及各类弹窗，移除搜索栏填充词。 | 0 | 0 | 5 |
| [Roborock去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Roborock_remove_ads.sgmodule) | 移除横幅、活动推广、机器人图标，精简服务中心。 | 0 | 0 | 4 |
| [Sofascore去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Sofascore_remove_ads.sgmodule) | 移除横幅及信息流广告 | 0 | 0 | 2 |
| [Soul去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Soul_remove_ads.sgmodule) | 移除开屏广告、移除话题页面热Soul话题、移除评论区礼物榜、移除更新提示、移除青少年弹窗、移… | 14 | 1 | 3 |
| [Spotify去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Spotify_remove_ads.sgmodule) | 移除播放广告，恢复歌手和专辑列表的正常展示。修改插件自定义配置项需要重新登陆方可生效。 | 1 | 1 | 2 |
| [Telegram重定向](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TelegramRedirect.sgmodule) | 适用于安装了多个不同Telegram客户端的用户，用于在指定客户端中打开公开或私有群组及频道… | 0 | 0 | 2 |
| [TeraBox去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TeraBox_remove_ads.sgmodule) | 移除开屏广告、应用内悬浮窗、弹窗广告及横幅广告。 | 1 | 0 | 4 |
| [TubeMax去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TubeMax_remove_ads.sgmodule) | 过滤TubeMax广告 | 9 | 0 | 1 |
| [Tumblr去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Tumblr_remove_ads.sgmodule) | 移除信息流广告 | 0 | 0 | 1 |
| [Uki去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Uki_remove_ads.sgmodule) | 移除开屏广告、应用内悬浮窗，各类横幅、信息流广告、搜索填充词、我的页面广告。 | 0 | 4 | 6 |
| [WakeUp课程表去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WakeupSchedule_remove_ads.sgmodule) | 移除横幅广告、弹窗广告，精简我的页面。 | 0 | 0 | 2 |
| [YY去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YY_Voice_remove_ads.sgmodule) | 移除开屏广告、应用内弹窗，精简底栏和我的页面。 | 3 | 0 | 7 |
| [YY语音去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YYVoiceTool_remove_ads.sgmodule) | 移除开屏广告、应用内弹窗、任务推广、频道横幅推广，精简广场顶部标签。 | 0 | 0 | 5 |
| [YouTube去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YouTube_remove_ads.sgmodule) | 移除YouTube视频、瀑布流、搜索和Shorts中的广告，移除底栏的Shorts按钮和上传… | 0 | 3 | 0 |
| [ZAKER去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ZAKER_remove_ads.sgmodule) | 移除开屏广告、置顶轮播图广告和文末广告。 | 0 | 0 | 6 |
| [e充电去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/EasyCharge_remove_ads.sgmodule) | 移除开屏广告、活动及发现页面，精简我的页面。 | 1 | 0 | 6 |
| [一刻相册去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BaiduPhoto_remove_ads.sgmodule) | 移除开屏广告、横幅广告和弹窗推广。 | 0 | 0 | 3 |
| [一甜相机去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Yitian_remove_ads.sgmodule) | 移除开屏广告、悬浮广告及图片选择器横幅广告。 | 0 | 0 | 3 |
| [七猫小说去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SevenCat_remove_ads.sgmodule) | 移除大部分七猫小说广告，但受限于七猫小说自身对MitM和VPN状态的检测，部分页面广告无法移… | 3 | 0 | 14 |
| [下厨房去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XiaChuFang_remove_ads.sgmodule) | 移除开屏广告、页面推广及横幅，精简首页标签。 | 0 | 0 | 7 |
| [两步路户外助手去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/2bulu_remove_ads.sgmodule) | 移除开屏广告、弹窗广告，精简我的页面。 | 0 | 0 | 4 |
| [中华万年历去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/EtouchEcalendar_remove_ads.sgmodule) | 移除开屏广告、弹窗、信息流推广，精简我的页面。 | 1 | 0 | 7 |
| [中国人保去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PICC_Insurance_remove_ads.sgmodule) | 移除中国人保开屏广告和应用内广告 | 0 | 2 | 3 |
| [中国天气去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WeatherChina_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅广告，移除焦点视频、精简我的页面。 | 0 | 0 | 1 |
| [中国移动云盘去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/mobileClouds_remove_ads.sgmodule) | 移除中国移动云盘开屏广告及应用内广告，首页的多余卡片可滑到最底部自定义隐藏掉，插件对此不做处… | 0 | 2 | 0 |
| [丰巢去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FC_Box_remove_ads.sgmodule) | 移除弹窗，精简首页和生活服务。此插件需要IPA签名方可使用，App Store用户请勿使用此… | 0 | 0 | 10 |
| [乐播投屏去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TV_Assistant_remove_ads.sgmodule) | 移除开屏广告、首页横幅推广、全网全网热投榜，移除我的页面横幅推广。 | 0 | 1 | 5 |
| [书旗小说去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ShuQiCenterReader_remove_ads.sgmodule) | 移除书城横幅广告、听书广告、阅读广告、章末推荐、福利入口、悬浮窗、推荐搜索词，精简我的页面。 | 1 | 1 | 4 |
| [云鲸智能去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/NarwelRobots_remove_ads.sgmodule) | 移除开屏广告、横幅推广，禁用商城。 | 0 | 0 | 3 |
| [京东去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/JD_remove_ads.sgmodule) | 移除京东开屏广告，精简我的页面产品推广。 | 1 | 1 | 2 |
| [京东外卖去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/JDWaimai_remove_ads.sgmodule) | 移除首页推广、点评页面非美食内容、购物车及我的页面推荐、搜索发现、搜索榜单，精简我的页面。 | 0 | 0 | 6 |
| [亲宝宝去广告 ⚠️Loon专用脚本](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Qbb_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、广告下发、用户行为上报，精简搜索页、育儿页和我的页面，拦截商城页面。 | 1 | 2 | 8 |
| [什么值得买去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/smzdm_remove_ads.sgmodule) | 移除开屏广告、信息流广告、各类横幅广告、搜索页广告、文章内广告，移除活动皮肤、精简我的页面。 | 1 | 0 | 22 |
| [他趣去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Taqu_remove_ads.sgmodule) | 移除各类弹窗、横幅，精简我的页面。 | 0 | 0 | 12 |
| [优酷视频去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YouKu_Video_remove_ads.sgmodule) | 移除开屏广告、视频广告、信息流广告。其余广告由于请求已加密，故无法移除。 | 24 | 0 | 2 |
| [健康160去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/91160_remove_ads.sgmodule) | 移除开屏广告、应用内悬浮窗、弹窗广告、横幅广告，精简我的页面。 | 0 | 0 | 11 |
| [全民K歌去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QQKSong_remove_ads.sgmodule) | 移除开屏广告、歌房页面弹窗广告、消息页广告和我的页面广告。 | 34 | 0 | 5 |
| [凤凰新闻去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ifengNews_remove_ads.sgmodule) | 移除皮肤、开屏广告、信息流广告、文末广告、视频流广告、评论区广告，移除信息流订阅号文章、文末… | 0 | 0 | 22 |
| [创维智慧云去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SkyworthDigitalPicamera_remove_ads.sgmodule) | 移除开屏广告、横幅广告。 | 0 | 0 | 1 |
| [前程无忧去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/51Job_remove_ads.sgmodule) | 移除开屏广告、弹窗、信息流推广、职位页面推广和各类横幅推广。 | 0 | 0 | 11 |
| [剑网三无界去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SeasunJX3_remove_ads.sgmodule) | 移除热门推送活动，并解决无法在Loon运行时更新和登录的问题。 | 0 | 0 | 1 |
| [医考帮去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YiKaoBang_remove_ads.sgmodule) | 移除横幅推广、弹窗、首页悬浮挂件。 | 0 | 0 | 2 |
| [华住会去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/HantingHotels_remove_ads.sgmodule) | 移除弹窗、横幅，精简首页。 | 0 | 0 | 7 |
| [华尔街见闻去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FinanceNews_remove_ads.sgmodule) | 移除开屏广告、文末广告、信息流广告，精简底栏。 | 0 | 0 | 11 |
| [南网在线去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CSG_remove_ads.sgmodule) | 移除首页推广，精简搜索页和我的页面。 | 0 | 0 | 3 |
| [口袋壁纸去广告 ⚠️Loon专用脚本](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ShoujiDesk_remove_ads.sgmodule) | 移除悬浮广告，精简我的页面。 | 0 | 1 | 2 |
| [叮咚买菜去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DingdongMaicai_remove_ads.sgmodule) | 移除开屏广告、弹窗推广、搜索推荐、信息流广告、悬浮广告、各页面购物推荐、精简我的页面，移除底… | 3 | 0 | 19 |
| [可莉广告过滤器 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Remove_ads_by_keli.sgmodule) | 可莉自用的广告过滤器 | 24 | 0 | 82 |
| [向日葵去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/OraySunlogin_remove_ads.sgmodule) | 移除开屏广告、广告横幅。 | 0 | 0 | 1 |
| [启信宝去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QiXinBao_remove_ads.sgmodule) | 移除开屏广告、应用内弹窗、首页轮播图、悬浮部件和个性化推荐信息流。 | 0 | 0 | 10 |
| [哈罗去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/EasyBike_remove_ads.sgmodule) | 移除开屏广告及歌单广告 | 0 | 1 | 0 |
| [哔哩哔哩去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Bilibili_remove_ads.sgmodule) | 过滤哔哩哔哩广告、移除青少年模式弹窗和交互式弹幕、移除无用功能和链接跟踪参数，增加空降助手以… | 6 | 4 | 20 |
| [哔哩哔哩漫画去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BiliComic_remove_ads.sgmodule) | 移除开屏广告、应用内悬浮窗、各类横幅广告、你可能喜欢、小说推荐、首页弹窗，精简首页标签、底栏… | 0 | 2 | 11 |
| [喜马拉雅去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Himalaya_remove_ads.sgmodule) | 移除开屏广告、播放器广告、各类推荐内容，精简频道和我的页面。 | 5 | 0 | 22 |
| [图怪兽去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TuGuaiShou_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、各页面横幅推广。 | 0 | 0 | 3 |
| [堆糖去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DuiTang_remove_ads.sgmodule) | 移除开屏广告、信息流广告、热搜排行榜广告、我的页面横幅广告，移除关注推荐，精简底部导航栏。 | 0 | 0 | 6 |
| [墨迹天气去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MojiWeather_remove_ads.sgmodule) | 移除天气页面横幅、工具栏，移除时景关注页面推荐，精简我的页面。 | 0 | 0 | 7 |
| [多屏互动去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TCLnScreen_remove_ads.sgmodule) | 移除开屏广告、横幅推广、搜索填充词，移除广告下发。 | 0 | 0 | 6 |
| [大姨妈月经期助手去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Dayima_remove_ads.sgmodule) | 移除信息流广告，精简首页金刚位及我的页面。 | 0 | 0 | 5 |
| [大麦去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Damai_remove_ads.sgmodule) | 移除开屏广告、轮播图广告和弹窗广告，移除搜索填充词和专属推荐。 | 0 | 0 | 5 |
| [天天跳绳去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CrazyRope_remove_ads.sgmodule) | 移除开屏广告、横幅广告、弹窗广告、活动推广，精简首页标签和搜索页面。 | 0 | 0 | 10 |
| [天气通去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TianQiTong_remove_ads.sgmodule) | 移除开屏广告、横幅广告、弹窗广告，精简底栏及我的页面。 | 0 | 0 | 6 |
| [天气预报去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/iReaderCityWeather_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅广告、悬浮挂件，精简我的页面。 | 2 | 0 | 1 |
| [天猫校园去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TmallCampus_remove_ads.sgmodule) | 移除广告配置、开屏广告、弹窗广告、AI助手、促销模块，精简我的页面。 | 0 | 0 | 6 |
| [夸克去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QuarkBrowser_remove_ads.sgmodule) | 移除阅读广告、各页面弹窗及横幅，精简我的页面。 | 0 | 0 | 3 |
| [夸克扫描王去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QuarkScanking_remove_ads.sgmodule) | 移除弹窗广告、横幅广告，精简我的页面。 | 0 | 0 | 2 |
| [好轻去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YunmaiScale_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅推广、商品推广，精简我的页面。 | 0 | 0 | 5 |
| [威锋去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WPForum_remove_ads.sgmodule) | 移除开屏广告、信息流广告、文末广告、首页轮播图推广。 | 0 | 0 | 2 |
| [学习通去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ChaoXingStudy_remove_ads.sgmodule) | 移除开屏广告、横幅推广，精简校园补给站频道。 | 0 | 0 | 7 |
| [完美世界电竞去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PerfectWorldEsport_remove_ads.sgmodule) | 移除开屏广告，精简搜索页。 | 0 | 0 | 2 |
| [宝宝树孕育去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BabyTree_remove_ads.sgmodule) | 过滤宝宝树孕育广告 | 3 | 3 | 2 |
| [小喵看书去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MiaoRead_remove_ads.sgmodule) | 移除小喵看书章末广告 | 0 | 0 | 1 |
| [小宇宙去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CosmosPodcast_remove_ads.sgmodule) | 移除开屏广告、搜索框推荐词和AI总结。 | 0 | 0 | 5 |
| [小店掌柜去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ShopKeeperAdmin_remove_ads.sgmodule) | 移除开屏广告、活动推广和页面跳转。 | 0 | 0 | 1 |
| [小桔充电去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XiaojukejiCharge_remove_ads.sgmodule) | 移除横幅广告、弹窗广告，精简我的页面。 | 0 | 0 | 5 |
| [小白智慧打印去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XiaobaiPrint_remove_ads.sgmodule) | 移除开屏广告、首页推广金刚位、热门内容推荐、横幅广告、搜索填充词、搜索发现，精简我的页面。账… | 2 | 0 | 5 |
| [小睡眠去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/HeartideBrainWave_remove_ads.sgmodule) | 移除开屏广告、信息流广告、弹窗广告、轮播图广告、侧边栏横幅广告，精简搜索页面。 | 0 | 0 | 12 |
| [小米音箱去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XiaomiSpeaker_remove_ads.sgmodule) | 移除开屏广告、应用内横幅广告及弹窗广告。 | 0 | 0 | 3 |
| [小红书去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/RedPaper_remove_ads.sgmodule) | 过滤信息流推广，移除图片及视频水印，如有异常，请先清除缓存再尝试。 | 1 | 12 | 9 |
| [小蚕霸王餐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XiaoCan_remove_ads.sgmodule) | 移除开屏广告、首页横幅推广、红包推广、更新弹窗。 | 0 | 0 | 4 |
| [小象超市去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/iMaiCai_remove_ads.sgmodule) | 移除开屏广告、应用内弹窗、猜你想买、横幅推广和悬浮窗。 | 0 | 1 | 7 |
| [小黑盒去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XiaoHeiHe_remove_ads.sgmodule) | 移除开屏广告和热点板块信息流广告 | 0 | 0 | 2 |
| [帆书去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KebidaDushu_remove_ads.sgmodule) | 移除弹窗和会员任务，精简首页、听书页面、课程菜单和我的页面。 | 0 | 9 | 9 |
| [广告平台拦截器](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BlockAdvertisers.sgmodule) | 此插件是所有去广告插件的依赖，只针对广告平台处理。你依然需要安装其他去广告插件来搭配使用，并… | 346 | 0 | 4 |
| [库街区去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuroBBS_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、搜索页面的热搜及话题热榜。 | 0 | 0 | 4 |
| [彩云天气去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ColorfulClouds_remove_ads.sgmodule) | 移除首页推广、弹窗、悬浮窗、底栏天气助手和工具箱入口，移除我的页面广告横幅。 | 3 | 1 | 2 |
| [得物去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Dewu_remove_ads.sgmodule) | 移除开屏广告、弹窗、搜索词填充、热搜榜、猜你想搜、推荐关注、推荐信息流，精简消息中心和我的页… | 0 | 0 | 11 |
| [得间小说去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/iReaderDejian_remove_ads.sgmodule) | 移除开屏广告、章末广告，移除扉页广告提示、听书界面广告提示、搜索栏填充词。 | 2 | 0 | 6 |
| [微信公众号去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Weixin_Official_Accounts_remove_ads.sgmodule) | 过滤微信公众号广告 | 1 | 0 | 2 |
| [微信小程序去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WexinMiniPrograms_Remove_ads.sgmodule) | 收录常用小程序的去广告，作者署名在插件内。 | 6 | 12 | 118 |
| [微博去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Weibo_remove_ads.sgmodule) | 过滤微博广告及去除各部分推广模块 | 3 | 20 | 18 |
| [微博轻享版去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Weibo_intl_remove_ads.sgmodule) | 移除开屏广告、时间线广告及评论区广告，移除发现页面横幅推广、最常访问、主页访客及热门视频，移… | 0 | 0 | 14 |
| [微店去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Weidian_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、猜你喜欢、猜你想搜、关注推荐，精简搜索页和我的页面。 | 0 | 2 | 12 |
| [微脉圈去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Weimai_remove_ads.sgmodule) | 移除开屏广告、聊天页横幅提示及发现页面的横幅广告。 | 0 | 0 | 2 |
| [快对去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuaiDuiZuoYe_remove_ads.sgmodule) | 移除开屏广告、横幅推广，精简我的页面。 | 1 | 0 | 6 |
| [快影去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KwaiVideoeditor_remove_ads.sgmodule) | 移除开屏广告、信息流推广、横幅推广，移除悬浮部件。 | 0 | 0 | 6 |
| [快手去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuaiShou_remove_ads.sgmodule) | 移除开屏广告、视频流广告、底栏皮肤、右下角悬浮推广，精简我的页面。 | 0 | 0 | 10 |
| [快捷搜索](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QuickSearch.sgmodule) | 为Safari提供快速切换搜索引擎的能力，在插件列表中点击此插件上的链接查看使用方法。 | 0 | 0 | 8 |
| [快看漫画去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuaiKanComic_remove_ads.sgmodule) | 移除开屏广告、悬浮窗、漫画广告、社区广告、各类弹窗，精简顶部标签、我的页面。 | 3 | 4 | 19 |
| [快递100去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuaiDi100_remove_ads.sgmodule) | 移除横幅广告、弹窗广告，精简首页。 | 0 | 0 | 5 |
| [慧生活798去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SmartLife_remove_ads.sgmodule) | 移除开屏广告、横幅广告，精简底栏。 | 0 | 0 | 4 |
| [成分喵去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ChengFenMiao_remove_ads.sgmodule) | 移除首页推广活动、广告组件请求、移除被查商品购买链接、搜索发现。 | 0 | 0 | 5 |
| [拼多多去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PinDuoDuo_remove_ads.sgmodule) | 移除开屏广告、底栏多多视频、会场入口、聊天页面精选推荐及推广，精简首页和个人中心。 | 17 | 1 | 28 |
| [挖财记账去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WaCaiJiZhang_remove_ads.sgmodule) | 移除弹窗广告、推广语横幅和右下角悬浮广告。 | 0 | 0 | 3 |
| [挖财记账去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Wacai_remove_ads.sgmodule) | 移除开屏广告、横幅广告，顶部推广、活动配置。 | 0 | 0 | 4 |
| [掌上无畏契约去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ValorantBible_remove_ads.sgmodule) | 移除开屏广告、弹窗推广、搜索热搜、搜索热榜。 | 0 | 0 | 3 |
| [掌上英雄联盟去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/LOL_Bible_remove_ads.sgmodule) | 移除开屏广告、弹窗推广、搜索热搜、搜索热榜、底栏推广图标。 | 0 | 0 | 6 |
| [掌阅去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/iReader_remove_ads.sgmodule) | 移除开屏广告、悬浮广告、弹窗广告、朗读音色广告及我的页面广告，移除各页面的横幅轮播图。 | 1 | 0 | 8 |
| [排班日历去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/AxWorkSchedule_remove_ads.sgmodule) | 移除开屏广告、横幅广告。 | 0 | 0 | 3 |
| [推栏去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Daily_remove_ads.sgmodule) | 过滤推栏广告 | 0 | 0 | 1 |
| [摩天轮去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FerrisWheel_remove_ads.sgmodule) | 移除开屏广告、弹窗，精简底栏。 | 0 | 0 | 5 |
| [摩托范去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MotorFans_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅广告、文末广告及相关文章推荐、广告下发，移除我的页面商品推荐，精… | 0 | 1 | 8 |
| [收银通商户端去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ShouYinTongMerchant_remove_ads.sgmodule) | 移除开屏广告和首页推广 | 0 | 0 | 5 |
| [数字心动去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DigitalHeartbeat_remove_ads.sgmodule) | 移除开屏广告、首页顶部标签、轮播图、悬浮挂件、热门搜索、信息流广告。 | 0 | 0 | 7 |
| [斗鱼去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Douyu_remove_ads.sgmodule) | 移除开屏、首页视频流、首页轮播图广告，移除直播间悬浮窗。 | 4 | 1 | 3 |
| [新浪财经去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SinaStock_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅广告、信息流广告，精简我的页面。 | 0 | 0 | 11 |
| [无他相机去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WutaCamera_remove_ads.sgmodule) | 移除开屏广告、拍摄页面广告、右小角广告，精简底栏。 | 0 | 0 | 2 |
| [易校园去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YiSchool_remove_ads.sgmodule) | 移除开屏广告、横幅广告、弹窗广告、悬浮广告、文末广告、消息广告、校园头条，精简首页金刚位和我… | 0 | 0 | 3 |
| [智慧苏州去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SuZhouCitizenCard_remove_ads.sgmodule) | 移除开屏广告、横幅，移除信息流推广。 | 0 | 0 | 2 |
| [智联招聘去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ZhiLianZhaoPin_remove_ads.sgmodule) | 移除开屏广告、弹窗、职位页面推广和各类横幅推广。此插件需要IPA签名方可使用，App Sto… | 1 | 0 | 3 |
| [最右去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ZuiYou_remove_ads.sgmodule) | 移除开屏广告、信息流广告和广告轮播图。 | 3 | 0 | 3 |
| [最美壁纸去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/iWallBiZhi_remove_ads.sgmodule) | 移除悬浮广告、横幅广告、轮播图广告，精简我的页面。 | 0 | 3 | 2 |
| [有道云笔记去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YoudaoNote_remove_ads.sgmodule) | 移除开屏广告、弹窗广告及横幅广告。 | 0 | 0 | 1 |
| [有道翻译官去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YoudaoTrans_remove_ads.sgmodule) | 移除开屏广告、横幅推广，精简首页。 | 0 | 0 | 7 |
| [朴朴超市去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PuPuMall_remove_ads.sgmodule) | 移除超市去开屏广告，移除首页顶部轮播图和图标广告、启动小弹图广告、首页右下角悬浮动画、搜索热… | 0 | 6 | 2 |
| [每日赛车去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MeiRiSaiChe_remove_ads.sgmodule) | 移除开屏广告、信息流广告。 | 0 | 0 | 2 |
| [比心去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Bixin_remove_ads.sgmodule) | 移除弹窗广告、悬浮广告、横幅广告、轮播图广告，精简搜索页及我的页面。 | 0 | 2 | 16 |
| [比特球云盘去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BitqiuPan_remove_ads.sgmodule) | 移除开屏广告和各类横幅推广。 | 0 | 0 | 3 |
| [汽水音乐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SodaMusic_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、播放器推广、歌曲详情界面视频推广、播放页面的歌曲视频，精简首页和我的… | 0 | 1 | 17 |
| [汽车之家去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/AutoHome_remove_ads.sgmodule) | 移除开屏广告、各类广告横幅、各类信息流广告、各类弹窗推广、各类浮窗、我的页面广告。 | 0 | 6 | 19 |
| [沃尔玛去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Walmart_remove_ads.sgmodule) | 移除操作引导、商品详情页用户调研、搜索填充词和搜索发现，精简我的页面。 | 0 | 0 | 4 |
| [波点音乐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BodianMusic_remove_ads.sgmodule) | 精简应用配置，禁用P2P传输。移除开屏广告、横幅推广、悬浮广告、歌曲广告、商城入口、搜索推广… | 0 | 0 | 20 |
| [测测去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Cece_remove_ads.sgmodule) | 移除开屏广告、活动皮肤、各类弹窗及横幅、金刚位红点文字，精简首页标签及搜索页面。 | 0 | 0 | 19 |
| [海雀去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/AlcidaeVideo_remove_ads.sgmodule) | 移除开屏广告、横幅广告、弹窗广告，拦截商城和资讯页面。 | 0 | 0 | 5 |
| [淘宝去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Taobao_remove_ads.sgmodule) | 过滤淘宝开屏广告 | 6 | 2 | 11 |
| [淘票票去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Taopiaopiao_remove_ads.sgmodule) | 移除开屏广告、悬浮广告、轮播图广告和弹窗广告，移除搜索填充词和为你推荐。 | 0 | 0 | 6 |
| [滴滴去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DiDi_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅推广，精简我的页面。 | 3 | 0 | 27 |
| [滴答出行去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DidaPincheTaxi_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅广告，精简底栏和我的页面。 | 0 | 0 | 1 |
| [漫客栈去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MKZ_remove_ads.sgmodule) | 移除开屏广告、漫画广告、小说章末广告，精简我的页面。 | 0 | 1 | 5 |
| [爱企查去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Aiinquiry_remove_ads.sgmodule) | 移除开屏广告、应用内弹窗、首页轮播图、悬浮部件、信息流和搜索填充词。 | 0 | 0 | 11 |
| [爱奇艺去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/iQiYi_Video_remove_ads.sgmodule) | 移除开屏广告、焦点图广告、瀑布流广告、搜索页面广告、移除青少年弹窗，精简底栏和我的页面。 | 6 | 0 | 21 |
| [猫耳FM去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CatEarFM_remove_ads.sgmodule) | 移除开屏广告、青少年模式弹窗、首页顶部入口，替换底栏的直播入口为发现入口。 | 0 | 0 | 13 |
| [瑞幸咖啡去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/LuckinCoffee_remove_ads.sgmodule) | 移除开屏广告、弹窗和各类横幅推广。 | 0 | 0 | 8 |
| [番茄小说去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DragonRead_remove_ads.sgmodule) | 移除番茄小说开屏广告、移除文章底部和章末广告、移除听书页面广告、移除悬浮部件和底栏多余的福利… | 34 | 0 | 0 |
| [百度地图去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BaiduMap_remove_ads.sgmodule) | 移除开屏广告、出行页面推广、周边页面推广、打车页面推广，精简我的页面。此插件需要IPA签名方… | 0 | 0 | 12 |
| [百度文库去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BaiduWenku_remove_ads.sgmodule) | 移除开屏广告、横幅广告、弹窗广告、信息流推广、搜索发现、热门搜索、资料库搜索推荐，精简我的页… | 0 | 0 | 12 |
| [百度网盘去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BaiduNetDisk_remove_ads.sgmodule) | 移除开屏广告、首页卡片广告、传输页面广告、各类弹窗，精简侧拉抽屉和我的页面。 | 0 | 0 | 8 |
| [百度网页去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BaiduSearchWebpage_remove_ads.sgmodule) | 移除百度搜索移动端网页的首页广告信息流 | 0 | 1 | 0 |
| [百度翻译去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BaiduTranslate_remove_ads.sgmodule) | 移除开屏广告、横幅广告，精简我的页面。 | 0 | 0 | 4 |
| [百度贴吧去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Tieba_remove_ads.sgmodule) | 移除开屏广告、信息流广告和帖内广告，精简侧拉抽屉及我的页面。 | 2 | 1 | 16 |
| [百度输入法去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Baidu_input_method_remove_ads.sgmodule) | 过滤百度输入法广告，替换个人主页随机图。 | 0 | 1 | 6 |
| [皮皮虾去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PiPiXia_remove_ads.sgmodule) | 移除开屏广告、评论区广告、视频流广告，精简我的页面。 | 0 | 0 | 5 |
| [盒马去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MrHema_remove_ads.sgmodule) | 移除开屏广告、首页信息流广告及推广、弹窗广告、悬浮挂件、商品及购物车推荐，精简底栏及我的页面… | 0 | 0 | 12 |
| [盖得排行去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/GuideRank_remove_ads.sgmodule) | 精简首页、移除分类横幅推广、单单返猜你喜欢和编辑精选，移除我的页面推广。 | 0 | 0 | 11 |
| [直播吧去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Zhibo8_remove_ads.sgmodule) | 移除信息流广告、横幅广告、弹窗广告、皮肤配置、悬浮挂件、热门搜索，移除青少年模式，精简我的页… | 0 | 0 | 14 |
| [省钱快报去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YueDanBa_remove_ads.sgmodule) | 移除开屏广告、横幅广告、商品推荐，精简我的页面。 | 0 | 0 | 5 |
| [看家王去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ChatCam_remove_ads.sgmodule) | 移除开屏广告、横幅广告。 | 0 | 0 | 2 |
| [知乎去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Zhihu_remove_ads.sgmodule) | 移除HTTPDNS和QUIC传输配置，移除开屏广告、信息流广告、回答页广告，移除回答页下的相… | 0 | 0 | 30 |
| [磁力宅播放器去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XFuse_remove_ads.sgmodule) | 移除开屏广告、弹窗和文件列表广告。 | 0 | 0 | 1 |
| [稿定设计去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/GaoDing_remove_ads.sgmodule) | 移除稿定设计开屏广告、首页轮播图和弹窗，移除功能入口角标。 | 0 | 0 | 6 |
| [米游社去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/miHoYoBBS_remove_ads.sgmodule) | 移除开屏广告、搜索栏热搜及资讯、青少年模式弹窗。 | 0 | 0 | 6 |
| [粉笔去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FenBi_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、悬浮广告、热门搜索，移除底栏皮肤，精简我的页面。 | 0 | 0 | 13 |
| [纵横小说去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ZongHeng_remove_ads.sgmodule) | 移除纵横小说开屏广告和弹窗 | 0 | 0 | 2 |
| [纷玩岛去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/LiveLab_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、信息横幅推广、票夹页面横幅广告。 | 0 | 0 | 5 |
| [网易云音乐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/NeteaseCloudMusic_remove_ads.sgmodule) | 过滤网易云音乐广告，并允许自定义界面。 | 6 | 6 | 7 |
| [网易大神去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/NetEaseGodlike_remove_ads.sgmodule) | 移除开屏广告，精简大量冗余的配置文件，精简我的页面。 | 0 | 1 | 1 |
| [网易新闻去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/NeteaseNews_remove_ads.sgmodule) | 移除开屏广告、置顶新闻、热搜列表和搜索栏填充词。 | 2 | 3 | 7 |
| [网易有道词典去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YoudaoDict_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、右上角推广。 | 1 | 0 | 5 |
| [网易邮箱大师去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MailMaster_remove_ads.sgmodule) | 移除网易邮箱大师开屏广告、签到任务提醒，精简侧拉抽屉和我的页面。 | 0 | 0 | 5 |
| [美丽修行去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Meizhixiuxing_remove_ads.sgmodule) | 移除开屏广告、首页广告、发现页广告、美修盒页面广告、下拉广告、弹窗广告、搜索推广、版本更新弹… | 0 | 0 | 8 |
| [美图秀秀去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MeiTu_remove_ads.sgmodule) | 移除开屏广告、横幅推广，精简我的页面。 | 1 | 0 | 1 |
| [美柚去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MeetYou_remove_ads.sgmodule) | 移除开屏广告、弹窗推广和信息流推广，移除青少年模式弹窗和我的页面推广。 | 2 | 0 | 2 |
| [美颜相机去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MeituMYXJ_remove_ads.sgmodule) | 移除开屏广告、应用内弹窗，精简首页和我的页面。 | 1 | 1 | 4 |
| [美食杰去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MeiShiJie_remove_ads.sgmodule) | 移除开屏广告和信息流广告。 | 0 | 0 | 1 |
| [联掌门户去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/LZMH_remove_ads.sgmodule) | 移除开屏广告、弹窗，移除首页、服务和发现页面无用内容。 | 0 | 0 | 11 |
| [胖乖生活去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/PangguaiLife_remove_ads.sgmodule) | 移除开屏广告、横幅轮播图、网格广告、信息流广告、浮窗广告，精简我的页面。 | 0 | 0 | 8 |
| [脉脉去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MaiMai_remove_ads.sgmodule) | 移除开屏广告、信息流广告、横幅推广、相关帖子推荐。 | 0 | 1 | 4 |
| [腾讯文档去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TXDocs_remove_ads.sgmodule) | 移除开屏广告、首页横幅推广。 | 0 | 0 | 2 |
| [腾讯视频去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Tencent_Video_remove_ads.sgmodule) | 过滤腾讯视频客户端广告，如遇失效，则需要重新安装腾讯视频客户端。由于此插件不再维护，客户端版… | 16 | 1 | 1 |
| [航旅纵横去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Umetrip_remove_ads.sgmodule) | 过滤航旅纵横广告 | 1 | 1 | 0 |
| [芒果TV去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MangoTV_remove_ads.sgmodule) | 移除开屏广告、信息流广告、播放页广告，精简我的页面。 | 13 | 0 | 15 |
| [菜鸟去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Cainiao_remove_ads.sgmodule) | 过滤菜鸟广告 | 0 | 0 | 8 |
| [萌娘百科去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MoeGirlWiki_remove_ads.sgmodule) | 移除开屏广告、弹窗、首页横幅。 | 0 | 0 | 3 |
| [萝卜快跑去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/RoboTaxi_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、横幅广告、新用户活动皮肤，保留优惠活动。 | 0 | 0 | 3 |
| [萤石云视频去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/VideoGo_remove_ads.sgmodule) | 移除开屏广告、首页推广、我的页面推广。 | 0 | 0 | 6 |
| [薄荷健康去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BooHee_remove_ads.sgmodule) | 移除记录页大家都在看、移除各类弹窗，移除广场横幅推广，精简代谢中心页面。 | 0 | 1 | 9 |
| [虎嗅去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Huxiu_remove_ads.sgmodule) | 移除广告配置、信息流直播预约横幅、相关文章推荐、48小时热文推荐，精简搜索页面。 | 1 | 0 | 6 |
| [虎扑去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/HUPU_remove_ads.sgmodule) | 移除虎扑开屏广告、首页顶部推广、我的页面多余模块及各类横幅推广。 | 0 | 4 | 8 |
| [蜗牛睡眠去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SnailSleep_remove_ads.sgmodule) | 移除音乐页面横幅、日报告解决方案商品推广，移除我的页面服务推广。 | 1 | 0 | 0 |
| [蜻蜓FM去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QtingFM_remove_ads.sgmodule) | 移除开屏广告、信息流广告、各类相关内容推荐，精简我的页面。 | 2 | 0 | 17 |
| [行者户外去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/OnTheWay_remove_ads.sgmodule) | 移除弹窗广告、发现页面横幅推广的推广金刚位，移除我的页面横幅推广。 | 0 | 0 | 4 |
| [触站去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Chuzhan_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、各页面横幅推广，移除首页悬浮挂件。 | 0 | 0 | 8 |
| [豆瓣去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DouBan_remove_ads.sgmodule) | 移除开屏广告、各页面信息流广告、首页横幅、搜索填充词。此插件需要IPA签名方可使用，App … | 0 | 0 | 6 |
| [豆瓣阅读去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DoubanRead_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、热门搜索、热搜榜。 | 0 | 0 | 5 |
| [贝壳找房去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Beike_remove_ads.sgmodule) | 移除开屏广告、弹窗广告、悬浮广告、信息流推广、我家页面的装修推荐。移除我的页面的专属推荐、游… | 0 | 0 | 8 |
| [财新去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CaixinMedia_remove_ads.sgmodule) | 过滤财新广告 | 0 | 6 | 5 |
| [起点读书去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/QiDian_remove_ads.sgmodule) | 移除起点读书开屏广告、每日导读、各类弹窗、文末广告、搜索填充词，精简我的页面。 | 0 | 0 | 17 |
| [超级课程表去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MyFriday_remove_ads.sgmodule) | 移除开屏广告、首页头图、悬浮挂件。 | 2 | 0 | 0 |
| [车来了去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Chelaile_remove_ads.sgmodule) | 清洗配置，移除开屏广告、首页金刚位、文章推荐，精简我的页面。 | 1 | 1 | 8 |
| [转转去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ZhuanZhuan_remove_ads.sgmodule) | 移除开屏广告、应用内悬浮窗、信息流推广、商品推荐、首页弹窗，精简我的页面。 | 0 | 0 | 16 |
| [迅雷去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/XunLei_remove_ads.sgmodule) | 移除开屏广告、首页横幅广告、左上角广告入口，精简我的页面。 | 0 | 0 | 2 |
| [配音秀去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/DubbingShow_remove_ads.sgmodule) | 移除开屏广告、弹窗、横幅、各类关注推荐。 | 0 | 1 | 4 |
| [酷安去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/CoolApk_remove_ads.sgmodule) | 过滤酷安广告 | 0 | 0 | 7 |
| [酷我音乐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Kuwo_remove_ads.sgmodule) | 移除开屏广告、各类弹窗、悬浮窗、各类横幅广告、信息流广告、歌词评论区广告和播放器界面广告，精… | 10 | 0 | 4 |
| [酷狗概念版去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuGouYouth_remove_ads.sgmodule) | 移除广告服务模块、播放器广告，精简乐库及搜索页面。 | 0 | 0 | 10 |
| [酷狗铃声去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KGRing_remove_ads.sgmodule) | 移除开屏广告，移除歌曲列表、播放器、搜索界面广告，移除悬浮广告和弹窗广告。 | 0 | 0 | 1 |
| [酷狗音乐去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KuGou_remove_ads.sgmodule) | 移除开屏广告、应用各类弹窗、各类横幅广告、评论区广告和播放器界面广告。 | 9 | 0 | 16 |
| [金十数据去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Jin10Data_remove_ads.sgmodule) | 移除开屏广告、侧滑页面广告、消息广告、浮窗广告、横幅广告、信息流广告、弹窗广告。 | 0 | 0 | 6 |
| [金山文档去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WPS_Documents_remove_ads.sgmodule) | 移除首页横幅推广、表单收集页面推广和我的页面推广。 | 0 | 0 | 3 |
| [闪动校园去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/ShandongSchool_remove_ads.sgmodule) | 精简首页和底部导航 | 0 | 0 | 15 |
| [闲鱼去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FleaMarket_remove_ads.sgmodule) | 移除开屏广告、商品信息流广告、关注推荐、搜索栏填充词、首页签到入口及悬浮广告，精简我的页面。 | 0 | 0 | 24 |
| [阅友去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Yueyou_remove_ads.sgmodule) | 移除开屏广告、弹窗广告和阅读页面广告，移除底栏福利按钮。 | 1 | 0 | 2 |
| [阿里云盘去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/AliYunDrive_remove_ads.sgmodule) | 移除首页广告横幅、弹窗和顶部奖励。 | 1 | 2 | 2 |
| [随手记去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/KingdeeMyMoney_remove_ads.sgmodule) | 移除开屏广告、神象云账本内部广告、我的页面广告，移除社区入口。 | 0 | 0 | 6 |
| [雪球去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Snowball_remove_ads.sgmodule) | 移除开屏广告、各类横幅广告、信息流广告、帖内广告、新用户定向广告、各类弹窗、股票精选推荐、基… | 0 | 0 | 17 |
| [顺丰速运去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/SF-Express_remove_ads.sgmodule) | 移除开屏广告、首页下拉抽屉、首页推广、应用内悬浮窗、横幅广告，移除主题，精简我的页面。 | 0 | 0 | 4 |
| [风鸟去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/RiskBird_remove_ads.sgmodule) | 移除首页信息流和轮播图 | 0 | 1 | 2 |
| [飞客去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FlyerTea_remove_ads.sgmodule) | 移除开屏广告、首页广告、板块广告、帖内广告和我的页面广告。 | 0 | 2 | 4 |
| [飞猪旅行去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TaobaoTravel_remove_ads.sgmodule) | 移除开屏广告、精简我的页面。 | 0 | 0 | 5 |
| [香港抖音去广告 ⚠️MitM](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/HKDouYin_remove_ads.sgmodule) | 精简左右侧边栏、移除底栏切换，其余内容后续再完善。 | 6 | 0 | 7 |
| [马克水印相机去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/marki_remove_ads.sgmodule) | 移除开屏广告，拍摄首页悬浮挂件，侧边栏横幅广告。 | 0 | 0 | 4 |
| [马蜂窝去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/MaFengWo_remove_ads.sgmodule) | 移除首页信息流广告、商城横幅推广、我的页面弹窗。 | 1 | 0 | 3 |
| [驾校一点通去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/JiaXiaoDrive_remove_ads.sgmodule) | 移除开屏广告、各页面广告横幅、弹窗广告，移除社区广告。 | 0 | 0 | 6 |
| [驾考宝典去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/JiaKaoBaoDian_remove_ads.sgmodule) | 移除开屏广告、横幅广告、悬浮窗广告、社区帖子广告，精简我的页面。 | 0 | 0 | 11 |
| [高德地图去广告](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Amap_remove_ads.sgmodule) | 移除开屏广告、首页推荐、搜索推荐、打车广告、地点推荐及广告，精简我的页面。 | 0 | 0 | 23 |

### 功能增强（9）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [Apple天气增强](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/AppleWeatherEnhancer.sgmodule) | 解锁Apple天气的全部功能、替换空气质量数据源、添加下一小时降水数据、添加天气数据。 | 4 | 2 | 0 |
| [Fileball网盘挂载](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Fileball_mount.sgmodule) | 支持挂载阿里云盘、夸克网盘和PikPak网盘，点击下方署名查看使用方法。 | 0 | 1 | 0 |
| [IPA工具箱助手](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/IPATool.sgmodule) | 这是IPA工具箱的辅助插件，用于下载IPA包和应用降级。IPA工具箱是运行在Scriptin… | 0 | 2 | 0 |
| [Spotify歌词增强](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Spotify_lyrics_translation.sgmodule) | 将Spotify的外语歌词翻译为简体中文，并提供双语翻译支持。 | 0 | 7 | 0 |
| [TestFlight地区解锁](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/TestFlightRegionUnlock.sgmodule) | 解除TestFlight的区域限制，支持tvOS。 | 1 | 0 | 1 |
| [VVebo时间线修复](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/VVebo_repair.sgmodule) | 修复失效的用户时间线和我的页面。使用此插件前需要禁用微博去广告插件，避免插件冲突导致失效。 | 0 | 5 | 0 |
| [YouTube双语翻译](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/YouTubeSubtitlesTranslation.sgmodule) | 字幕增强及双语翻译，支持Youtube Music歌词翻译。此插件需要置于YouTube去广… | 0 | 12 | 0 |
| [京东比价](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/JD_Price.sgmodule) | 首次使用需安装慢慢买应用，之后点击进入[我的]页面以捕获Cookie，捕获成功后方可在商品详… | 0 | 2 | 0 |
| [微信外部链接解锁](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Weixin_external_links_unlock.sgmodule) | 解锁微信外部链接访问限制，跳过中间界面。支付宝链接、被封禁链接进行通知弹窗跳转，在微信中用快… | 0 | 1 | 0 |

### 节点检测（3）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [WARP节点查询](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WARP_Node_Query.sgmodule) | 显示WARP节点的详细信息，请在所有节点页面选择一个节点长按，出现菜单后进行测试。 | 0 | 1 | 0 |
| [代理链路检测](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/NodeLinkCheck.sgmodule) | 查看目标节点的代理走向，在插件列表中点击此插件上的链接查看使用方法。 | 0 | 1 | 0 |
| [节点检测工具](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Node_detection_tool.sgmodule) | 适用于Loon的节点检测工具，可进行地理位置、节点解锁、入口落地等查询。请在所有节点页面选择… | 0 | 3 | 0 |

### 签到（2）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [Follow每日签到](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/FollowRSS_checkin.sgmodule) | Follow每日签到，需要进入此插件的主页链接，阅读使用说明操作。 | 0 | 1 | 0 |
| [WPS每日签到](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/WPS_checkin.sgmodule) | WPS每日签到并兑换会员，需要进入此插件的主页链接，阅读使用说明操作。 | 0 | 2 | 0 |

### 配置管理（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [1.1.1.1配置管理](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/1.1.1.1.sgmodule) | 提取1.1.1.1应用的配置并生成Loon可用的节点配置，点击下面署名前往配置1.1.1.1… | 0 | 4 | 0 |

### 定时任务（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [自动加入TestFlight](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Auto_Join_TF.sgmodule) | 自动监控TestFlight名额，一旦有新的名额即刻加入。 | 1 | 3 | 0 |

### 数据管理（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [BoxJs](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/BoxJs.sgmodule) | JavaScript数据管理器，用于管理脚本储存的数据。使用前请在本插件的详情页面为[PRO… | 1 | 1 | 0 |

### DNS（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [DNS防泄露](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Prevent_DNS_Leaks.sgmodule) | 专为小白设计的DNS防泄露 | 22 | 0 | 0 |

### 资源转换（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [Script-Hub](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Script-Hub.sgmodule) | 将其他工具的Rewrite、Rule和JavaScript资源转换为Loon能识别的格式，使… | 1 | 4 | 0 |

### 订阅管理（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [Sub-Store](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/Sub-Store.sgmodule) | 高级订阅管理工具，定时任务默认为每天23点55分，可在插件设置中自定义。使用前请在本插件的详… | 1 | 3 | 0 |

### 未分类（1）

| 模块 | 说明 | 规则 | 脚本 | 改写 |
|---|---|---|---|---|
| [知识星球去水印](https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/UnnooQuan_remove_watermark.sgmodule) | 移除内容的水印编号 | 0 | 0 | 2 |

### ⚠️ MitM 未覆盖的改写目标（原插件即如此，未自动补齐）

- **HTTPDNS拦截器**：`gslbali.ximalaya.com`
- **Soul去广告**：`chat-live.soulapp.cn`
- **七猫小说去广告**：`xiaoshuo.wtzw.com`
- **华尔街见闻去广告**：`wallstreetcn.com`
- **可莉广告过滤器**：`api.flydigi.com`, `app.10099.com.cn`, `client-api-v2.oray.com`
- **堆糖去广告**：`xapi.duitang.com`
- **夸克扫描王去广告**：`scan-order.quark.cn`
- **百度地图去广告**：`maphotel.baidu.com`
- **米游社去广告**：`bbs-api-static.miyoushe.com`
- **纵横小说去广告**：`api1.zongheng.com`, `api2.zongheng.com`
- **芒果TV去广告**：`dc.bz.mgtv.com`
- **财新去广告**：`entities.caixin.com`, `gateway.caixin.com`, `gg.caixin.com`, `mappsv5.caixin.com`, `msgapi.caixin.com`
- **香港抖音去广告**：`api5-normal-lq.amemv.com`, `zlink.ugsdk.cn`

> 若要让这些改写真正生效，可自行在模块 `[MITM]` 里补上对应域名。


## 说明

- 插件版权归原作者 **可莉🅥**（[luestr/ProxyResource](https://github.com/luestr/ProxyResource)）所有，本目录为格式转换备份，仅个人学习使用。
- 转换基于 Loon 3.5.1 新语法；上游若更新，重新跑转换脚本即可。
- 与 Loon 原版的差异以本文「已知限制」为准，其余行为对齐。
