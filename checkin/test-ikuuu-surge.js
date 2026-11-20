/**
 * iKuuu Surge 版脚本本地测试（模拟 Surge 运行环境：$argument 是字符串、有 $environment）
 * 运行：node test-ikuuu-surge.js
 */
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

let pass = 0;
let fail = 0;

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("  ✓ " + name);
  } else {
    fail++;
    console.log("  ✗ " + name + (extra ? " -> " + extra : ""));
  }
}

function run(opts) {
  opts = opts || {};
  const code = fs.readFileSync(path.join(__dirname, "scripts/ikuuu-checkin.js"), "utf8");
  const doneCalls = [];
  const notes = [];
  const logs = [];
  const calls = [];
  const store = Object.assign({}, opts.store || {});
  let writeCalls = 0;

  const ctx = {
    console: { log: (...a) => logs.push(a.join(" ")) },
    setTimeout: (fn) => fn(),
    $environment: { "surge-version": "5.11.0", "device-model": "iPhone" },
    $input: opts.input || undefined,
    $trigger: opts.input ? "button" : undefined,
    $argument: opts.argument === undefined ? "" : opts.argument,
    $persistentStore: {
      read: (k) => (k in store ? store[k] : null),
      write: (v, k) => { writeCalls++; store[k] = v; return true; }
    },
    $notification: {
      post: (t, s, c, o) => notes.push({ title: t, subtitle: s, content: c, options: o })
    },
    $httpClient: {
      post: (o, cb) => {
        calls.push({ type: "post", opts: o });
        cb(opts.postError || null, opts.postResponse || { status: 200 }, opts.postData);
      },
      get: (o, cb) => {
        calls.push({ type: "get", opts: o });
        cb(opts.getError || null, opts.getResponse || { status: 200 }, opts.getData);
      }
    },
    $done: (v) => doneCalls.push(v)
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return { notes, logs, store, doneCalls, writeCalls, calls };
}

function b64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

const userPage = 'var originBody = "' + b64(
  '<html><body><div>剩余流量 <span class="counter">12.34</span> GB</div>' +
  '<div>今日已用 <span class="counter">0.50</span> GB</div></body></html>'
) + '";';

const OK = JSON.stringify({ ret: 1, msg: "签到成功，获得了 1024 MB 流量" });
const DAY = 86400000;

console.log("\n[iKuuu][Surge] 参数与请求");

{
  const r = run({ argument: "cookie=none&notify=true&expireInfo=true&requestNode=none&autoDismiss=false" });
  ok("none 哨兵视为空 Cookie", /没有 Cookie/.test(r.notes[0].subtitle), r.notes[0] && r.notes[0].subtitle);
  ok("没有 Cookie 时 $done 一次", r.doneCalls.length === 1);
}

{
  const r = run({
    argument: "cookie=auth%3Dabc&notify=true&expireInfo=true&requestNode=none&autoDismiss=false",
    postData: OK,
    getData: userPage
  });
  ok("签到成功", r.notes[0].subtitle === "签到成功", r.notes[0] && r.notes[0].subtitle);
  ok("包含服务器 msg", /1024 MB/.test(r.notes[0].content));
  ok("包含剩余流量", /剩余流量：12\.34 GB/.test(r.notes[0].content), r.notes[0].content);
  const post = r.calls.find((c) => c.type === "post");
  ok("Surge 下 timeout 用秒", post.opts.timeout === 15, String(post.opts.timeout));
  ok("跳过后端证书校验", post.opts.insecure === true);
  ok("自己带 Cookie，关掉 auto-cookie", post.opts["auto-cookie"] === false);
  ok("未填 requestNode 不带 policy", !("policy" in post.opts));
  ok("Cookie 解码正确", post.opts.headers.Cookie === "auth=abc", post.opts.headers.Cookie);
  ok("返回值带内容", r.doneCalls[0] && /签到成功/.test(r.doneCalls[0].content));
}

{
  const r = run({
    argument: "cookie=auth%3Dabc&notify=true&requestNode=HK%20Node&autoDismiss=true",
    postData: OK,
    getData: userPage
  });
  const post = r.calls.find((c) => c.type === "post");
  ok("requestNode 映射为 policy", post.opts.policy === "HK Node", String(post.opts.policy));
  ok("通知带 auto-dismiss", r.notes[0].options && r.notes[0].options["auto-dismiss"] === true);
}

console.log("\n[iKuuu][Surge] 通知开关");

{
  const r = run({
    argument: "cookie=auth%3Dabc&notify=false&expireInfo=true",
    postData: OK,
    getData: userPage
  });
  ok("notify=false 字符串也静默", r.notes.length === 0, JSON.stringify(r.notes));
  ok("静默时仍执行签到", r.calls.some((c) => c.type === "post"));
  ok("静默时日志仍有结果", r.logs.some((l) => /签到成功/.test(l)));
}

console.log("\n[iKuuu][Surge] CK 剩余与过期提醒");

{
  const ts = Math.floor((Date.now() + 10 * DAY) / 1000);
  const ck = "uid=1; key=abc; expire_in=" + ts;
  const r = run({
    argument: "cookie=" + encodeURIComponent(ck) + "&notify=true&expireInfo=true",
    postData: OK,
    getData: userPage
  });
  ok("显示 CK 剩余天数", /CK 剩余：10 天（\d{4}-\d{2}-\d{2} \d{2}:\d{2} 到期）/.test(r.notes[0].content),
    r.notes[0].content);
  ok("剩余 >2 天不额外提醒", r.notes.length === 1);
}

{
  const ts = Math.floor((Date.now() + 10 * DAY) / 1000);
  const ck = "uid=1; key=abc; expire_in=" + ts;
  const r = run({
    argument: "cookie=" + encodeURIComponent(ck) + "&notify=true&expireInfo=false",
    postData: OK,
    getData: userPage
  });
  ok("expireInfo=false 不显示", !/CK 剩余/.test(r.notes[0].content), r.notes[0].content);
}

{
  const ts = Math.floor((Date.now() + DAY) / 1000);
  const ck = "uid=1; key=abc; expire_in=" + ts;
  const r = run({
    argument: "cookie=" + encodeURIComponent(ck) + "&notify=true&expireInfo=true",
    postData: OK,
    getData: userPage
  });
  ok("剩余 ≤2 天单独提醒", r.notes.some((n) => /即将过期/.test(n.title)), JSON.stringify(r.notes.map((n) => n.title)));
  ok("记录当天提醒戳", String(r.store.ikuuu_expire_warn || "").indexOf("|" + ts) > 0,
    r.store.ikuuu_expire_warn);

  const again = run({
    argument: "cookie=" + encodeURIComponent(ck) + "&notify=true&expireInfo=true",
    postData: OK,
    getData: userPage,
    store: r.store
  });
  ok("同一天不重复提醒", !again.notes.some((n) => /即将过期/.test(n.title)));
}

{
  const ts = Math.floor((Date.now() - 3 * DAY) / 1000);
  const ck = "uid=1; key=abc; expire_in=" + ts;
  const r = run({
    argument: "cookie=" + encodeURIComponent(ck) + "&notify=true&expireInfo=true",
    postData: OK,
    getData: userPage
  });
  ok("已过期显示「CK：已过期」", /CK：已过期（\d{4}-\d{2}-\d{2} \d{2}:\d{2}）/.test(r.notes[0].content),
    r.notes[0].content);
  ok("已过期不再发到期提醒", !r.notes.some((n) => /即将过期/.test(n.title)));
}

console.log("\n[iKuuu][Surge] 异常路径");

{
  const r = run({
    argument: "cookie=auth%3Dabc&notify=true",
    postError: "Error: certificate verify failed"
  });
  ok("证书错误单独提示", r.notes[0].subtitle === "TLS 校验失败", r.notes[0].subtitle);
  ok("提示里给出排查步骤", /请求节点/.test(r.notes[0].content));
}

{
  const r = run({
    argument: "cookie=auth%3Dabc&notify=true",
    postData: "<html><body>login</body></html>",
    postResponse: { status: 200 }
  });
  ok("登录页判定 Cookie 失效", r.notes[0].subtitle === "Cookie 已失效", r.notes[0].subtitle);
}

{
  const r = run({
    argument: "cookie=auth%3Dabc&notify=true",
    postData: JSON.stringify({ ret: 0, msg: "您今日已经签到过了" })
  });
  ok("重复签到识别为已签到", r.notes[0].subtitle === "今日已签到", r.notes[0].subtitle);
}

console.log("\n[iKuuu][Surge] 信息面板（手动触发）");

{
  const r = run({
    argument: "cookie=" + encodeURIComponent("uid=1; key=abc") + "&notify=true&expireInfo=true",
    input: { purpose: "panel", position: "policy-selection", panelName: "iKuuu-Checkin" },
    postData: OK,
    getData: userPage
  });
  ok("面板模式照常发通知", r.notes.length === 1, JSON.stringify(r.notes));
  ok("通知标题固定", r.notes[0] && r.notes[0].title === "iKuuu 签到");
  ok("通知内容是签到结果", r.notes[0] && r.notes[0].subtitle === "签到成功");
  const out = r.doneCalls[0] || {};
  ok("返回面板标题", out.title === "🌸 iKuuu 签到", String(out.title));
  ok("返回面板正文（含签到结果）", /签到成功/.test(out.content || ""), out.content);
  ok("返回二次元图标", out.icon === "sparkles" && out["icon-color"] === "#FF7AC6", out.icon + " / " + out["icon-color"]);
  ok("不带 style（否则内置图标顶掉）", out.style === undefined, String(out.style));
}

{
  const r = run({
    argument: "cookie=" + encodeURIComponent("uid=1; key=abc"),
    input: { purpose: "panel", position: "policy-selection", panelName: "iKuuu-Checkin" },
    postError: "Error: certificate verify failed"
  });
  const out = r.doneCalls[0] || {};
  ok("失败时也发通知", r.notes.length === 1, JSON.stringify(r.notes));
  ok("失败时图标不变", out.icon === "sparkles", String(out.icon));
  ok("面板正文说明原因", /TLS/.test(out.content || ""), out.content);
}

{
  const r = run({
    argument: "cookie=" + encodeURIComponent("uid=1; key=abc"),
    input: { purpose: "panel", position: "policy-selection", panelName: "iKuuu-Checkin" },
    postData: JSON.stringify({ ret: 0, msg: "您今日已经签到过了" })
  });
  ok("已签到图标不变", (r.doneCalls[0] || {}).icon === "sparkles", String((r.doneCalls[0] || {}).icon));
}

{
  const r = run({
    argument: "cookie=" + encodeURIComponent("uid=1; key=abc") + "&notify=false",
    input: { purpose: "panel", position: "policy-selection", panelName: "iKuuu-Checkin" },
    postData: OK,
    getData: userPage
  });
  ok("notify=false 时面板也不弹", r.notes.length === 0, JSON.stringify(r.notes));
  ok("但卡片照常返回结果", /签到成功/.test((r.doneCalls[0] || {}).content || ""));
}

console.log("\n结果：" + pass + " 通过 / " + fail + " 失败\n");
process.exit(fail ? 1 : 0);
