# 定时切换策略 · Surge 版

按时间到点把某个 **select 策略组** 切换到指定子策略，默认：

| 时间 | 目标 |
|---|---|
| 09:00 | `Matrix` |
| 19:00 | `吹雪云观影组` |

策略组默认 `综合利用EMBY4837`，全部可在模块参数里改。

这是 Loon 版 [`policy-switcher.plugin`](https://github.com/Yjwj205/loon-modules/blob/main/policy-switcher.plugin) 的 Surge 移植版。

## 安装

模块地址：

```
https://raw.githubusercontent.com/Yjwj205/surge-modules/main/policy-switcher/policy-switcher.sgmodule
```

Surge → 首页 → 模块 → 安装新模块 → 粘贴上面的地址 → 装好后在模块的「参数」里改成自己的策略组和节点名。

## 实现方式

- **切换 API**：优先用 Surge 原生 `$surge.setSelectGroupPolicy(组名, 子策略)`；老版本回退到 HTTP API `POST /v1/policy_groups/select`（`{"group_name":…, "policy":…}`），再老的环境会发通知提示不支持。
- **触发方式**：
  - `PolicySwitch-AM` — `type=cron`，默认 `0 9 * * *`
  - `PolicySwitch-PM` — `type=cron`，默认 `0 19 * * *`
  - `PolicySwitch-CatchUp` — `type=event, event-name=engine-started`，Surge 启动时按当前时间补一次（比如 19:00 时手机没开 Surge，晚上打开后自动补上晚间节点）
  - `PolicySwitch-Panel` — 信息面板，显示当前节点、早晚时间表、下次切换倒计时
- **幂等**：切换前用 `$surge.selectGroupDetails()` 读当前选中项，已经是目标就直接跳过，**不切换也不发通知**；面板里手动刷新也不会误切换。
- **错误处理**：目标不在该策略组的子策略里 / 策略组不存在（不是 select 组）/ 没有可用 API，都会发一条常驻通知说明原因，并把可选的子策略列出来。

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `group` | `综合利用EMBY4837` | 策略组名称，必须完全一致且为 select 类型 |
| `amCron` | `0 9 * * *` | 早间切换时间，5 段 cron |
| `amTarget` | `Matrix` | 早间目标子策略 |
| `pmCron` | `0 19 * * *` | 晚间切换时间 |
| `pmTarget` | `吹雪云观影组` | 晚间目标子策略 |
| `notify` | `true` | 切换成功后是否通知（失败总是通知） |
| `wake` | `true` | iOS 到点唤醒 Surge 执行（`wake-system`），关掉后可能错过时间 |

时间只需要改 cron 的小时/分钟两个字段，`auto` 模式（启动补切、面板）只识别这种简单写法；写成 `0 9,21 * * *` 这类复杂表达式时，定时切换照常工作，但启动补切会跳过。

## 面板

安装后 Surge「策略」页会多一张卡片：

```
策略组：综合利用EMBY4837
当前节点：Matrix
早间 09:00 → Matrix
晚间 19:00 → 吹雪云观影组
下次切换：19:00（6 小时 58 分后）
上次切换：11-12 09:00
```

当前节点与「此刻应有的节点」不一致时卡片变橙色（alert），一致时绿色（good）。

## 已知限制

- **Surge 没运行就切不了**。iOS 上 `wake-system=1` 会预约一条静默本地通知把 Surge 叫醒，但系统省电策略、勿扰/通知权限仍可能让它错过；错过时靠 `engine-started` 补切（打开 Surge 那一刻按当前时间对齐）。
- 只支持 **select** 类型的策略组；url-test / fallback / load-balance 这类自动组没有「选中项」，切换会失败并通知。
- 策略组名、子策略名必须和 Surge 里**完全一致**（含 emoji、空格）。
- 到点后如果你手动切到别的节点，不会在下次定时前被改回去（比 Loon 版的高频轮询更「尊重手动选择」）。
- 在 Surge Mac 上 `wake-system` 无意义，其余功能相同。

## 测试

`test.js` 用 `vm` 模拟 Surge 运行环境（`$surge` / `$httpAPI` / `$persistentStore` / 面板 `$input` / 固定时钟），覆盖 42 条断言：

```bash
node test.js
```

包括：早晚到点切换、幂等跳过、目标不存在、策略组不存在、auto 模式跨天判断（07:30 用前一天晚间节点）、面板渲染、老版本 HTTP API 回退、参数三种写法（query / JSON / 缺省）、复杂 cron 降级、手动执行提示。
