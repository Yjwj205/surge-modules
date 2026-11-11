# 签到模块（iKuuu / NodeSeek）

两个 Loon 签到插件转成的 Surge 模块，脚本已适配 Surge 运行时。

## 安装

| 模块 | 地址 |
|---|---|
| iKuuu 每日签到 | `https://raw.githubusercontent.com/Yjwj205/surge-modules/main/checkin/modules/ikuuu-checkin.sgmodule` |
| NodeSeek 签到增强版 | `https://raw.githubusercontent.com/Yjwj205/surge-modules/main/checkin/modules/nodeseek-checkin.sgmodule` |

Surge → 首页「模块」→ 安装新模块 → 粘贴地址。装完在模块参数里填具体配置。

---

## iKuuu 每日签到

| 参数 | 默认 | 说明 |
|---|---|---|
| `cookie` | 空 | 手动粘贴完整 Cookie，留空则用自动抓取保存的值 |
| `capture` | `true` | Cookie 抓取开关，抓完可改 `false` |
| `notify` | `true` | 签到结果通知 |
| `cronExpr` | `0 8 * * *` | 5 段 cron，默认每天 08:00 |

**首次使用**（二选一）：
1. 保持 `capture=true` → Safari 打开 `https://ikuuu.org` 登录一次 → 抓取成功后可在模块参数里把 `capture` 改成 `false`；
2. 或在 `cookie` 参数里直接粘贴（支持带 `Cookie:` 前缀）。

**手动签到**：首页面板「iKuuu 手动签到」点一下即可（`update-interval=-1`，不会自动刷新）。

---

## NodeSeek 签到增强版

原版作者：Roddy-D（[Loon 插件](https://github.com/Roddy-D/Loon_plugins)）

| 参数 | 默认 | 说明 |
|---|---|---|
| `CRON_TIME` | `1 0 * * *` | 签到执行时间（5 段 cron） |
| `ENABLE_CAPTURE` | `true` | 抓取开关：打开后访问 NodeSeek 页面自动抓 Cookie |
| `NS_COOKIE` | 空 | Cookie，抓取后自动保存在本地，也可手动粘贴 |
| `TG_BOT_TOKEN` | 空 | 选填，Telegram Bot Token |
| `TG_USER_ID` | 空 | 选填，接收消息的 User ID |
| `TG_NOTIFY_ONLY_FAIL` | `false` | 仅失败时推送 TG |
| `RANDOM_REWARD` | `false` | 随机奖励模式 |

**首次使用**：保持 `ENABLE_CAPTURE=true` → Safari 打开 `https://www.nodeseek.com` 并登录，触发一次 `getInfo` 请求即可自动保存 Cookie，之后可关闭抓取。

---

## 与 Loon 版的差异（转换时改了什么）

| 项 | Loon | Surge 版处理 |
|---|---|---|
| 参数传递 | `[Argument]` + `$argument` 对象 | 模块 `#!arguments` + `argument="k=v&k2=v2"`，脚本内自行解析（两个脚本都已加解析函数） |
| 开关控制 | `with enable=${capture}` | Surge 无脚本级开关 → 改为把 `capture` 传入脚本，由脚本自行短路 |
| 定时 | `cron ${cronExpr}` | `type=cron, cronexp="{{{cronExpr}}}"`，附 `wake-system=1` |
| 手动执行 | `generic`（Loon 内有运行入口） | `type=generic` + `[Panel]` 面板一键运行 |
| 抓取 | `http-request` 脚本 | `type=http-request`，`max-size=-1` |
| 节点指定 | `options.node`（Loon 专有） | 仅在 Loon 环境传，Surge 自动忽略（`requestNode` 参数已从 Surge 模块移除） |
| MitM | `[Mitm] hostname=` | `[MITM] hostname = %APPEND%`，只追加 |

## 已知限制

- **Cron 与后台**：Surge iOS 打开「始终运行」后会常驻后台，`type=cron` 能按时触发；该开关关闭时，系统可能挂起 Surge，定时脚本只能等下次唤醒时补跑一次。开「始终运行」会略增耗电，按需取舍。
- **Cookie 里的特殊字符**：`argument` 用 `&` 分隔参数，Cookie 若含 `&` 会被截断（v2board / NodeSeek 的 Cookie 通常是 `a=b; c=d`，不含 `&`）。真遇到可在脚本里改用手动本地存储。
- **`wake-system=1`**：允许 Surge 唤醒系统执行，耗电略增，可自行删掉该参数。
- 两个模块都会走 MitM，需在 Surge 里启用 MitM 并安装/信任证书。

## 校验

- 模块结构通过语法校验（段落 / 脚本行 / 正则 / 参数完整性）
- 三个脚本 `node --check` 通过，并在模拟 Surge 运行时中实际执行：
  - iKuuu 签到（cron）：正常解析参数、发请求、`$done({content})`
  - iKuuu Cookie 抓取：`capture=false` 时正确短路、无请求
  - NodeSeek 抓取 / 签到两条路径均正常执行
