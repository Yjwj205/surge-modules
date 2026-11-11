// Surge 状态面板脚本：显示 Cookie 抓取是否真的被执行过
// 参数：target=ikuuu|ns（默认 ikuuu）
(function () {
  "use strict";

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
  var target = (args.target || "ikuuu").toLowerCase();

  var CFG = {
    ikuuu: { name: "iKuuu", key: "ikuuu_org_cookie", state: "ikuuu_capture_state" },
    ns: { name: "NodeSeek", key: "NS_LOON_COOKIE", state: "ns_capture_state" }
  }[target] || { name: "iKuuu", key: "ikuuu_org_cookie", state: "ikuuu_capture_state" };

  function read(k) {
    try { return String($persistentStore.read(k) || ""); } catch (e) { return ""; }
  }

  function fmt(ts) {
    if (!ts) return "";
    var d = new Date(Number(ts));
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return (d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  var cookie = read(CFG.key);
  var rawState = read(CFG.state);
  var state = null;
  try { state = rawState ? JSON.parse(rawState) : null; } catch (e) { state = null; }

  var lines = [];
  lines.push("Cookie：" + (cookie ? "已保存（" + cookie.length + " 字节）" : "未保存"));

  if (state && state.t) {
    lines.push("抓取脚本：已运行过 " + fmt(state.t));
    lines.push("最近结果：" + (state.result || "未知"));
  } else {
    lines.push("抓取脚本：从未运行");
    lines.push("→ MITM 未对该域名生效，或还没访问过网站");
  }

  lines.push("");
  lines.push("提示：MITM 关闭 / 证书未信任时，抓取脚本不会触发。");

  $done({
    title: CFG.name + " 抓取状态",
    content: lines.join("\n"),
    icon: "arrow.clockwise.circle",
    "icon-color": cookie ? "#34C759" : "#FF3B30"
  });
})();
