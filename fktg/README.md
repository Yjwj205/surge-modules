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

## 多地址到底怎么选？（查过官方文档，只查到一半）

我第一版说「文档写了随机」——**那句话的适用范围要缩一下**，它管不到 IP→IP 这条路径。

Surge 手册 <https://manual.nssurge.com/dns/local-dns-mapping.html> 里那句原文：

> After enabling this option, for requests whose target **domain** matches a local DNS mapping record,
> Surge sends the proxy request with the mapped IP address instead of the domain.
> **If the record has multiple addresses, one is chosen at random.**

它写在 *Use Local DNS Items for Proxied Requests* 一节，描述的是：

- 请求的目标是**域名**（不是 IP 字面量），
- 命中 `[Host]` 记录的值是 IP，
- 并且这个请求**走代理**（`use-local-host-item-for-proxy = true` 才发生），

此时 Surge 要把「映射后的 IP」塞进代理请求里，只能挑一个 → 随机挑。

而 Telegram 连的是 **IP 字面量**（`91.108.56.x:443`），不经过域名解析，也不在
「domain matches a local DNS mapping record」这句话的范围内。**文档没有描述 IP→IP 映射
在多目标时怎么选。** 我上一轮把它套到 IP→IP 上，是过度推断，撤回。

文档里能查到的、和「挑地址」有关的其它行为：

| 机制 | 文档描述 | 是择优吗 |
| --- | --- | --- |
| `prefer-v4` / `prefer-v6` | 建立 TCP 连接时先用偏好的地址族，**3 秒**连不上再开始试另一族 | 是「按族竞速」，不是延迟择优 |
| `[MTProto]` 内建代理 | 一个 DC 有多个 endpoint，**某个地址失败**就被标记、下次换下一个 | 失败回退，不是延迟择优 |
| 策略组 `url-test` / `smart` | 自动选延迟最低的**代理节点** | 只作用于节点，管不到 IP 映射 |
| `[IP Rewrite]` | 只有 `reflect` / `reject` / `drop` | 不能改目的地址 |

所以：**「并发、谁快走谁」在 Surge 文档里没有任何依据**；同时「随机」也只被证实于
「域名 → 代理 IP」这条路径。IP→IP 多目标到底怎么挑，属于未文档化的实现细节，
只能实测：装好后在 Surge 的**请求列表**里看 Telegram 那几条连接的目的地址——

- 三个 IP 轮着出现 → 分摊/随机；
- 永远只用第一个 → 顺序取首个（那就把最想要的那个写在 `ip1`）；
- 只在第一个连不上时才出现第二个 → 失败回退。

有结论后告诉我，我把这段 README 改成实测结果。

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
| 一条映射能否写多个目标 | ✅ `ip1,ip2,ip3`（挑选规则文档未写明） | ❌ 每条只能一个目标 IP |
| 换目标 | 改模块参数 | 换装另一个变体插件（`fktg.plugin` / `fktg-201.plugin` / `fktg-180.plugin`） |
| 代理连接也吃映射 | `[General] use-local-host-item-for-proxy = true` | 每条尾部 `,use-in-proxy=true` |
