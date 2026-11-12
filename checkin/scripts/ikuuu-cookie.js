/* surge-adapter: 模块参数默认哨兵 none 视为空值 */
try {
  if (typeof $argument === "string" && $argument.indexOf("=none") !== -1) {
    $argument = $argument.replace(/(^|&)([^=&]+)=none(?=&|$)/g, "$1$2=");
  }
} catch (e) {}
/**
 * iKuuu Cookie 抓取（Loon http-request 脚本）
 *
 * 作者：Yjwj205 / Minis
 * 主页：https://github.com/Yjwj205
 * 仓库：https://github.com/Yjwj205/loon-modules
 *
 * 作用：已登录状态下打开 ikuuu.org 时，把请求头里的 Cookie 存进 Loon 本地存储，
 *      供 ikuuu-checkin.js 定时签到使用。
 *
 * 参数（插件 [Argument] 传入）：
 *   notify  抓取成功后是否发通知，默认 true
 *
 * 注意：
 *   - 插件里的「抓取 Cookie」开关关闭后本脚本不再执行，已保存的 Cookie 仍然可用；
 *   - 只有登录后才会出现的会话 Cookie（auth / uid+key / session 等）才会保存，
 *     游客 Cookie（如 __cf_bm）不会覆盖已保存的值；
 *   - 需要 Loon 开启 MitM 且已安装/信任证书（插件已声明 hostname = ikuuu.org）；
 *   - 脚本只读 Cookie、不修改请求，最后 $done({}) 原样放行。
 */
(function () {
  "use strict";

  var COOKIE_KEY = "ikuuu_org_cookie";
  // 登录后才会出现的会话 Cookie：v2board 用 auth，兼容 uid+key / session / remember
  var LOGIN_COOKIE = /(?:^|;\s*)(?:auth|uid|key|session|remember_[^=;]*)=[^;]/i;

  // Surge: $argument 是 "k=v&k2=v2" 字符串；Loon: 对象
  function parseArgs(raw) {
    if (raw === null || raw === undefined) return {};
    if (typeof raw === "object") return raw;
    var o = {};
    String(raw).split("&").forEach(function (p) {
      if (!p) return;
      var i = p.indexOf("=");
      if (i < 0) return;
      try { o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); }
      catch (e) { o[p.slice(0, i)] = p.slice(i + 1); }
    });
    return o;
  }
  var args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
  var notifyEnabled = String(args.notify).toLowerCase() !== "false";
  // 通知自动消失秒数（0 = 不自动消失），需要 Surge iOS 5.11.0+ / Surge Mac 5.7.0+
  var autoDismiss = 1200;
  if (args.autoDismiss !== undefined && args.autoDismiss !== "") {
    var autoSec = Number(args.autoDismiss);
    if (!isNaN(autoSec) && autoSec >= 0) autoDismiss = autoSec;
  }
  var isSurge = typeof $environment !== "undefined" && $environment["surge-version"];
  // Surge 没有 enable= 开关，用参数在脚本里自行短路
  if (String(args.capture).toLowerCase() === "false") {
    console.log("[iKuuu] 抓取开关已关闭，跳过");
    return $done({});
  }

  function notify(subtitle, content) {
    if (!notifyEnabled) return;
    try {
      if (isSurge && autoDismiss > 0) {
        $notification.post("iKuuu Cookie 抓取", subtitle, content, { "auto-dismiss": autoDismiss });
      } else {
        $notification.post("iKuuu Cookie 抓取", subtitle, content);
      }
    } catch (e) {
      console.log("[iKuuu] 通知发送失败：" + e);
    }
  }

  function findCookie(headers) {
    if (!headers) return "";
    for (var key in headers) {
      if (key && key.toLowerCase() === "cookie" && headers[key]) {
        return String(headers[key]);
      }
    }
    return "";
  }

  // 登录响应：直接从 Set-Cookie 里拿登录凭证
  if (typeof $response !== "undefined") {
    try {
      var sc = ($response && $response.headers && ($response.headers["Set-Cookie"] || $response.headers["set-cookie"])) || "";
      if (Array.isArray(sc)) sc = sc.join("; ");
      var parts = String(sc).split(/,(?=\s*[A-Za-z0-9_!#$%&'*+.^`|~-]+=)/);
      var picked = [];
      parts.forEach(function (one) {
        var kv = String(one).split(";")[0].trim();
        if (LOGIN_COOKIE.test("; " + kv)) picked.push(kv);
      });
      if (picked.length) {
        var line = picked.join("; ");
        var prev = "";
        try { prev = String($persistentStore.read(COOKIE_KEY) || ""); } catch (e) {}
        if (prev !== line) {
          var ok2 = false;
          try { ok2 = $persistentStore.write(line, COOKIE_KEY); } catch (e) {}
          if (ok2) {
            notify("已获取登录 Cookie", "登录成功，Cookie 已保存。可以在模块里把「抓取 Cookie」关掉了。");
          }
        }
      } else {
        console.log("[iKuuu] 登录响应里没有登录类 Set-Cookie，跳过");
      }
    } catch (e) {
      console.log("[iKuuu] 解析 Set-Cookie 失败：" + e);
    }
    return $done({});
  }

  var cookie = "";
  try {
    cookie = findCookie($request && $request.headers).trim();
  } catch (e) {
    console.log("[iKuuu] 读取请求头失败：" + e);
  }


  // 反馈节流：10 分钟内只提示一次，避免刷屏
  function notice(text) {
    var KEY = "ikuuu_capture_notice_ts";
    var now = Date.now();
    try {
      var last = Number($persistentStore.read(KEY) || 0);
      if (now - last < 600000) return;
      $persistentStore.write(String(now), KEY);
    } catch (e) {}
    notify(text, "在 Safari 登录 ikuuu.org 后再刷新一次即可；也可以在模块参数里直接粘贴 Cookie。");
  }

  if (!cookie) {
    console.log("[iKuuu] 本次请求没有 Cookie，跳过");
    notice("抓到了 ikuuu 请求，但没有 Cookie");
    return $done({});
  }

  if (!LOGIN_COOKIE.test(cookie)) {
    console.log("[iKuuu] 当前是未登录状态，忽略本次 Cookie");
    notice("抓到的是游客 Cookie，未登录");
    return $done({});
  }

  var existing = "";
  try {
    existing = String($persistentStore.read(COOKIE_KEY) || "");
  } catch (e) {}

  if (existing === cookie) {
    console.log("[iKuuu] Cookie 没有变化，跳过写入");
    return $done({});
  }

  var saved = false;
  try {
    saved = $persistentStore.write(cookie, COOKIE_KEY);
  } catch (e) {
    console.log("[iKuuu] 保存 Cookie 失败：" + e);
  }

  if (saved) {
    console.log("[iKuuu] 已保存登录 Cookie（" + cookie.length + " 字节）");
    notify("已获取登录 Cookie",
      "可以在插件里把「抓取 Cookie」开关关掉了，签到会继续使用这份 Cookie。");
  } else {
    console.log("[iKuuu] 写入本地存储失败");
    notify("Cookie 保存失败", "写入 Loon 本地存储失败，请检查 Loon 的存储权限后重试。");
  }

  $done({});
})();
