# surge-modules

Surge 模块与脚本合集。

## 目录

| 目录 | 内容 |
|---|---|
| [`kelee/`](kelee/README.md) | 可莉（kelee.one）Loon 插件中心 275 个插件全量转换的 Surge 模块 |
| [`checkin/`](checkin/README.md) | iKuuu 每日签到、NodeSeek 签到增强版（Loon 签到插件转 Surge） |
| [`policy-switcher/`](policy-switcher/README.md) | 定时切换策略·准点：两条准点 cron 切换 select 策略组（Loon `policy-exact.plugin` 移植） |
| [`surge-metrics/`](surge-metrics/README.md) | Surge Metrics：Scripting 小组件（运行指标 + 运行模式 / 全局策略控制） |
| [`fktg/`](fktg/README.md) | Fuck Telegram bad IPs：`[Host]` 把 TG 坏 IP 映射到多个好 IP（多目标合并版） |
| 根目录 | 网络状态面板等自用模块（`net-status.*`） |

## kelee/ 模块

- 275 个 `.sgmodule`，全部由 Loon 插件转换而来，规则/改写/脚本逐条对应
- 脚本已本地化，不依赖 kelee.one
- 安装：`https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/<文件名>.sgmodule`

详见 [kelee/README.md](kelee/README.md)。

## policy-switcher/ 模块

定时切换策略·准点：占位默认 09:00 → B、19:00 → C（装好后改成自己的节点），基于 `$surge.setSelectGroupPolicy()`（老版本回退 HTTP API），
两条准点 cron，不轮询；切换前判重、切换后复核。

安装：`https://raw.githubusercontent.com/Yjwj205/surge-modules/main/policy-switcher/policy-switcher.sgmodule`

详见 [policy-switcher/README.md](policy-switcher/README.md)。

## surge-metrics/ 小组件

Scripting App 的 Surge iOS 小组件：累计流量、内存、活跃请求、DNS 缓存、运行时长，外加运行模式切换
（规则 / 全局 / 直连）与全局模式下的节点 / 策略组选择。

安装：`https://raw.githubusercontent.com/Yjwj205/surge-modules/main/surge-metrics/Surge-Metrics.scripting`

详见 [surge-metrics/README.md](surge-metrics/README.md)。

## fktg/ 模块

把 Telegram 的垃圾 IP 映射到多个好 IP（`.147 / .201 / .180`，都是新加坡 DC5）。

**多目标时 Surge 怎么挑，文档只写了一部分**：`[Host]` 多地址在「域名命中映射 → 走代理」
这条路径上是随机取一个（官方原话 *If the record has multiple addresses, one is chosen at random.*）；
Telegram 这种 **IP→IP 直连映射**文档没描述，也找不到「并发择优」的开关。
实测方法见子目录 README。

安装：`https://raw.githubusercontent.com/Yjwj205/surge-modules/main/fktg/FKTG.sgmodule`

详见 [fktg/README.md](fktg/README.md)。
