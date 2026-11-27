# Surge Metrics · Scripting 小组件

面向 [Scripting App](https://scriptingapp.github.io/) 的 Surge iOS 运行指标小组件，基于 [StarYunLee/Scripting](https://github.com/StarYunLee/Scripting) 的 Surge Metrics 1.1.1 修改。

在原有指标展示之外，新增**运行模式切换**和**全局模式下的节点 / 策略组选择**。

当前版本：`1.4.0`

## 安装

直接下载安装包（用 Scripting 打开导入）：

```text
https://raw.githubusercontent.com/Yjwj205/surge-modules/main/surge-metrics/Surge-Metrics.scripting
```

也可以在 GitHub 文件页下载 `Surge-Metrics.scripting` 后在「文件」里点开，选择 Scripting 导入。

如果保存到「文件」时扩展名被改成 `.bin`（iOS 不认识 `.scripting`），改用 zip 版，解压后得到 `.scripting`：

```text
https://raw.githubusercontent.com/Yjwj205/surge-modules/main/surge-metrics/Surge-Metrics.zip
```

> `.scripting` 不是系统已知扩展名，如果保存到「文件」时被改成了 `.bin`，长按重命名为 `.scripting` 再打开即可；文件本身就是一个 zip。

## 系统要求

- 已安装 Scripting App（不需要 Pro）
- Surge iOS **5.22.0+**（提供 `/v1/metrics`）
- Surge 已启动，且配置里开启 HTTP API

## Surge 配置

```ini
[General]
http-api = YOUR_SECRET_KEY@127.0.0.1:6171
# 可选
# http-api-tls = true
```

小组件默认 Host `127.0.0.1`、Port `6171`。如果 Scripting 访问不到本机回环地址，可改为局域网 IP（`0.0.0.0:6171` 会向局域网开放，务必用强 Key）。

## 功能

- 读取 `GET /v1/metrics` Prometheus 指标：累计下行 / 上行、内存、请求总数（或活跃请求）、DNS 缓存、运行时长、版本 Build
- 请求数 ≥1000 显示为 K（四舍五入一位小数：1436 → 1.4K、1486 → 1.5K），≥ 100 万为 M
- 「请求总数」取 `/v1/requests/recent` 最大请求 ID 估算（Surge 无官方累计指标），引擎重启归零
- 请求 ID 会把小组件自己的 API 调用也算进去（每次刷新 4 个），组件会自动扣除；剩余固定差值可用「请求数校准」对齐
- Medium 聚焦核心状态，Large 额外展示累计流量最高的 3 个接口
- 标题旁的模式胶囊：点一下按 **规则 → 全局 → 直连 → 规则** 轮换，直接写入 Surge
- 全局模式下底部出现「↔ 策略名」胶囊，点一下在自选快捷策略（节点或策略组）之间轮换
- 设置页可设置全局默认策略、逐个切换手动策略组、管理快捷策略
- 状态随刷新缓存，断网时胶囊保留最后一次已知状态

## 运行模式与策略控制

对应 Surge HTTP API（`X-Key` 鉴权，与 metrics 同一个 Key）：

```text
GET/POST /v1/outbound             模式 direct / proxy / rule（proxy 即「全局模式」）
GET/POST /v1/outbound/global      全局默认策略 {"policy":"节点或策略组名"}
GET      /v1/policies             节点与策略组列表
GET      /v1/policy_groups        策略组及成员
POST     /v1/policy_groups/select 手动组切换 {"group_name":"...","policy":"..."}
```

WidgetKit 不支持下拉菜单，所以小组件上的模式 / 策略只能「点一下轮换」；完整选择在设置页：

- 「运行模式」：直接选规则 / 全局 / 直连，设置全局默认策略
- 「小组件快捷策略」：最多 6 个，节点名或策略组名均可；未配置时策略胶囊只读
- 「策略组」：select 组可直接切换，自动测试 / 负载均衡 / Smart 等只读展示当前出口

写操作失败（Key 无效、API 受限、Surge 未启动）会在设置页显示 Surge 返回的原因。

## 数据口径

`surge_interface_in_bytes_total` / `surge_interface_out_bytes_total` 等 counter 从引擎本次启动累计，重启归零；多接口汇总可能存在统计范围重叠，适合观察本次运行流量规模，不等于运营商账单。组件不推导「实时速率」，避免 WidgetKit 调度延迟造成误导。

## 目录结构

```text
surge-metrics/
├── Surge-Metrics.scripting     可直接导入的安装包
├── Surge-Metrics.zip           zip 包装，解压后得到上面的 .scripting
├── src/                        源码（Scripting 项目结构）
│   ├── index.tsx               设置页
│   ├── widget.tsx              小组件入口（Medium / Large）
│   ├── app_intents.tsx         刷新 / 切模式 / 切策略 Intent
│   ├── components/             视图组件
│   ├── services/               metrics、surge-api、settings、format
│   ├── assets/                 图标
│   └── script.json
├── LICENSE
└── README.md
```

修改源码后，把 `src/` 内文件按原结构打包、改名为 `.scripting` 即可导入（安装包本身就是 zip）。

## 更新记录

### 1.4.0 · 2026-11-28

- 自动扣除小组件自己发出的 API 请求，修正请求数随时间越来越大的偏差。
- 设置页显示原始请求 ID 与已扣除数量；引擎重启时自动重置计数与校准。

### 1.3.1 · 2026-11-27

- 新增「请求数校准」：显示原始请求 ID，填入 Surge 仪表盘请求数即可固定减去差值。
- 解析时优先采用 `/v1/requests/recent` 的 total / count 字段。

### 1.3.0 · 2026-11-27

- 状态行可切换「请求总数 / 活跃请求」：累计值取 `/v1/requests/recent` 最大请求 ID 估算。
- 新增 K/M 缩写，四舍五入一位小数；请求接口失败时回退活跃请求。
- 设置页新增「请求统计」选择。

### 1.2.3 · 2026-11-27

- 「Surge」标题与图标同步放大：标题 12 → 14pt，图标 15 → 17pt。

### 1.2.2 · 2026-11-27

- 模式胶囊再放大到 13pt（图标 12，内边距 8/3）；策略胶囊 11pt。
- Medium 收紧几处纵向留白，保证 158pt 高度里不挤。

### 1.2.1 · 2026-11-27

- 放大小组件标题旁的模式胶囊：文字 9 → 11pt，图标与内边距同步放大；底部策略胶囊文字 9 → 10pt。

### 1.2.0 · 2026-11-27

- 新增运行模式切换：小组件标题旁模式胶囊 + 设置页选择
- 新增全局模式策略控制：小组件策略胶囊轮换、设置页全局默认策略、手动策略组切换
- 新增 `services/surge-api.ts`，带键值脱敏与缓存回退
- 移除原包的远程自动更新（`remoteResource`），避免覆盖本地修改

### 1.1.1

- 上游版本：修正文字缩放与流量构成条兼容性，启用安装包远程更新

## 致谢与许可

- 原始项目：StarYunLee / Scripting 的 `Surge Metrics`
- 本项目遵循 MIT License，见 [LICENSE](LICENSE)
- 非 Surge 官方产品，与 Surge Networks Inc. 无隶属关系
