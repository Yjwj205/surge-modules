# surge-modules

Surge 模块与脚本合集。

## 目录

| 目录 | 内容 |
|---|---|
| [`kelee/`](kelee/README.md) | 可莉（kelee.one）Loon 插件中心 275 个插件全量转换的 Surge 模块 |
| [`checkin/`](checkin/README.md) | iKuuu 每日签到、NodeSeek 签到增强版（Loon 签到插件转 Surge） |
| [`policy-switcher/`](policy-switcher/README.md) | 定时切换策略·准点：两条准点 cron 切换 select 策略组（Loon `policy-exact.plugin` 移植） |
| 根目录 | 网络状态面板等自用模块（`net-status.*`） |

## kelee/ 模块

- 275 个 `.sgmodule`，全部由 Loon 插件转换而来，规则/改写/脚本逐条对应
- 脚本已本地化，不依赖 kelee.one
- 安装：`https://raw.githubusercontent.com/Yjwj205/surge-modules/main/kelee/modules/<文件名>.sgmodule`

详见 [kelee/README.md](kelee/README.md)。

## policy-switcher/ 模块

定时切换策略·准点：默认 09:00 → Matrix，19:00 → 吹雪云观影组，基于 `$surge.setSelectGroupPolicy()`（老版本回退 HTTP API），
两条准点 cron，不轮询；切换前判重、切换后复核。

安装：`https://raw.githubusercontent.com/Yjwj205/surge-modules/main/policy-switcher/policy-switcher.sgmodule`

详见 [policy-switcher/README.md](policy-switcher/README.md)。
