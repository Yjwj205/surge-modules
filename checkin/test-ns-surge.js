/**
 * NodeSeek 签到 Surge 版测试（重点：信息面板模式）
 * 运行：node test-ns-surge.js
 */
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? " -> " + extra : "")); }
}

const CODE = fs.readFileSync(path.join(__dirname, "scripts/nscheckin.js"), "utf8");
const COOKIE = "smac=1700000000-abcdef; other=1";

function run(opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const notes = [];
    const doneCalls = [];
    const logs = [];
    const calls = [];
    const ctx = {
      console: { log: (...a) => logs.push(a.join(" ")) },
      setTimeout: opts.fastTimers ? (fn, ms) => setTimeout(fn, 0) : setTimeout,
      $environment: { "surge-version": "5.11.0" },
      $argument: opts.argument === undefined ? "" : opts.argument,
      $input: opts.input || undefined,
      $trigger: opts.input ? "button" : undefined,
      $persistentStore: { read: () => (opts.cookie || null), write: () => true },
      $notification: { post: (t, s, c, o) => notes.push({ title: t, subtitle: s, content: c, options: o }) },
      $httpClient: {
        post: (o, cb) => {
          calls.push(o);
          // opts.queue 可按顺序给出每次请求的结果，用于验证重试；缺省沿用基础结果
          const q = opts.queue && opts.queue.length ? opts.queue.shift() : null;
          if (q && q.error) return cb(q.error, null, null);
          const base = q || opts;
          cb(base.error || null, { status: base.status || 200 }, base.body || "{}");
        },
        get: (o, cb) => cb(null, { status: 200 }, "")
      },
      $done: (v) => doneCalls.push(v)
    };
    vm.createContext(ctx);
    vm.runInContext(CODE, ctx);
    setTimeout(() => resolve({ notes, doneCalls, logs, calls }), 60);
  });
}

const ARG = "NS_COOKIE=" + encodeURIComponent(COOKIE) + "&TG_BOT_TOKEN=none&TG_USER_ID=none&TG_NOTIFY_ONLY_FAIL=false&RANDOM_REWARD=false&autoDismiss=false";
const PANEL = { purpose: "panel", position: "policy-selection", panelName: "NS-Checkin" };

(async () => {
  console.log("\n[NodeSeek][Surge] 面板：签到成功");
  {
    const r = await run({ argument: ARG, input: PANEL, body: JSON.stringify({ message: "签到成功，获得 1 个鸡腿" }) });
    const out = r.doneCalls[0] || {};
    ok("面板模式照常发通知", r.notes.length === 1, JSON.stringify(r.notes));
    ok("返回面板标题", out.title === "⛩️ NodeSeek 签到", String(out.title));
    ok("返回二次元图标", out.icon === "checkmark.seal.fill" && out["icon-color"] === "#34D399", out.icon + " / " + out["icon-color"]);
    ok("不带 style", out.style === undefined, String(out.style));
    ok("正文含签到结果", /签到成功/.test(out.content || ""), out.content);
    ok("自动签到路径请求一次", r.calls.length === 1, String(r.calls.length));
  }

  console.log("\n[NodeSeek][Surge] 面板：今日已签到");
  {
    const r = await run({ argument: ARG, input: PANEL, status: 500, body: JSON.stringify({ message: "今天已完成签到，请勿重复操作" }) });
    const out = r.doneCalls[0] || {};
    ok("识别为已签到", /今日已签到/.test(out.content || ""), out.content);
    ok("颜色保持主题色", out["icon-color"] === "#34D399", String(out["icon-color"]));
  }

  console.log("\n[NodeSeek][Surge] 面板：500 错误");
  {
    const r = await run({ argument: ARG, input: PANEL, status: 500, body: "boom" });
    const out = r.doneCalls[0] || {};
    ok("失败时图标变红", out["icon-color"] === "#FF6B6B", String(out["icon-color"]));
    ok("正文说明错误", /500|内部错误/.test(out.content || ""), out.content);
  }

  console.log("\n[NodeSeek][Surge] 面板：没有 Cookie");
  {
    const r = await run({ argument: "NS_COOKIE=none", input: PANEL });
    const out = r.doneCalls[0] || {};
    ok("提示无法签到", /无法签到/.test(out.content || ""), out.content);
    ok("红色图标", out["icon-color"] === "#FF6B6B", String(out["icon-color"]));
    ok("没发请求", r.calls.length === 0, String(r.calls.length));
  }

  console.log("\n[NodeSeek][Surge] 定时任务（非面板）");
  {
    const r = await run({ argument: ARG, body: JSON.stringify({ message: "签到成功" }) });
    ok("照常发通知", r.notes.length === 1);
    ok("$done 空对象（不污染 cron 结果）", JSON.stringify(r.doneCalls[0]) === "{}", JSON.stringify(r.doneCalls[0]));
  }

  console.log("\n[NodeSeek][Surge] 超时与重试");
  {
    const r = await run({
      argument: ARG, fastTimers: true,
      queue: [{ error: "HTTP request timeout" }, { status: 200, body: JSON.stringify({ message: "签到成功" }) }]
    });
    ok("请求带上 20s 超时", r.calls[0] && r.calls[0].timeout === 20, String(r.calls[0] && r.calls[0].timeout));
    ok("超时后自动重试", r.calls.length === 2, String(r.calls.length));
    ok("重试成功照常通知", r.notes.length === 1 && /签到成功/.test(r.notes[0].subtitle + r.notes[0].content), JSON.stringify(r.notes));
  }

  console.log("\n[NodeSeek][Surge] 重试耗尽");
  {
    const r = await run({
      argument: ARG, fastTimers: true,
      queue: [{ error: "HTTP request timeout" }, { error: "HTTP request timeout" }, { error: "HTTP request timeout" }]
    });
    ok("最多 3 次请求", r.calls.length === 3, String(r.calls.length));
    ok("最终报网络异常", r.notes.length === 1 && /网络请求异常/.test(r.notes[0].subtitle), JSON.stringify(r.notes));
  }

  console.log("\n结果：" + pass + " 通过 / " + fail + " 失败\n");
  process.exit(fail ? 1 : 0);
})();
