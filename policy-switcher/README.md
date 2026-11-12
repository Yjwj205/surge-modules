# 定时切换策略·准点 · Surge 版

移植自 Loon 版 [`policy-exact.plugin`](https://github.com/Yjwj205/loon-modules/blob/main/policy-exact.plugin) + [`switch-exact.js`](https://github.com/Yjwj205/loon-modules/blob/main/switch-exact.js)。

两条准点 cron，到点把指定的 **select 策略组** 切到指定子策略。**不轮询**。

| 时间 | 目标 |
|---|---|
| 09:00 | `Matrix` |
| 19:00 | `吹雪云观影组` |

策略组默认 `综合利用EMBY4837`，时间/目标/组名都可在模块参数里改。

## 安装

```
https://raw.githubusercontent.com/Yjwj205/surge-modules/main/policy-switcher/policy-switcher.sgmodule
```

Surge → 首页 → 模块 → 安装新模块 → 粘贴地址 → 在模块「参数」里改成自己的策略组和节点名。

## 参数

| 参数 | 默认值 | 对应 Loon 版 | 说明 |
|---|---|---|---|
| `group` | `综合利用EMBY4837` | `group` | 策略组名称，必须完全一致（select 类型） |
| `amTime` | `0 0 9 * * *` | `amTime` | 早上触发时间，6 段 cron：秒 分 时 日 月 周 |
| `amTarget` | `Matrix` | `amTarget` | 早上切换为 |
| `pmTime` | `0 0 19 * * *` | `pmTime` | 晚上触发时间，6 段 cron |
| `pmTarget` | `吹雪云观影组` | `pmTarget` | 晚上切换为 |
| `notify` | `true` | `notify` | 切换时通知（含失败通知） |

Surge 的 `cronexp` 本身就支持「5 段」和「6 段（首位是秒）」，所以 Loon 版的时间写法可以原样照搬，不用换算。

## 为什么没有轮询

Loon 的旧版（`policy-switcher.plugin`）是每 5 分钟轮询一次；**准点版没有轮询，这个 Surge 移植也没有**：

- Surge 有「始终运行」开关，cron 到点即触发；
- 每条 cron 还带 `wake-system=1`，iOS 会预约一条静默本地通知把设备叫醒执行；
- 轮询除了费电，还会在你手动切了节点之后把选择改回去 —— 准点版只在两个时间点动一次。

所以模块里只有两条 `type=cron`，没有任何定时轮询、事件钩子或面板。

## 行为（与 Loon 版逐条对应）

- 两条 cron 各自以 `argument="group=…&target=…&notify=…"` 触发，目标直接来自参数；
- 没显式传 `target` 时按当前小时兜底：**12 点前用 `amTarget`，之后用 `pmTarget`**（和 `switch-exact.js` 一致，用于手动跑脚本）；
- **幂等**：先读 `$surge.selectGroupDetails()` 的当前选中项，已经是目标就直接退出，不切换、不通知；
- **切换后复核**：再读一次选中项，只有确认等于目标才发「策略已切换」，否则发失败通知（含当前值、目标值、可选的子策略列表）；
- 成功通知：标题 `策略已切换`，正文 `目标 · 准点 09:00`；不设 `auto-dismiss`，通知留在通知中心不自动清除。

## 与 Loon 版的 API 映射

| Loon | Surge |
|---|---|
| `$config.getSelectedPolicy(GROUP)` | `$surge.selectGroupDetails().decisions[组]`，老版本回退 `GET /v1/policy_groups/select` |
| `$config.setSelectPolicy(GROUP, target)` | `$surge.setSelectGroupPolicy(组, 子策略)`，老版本回退 `POST /v1/policy_groups/select` |
| `cron ${amTime} then script(...)` | `type=cron, cronexp="{{{amTime}}}"` |
| —— | `wake-system=1`（iOS 到点唤醒 Surge） |
| `$notification.post(...)` | `$notification.post(title, subtitle, body)`（不传 auto-dismiss） |

## 已知限制

- Surge 没在运行就切不了（开「始终运行」基本不会漏）；**错过的那个时间点不会补切**，等下一个准点即可。
- 只支持 **select** 类型的策略组；url-test / fallback / load-balance 这类自动组没有「选中项」，切换会失败并通知。
- 策略组名、子策略名必须和 Surge 里**完全一致**（含 emoji、空格）。
- 老版本 Surge 没有 `$surge` 模块时回退 `$httpAPI`；这一步要求 profile 的 `[General]` 里有 `http-api` 才会放行，失败时通知会写明原因。
- 脚本设了 `script-update-interval=3600`，改了仓库内容最多 1 小时后生效。

## 测试

`test.js` 用 `vm` 模拟 Surge 环境（`$surge` / `$httpAPI` / 固定时钟），36 条断言：

```bash
node test.js
```

覆盖：早晚显式 target、幂等跳过、无 target 时按小时兜底（11:59 / 12:00 边界）、目标不存在、setter 假成功后的复核、老版本 HTTP API 回退、无 API 环境、参数四种写法（query / JSON / 对象 / 缺省）、带空格中文名、notify=false 静默。
