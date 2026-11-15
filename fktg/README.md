# Fuck Telegram bad IPs（Surge · 多目标合并版）

把 Telegram 一直连的「垃圾 IP」在 Surge 的 `[Host]` 层映射到多个好 IP，减少转圈。
原版是 [Repcz/Tool · FKTG.sgmodule](https://github.com/Repcz/Tool/raw/X/Surge/Module/Function/FKTG.sgmodule)：
每个坏 IP 写两个目标 `91.108.56.147,91.108.56.201`。

本模块把目标扩成 **三个** `.147 / .201 / .180`（都是新加坡 DC5、AS62014 Telegram），
并把目标放进模块参数里，可以随时改。

## 安装

```
https://raw.githubusercontent.com/Yjwj205/surge-modules/main/fktg/FKTG.sgmodule
```

Surge → 首页 → 模块 → 右上角 `+` → URL → 填上面的地址 → 装上后确认开启，重开 Telegram 生效。

## 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `ip1` | `91.108.56.147` | 候选目标 1 |
| `ip2` | `91.108.56.201` | 候选目标 2 |
| `ip3` | `91.108.56.180` | 候选目标 3 |

`[Host]` 里写成 `坏IP = {{{ip1}}},{{{ip2}}},{{{ip3}}}`。
只想用某一个 IP：把三个参数都填成同一个（不能留空，否则会拼出 `ip,,ip` 这种坏记录）。

## 多地址到底怎么选？（查过官方文档）

Surge 手册 <https://manual.nssurge.com/dns/local-dns-mapping.html>「Local DNS Mapping」：

> Multiple addresses may be given as a comma-separated list, and IPv4 and IPv6 addresses may be mixed.

> **If the record has multiple addresses, one is chosen at random.**
> （这一句在 *Use Local DNS Items for Proxied Requests* 一节的末尾，描述的正是
> `use-local-host-item-for-proxy = true` 时的行为）

也就是说：**Surge 不做测速、不做并发竞速，也不是「哪条快走哪条」**，而是每次
（每条新连接）从列表里**随机**挑一个地址。Telegram 会同时开好几条长连接
（主连接 / 媒体 / 上传），随机的结果就是连接被摊到三个 IP 上——某个 IP 慢，那部分连接就慢。

Surge 里没有能把「择优」做进 IP 映射的开关：

- `[IP Rewrite]` 只有 `reflect` / `reject` / `drop`，不能改目的地址；
- 策略组的 `url-test` / `smart` / `load-balance` 只对**代理节点**生效，管不到 IP→IP 映射；
- `[Host]` 只支持逗号列表，没有权重、没有探测。

所以「合并成一个模块」的收益是**分摊 + 冗余**（三个都活着时不会因为某一个挂了就全废），
不是「自动走最快」。要确定性地只用最快那个，还是得像 Loon 那边一样单选一个 IP
（本模块把三个参数填成同一个即可，或者手动改 `[Host]` 目标）。

## 坏 IP 列表

与源模块一致，9 条：

```
91.108.56.100 / .101 / .104 / .107 / .120 / .125 / .126 / .128 / .156
```

社区版一般还会补 `.109 .110 .113 .134 .138 .143 .145` 等，需要就照同样格式往下加。

## 验证

- 三个目标地址：`91.108.56.147 / .180 / .201`，`ip-api` 查得均为
  Singapore · `AS62014 Telegram Messenger Inc`；443 端口可连通，
  发 `GET /` 回 `HTTP/1.1 404 Not Found`（Telegram DC 的特征响应）。
- 交错 6 轮 RTT 中位（2026-11-15 本机）：`.201` 189ms ＜ `.180` 204ms ＜ `.147` 218ms；
  11-07 那次则是 `.147` 最快——波动大，别把单次结果当定论。
- 顺带探测 `91.108.56.0/24` 中 37 个候选地址，100~190 段几乎全部回 Telegram DC 的 404，
  整个 /24 基本就是 DC5。

## 与 Loon 版的差异

| | Surge（本模块） | Loon |
| --- | --- | --- |
| 一条映射能否写多个目标 | ✅ `ip1,ip2,ip3`，随机挑一个 | ❌ 每条只能一个目标 IP |
| 换目标 | 改模块参数 | 换装另一个变体插件（`fktg.plugin` / `fktg-201.plugin` / `fktg-180.plugin`） |
| 代理连接也吃映射 | `[General] use-local-host-item-for-proxy = true` | 每条尾部 `,use-in-proxy=true` |
