/**
 * 定时切换策略·准点 · Surge 版
 * 移植自 Loon 版：policy-exact.plugin + switch-exact.js
 *   https://github.com/Yjwj205/loon-modules/blob/main/policy-exact.plugin
 *
 * 两条准点 cron 各触发一次，脚本按传入的 target 切换策略组，不轮询。
 *
 * Surge 参数（argument="group=…&target=…&notify=…"，也兼容 JSON 字符串 / 对象）：
 *   group, amTarget, pmTarget, target, notify
 *
 * 规则（与 Loon 版一致）：
 *   - 明确传了 target / amTarget / pmTarget 就用它；
 *   - 都没传则按当前小时判断（12 点前用 amTarget，之后用 pmTarget）。
 * 幂等：已在目标上直接退出，不切换、不通知。
 * 切换后复核一次当前选中项，只有确认生效才认为成功。
 */

(function () {
  var cfg = {
    group: "综合利用EMBY4837",
    amTarget: "Matrix",
    pmTarget: "吹雪云观影组",
    notify: true
  };
  var given = {};

  var arg = typeof $argument === "undefined" ? null : $argument;
  if (arg && typeof arg === "object") {
    for (var k in arg) {
      if (arg[k] === undefined || arg[k] === null || arg[k] === "") continue;
      given[k] = arg[k];
      if (k === "targetAm") given.amTarget = arg[k];
      if (k === "targetPm") given.pmTarget = arg[k];
    }
  } else if (arg) {
    var text = String(arg).trim();
    var parsed = null;
    if (text.charAt(0) === "{") {
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    }
    if (parsed && typeof parsed === "object") {
      for (var j in parsed) {
        if (parsed[j] === undefined || parsed[j] === null || parsed[j] === "") continue;
        given[j] = parsed[j];
        if (j === "targetAm") given.amTarget = parsed[j];
        if (j === "targetPm") given.pmTarget = parsed[j];
      }
    } else {
      text.split("&").forEach(function (kv) {
        var i = kv.indexOf("=");
        if (i > 0) given[safeDecode(kv.slice(0, i).trim())] = safeDecode(kv.slice(i + 1).trim());
      });
    }
  }

  function safeDecode(s) {
    try {
      return decodeURIComponent(String(s));
    } catch (e) {
      return String(s);
    }
  }

  var GROUP = String(given.group || cfg.group);
  var NOTIFY = !(given.notify === false || given.notify === "false" || given.notify === "0");

  var target = "";
  if (given.target) target = String(given.target);
  else if (given.amTarget) target = String(given.amTarget);
  else if (given.pmTarget) target = String(given.pmTarget);
  else target = new Date().getHours() < 12 ? cfg.amTarget : cfg.pmTarget;
  target = target.trim();

  var SURGE = (typeof $surge !== "undefined" && $surge) ? $surge : null;
  var HTTP = (typeof $httpAPI === "function") ? $httpAPI : null;

  function log(m) { console.log("[PolicySwitch] " + m); }

  function done() {
    if (typeof $done === "function") $done();
  }

  function notify(title, subtitle, body) {
    if (typeof $notification === "undefined" || !$notification) return;
    try {
      $notification.post(title, subtitle, body);
    } catch (e) { /* ignore */ }
  }

  function fail(msg) {
    log(msg);
    if (NOTIFY) notify("Surge 准点切换失败", GROUP, msg);
    done();
  }

  function succeed() {
    log(GROUP + " -> " + target + " 成功");
    if (NOTIFY) {
      notify("策略已切换", GROUP, target + " · 准点 " + new Date().toTimeString().slice(0, 5));
    }
    done();
  }

  /** 同步读取状态：仅在 $surge.selectGroupDetails 可用时有结果 */
  function stateSync() {
    if (SURGE && typeof SURGE.selectGroupDetails === "function") {
      try {
        var info = SURGE.selectGroupDetails();
        if (info && info.decisions) {
          return {
            current: String(info.decisions[GROUP] || ""),
            options: (info.groups && info.groups[GROUP]) || null
          };
        }
      } catch (e) {
        log("selectGroupDetails 异常: " + e);
      }
    }
    return null;
  }

  /** 回读一次，确认切换真的生效 */
  function verify(claimed, hint) {
    var state = stateSync();
    if (!state) {
      // 没有读状态的 API：只能相信切换调用的返回值
      if (claimed === false) return fail(hint || "切换失败");
      return succeed();
    }
    if (state.current === target) return succeed();

    var msg = hint ? hint + "；" : "";
    msg += "当前=" + (state.current || "?") + "，目标=" + target + "（核对策略组/子策略名称）";
    if (state.options && state.options.length) {
      msg += "\n可选：" + state.options.slice(0, 12).join(" / ") + (state.options.length > 12 ? " …" : "");
    }
    return fail(msg);
  }

  function apply(before) {
    if (before && before.current === target) {
      log(GROUP + " 已是 " + target + "，无需切换");
      if (NOTIFY) {
        notify("已在目标策略", GROUP, target + " · 准点 " + new Date().toTimeString().slice(0, 5) + "（未切换）");
      }
      return done();
    }

    if (SURGE && typeof SURGE.setSelectGroupPolicy === "function") {
      var ok = false;
      try {
        ok = SURGE.setSelectGroupPolicy(GROUP, target) !== false;
      } catch (e) {
        return fail("setSelectGroupPolicy 异常: " + e);
      }
      return verify(ok, ok ? "" : "setSelectGroupPolicy 返回 false");
    }

    if (HTTP) {
      return HTTP("POST", "/v1/policy_groups/select",
        { group_name: GROUP, policy: target },
        function (result) {
          if (result && result.error) return fail("HTTP API 返回错误: " + result.error);
          verify(true, "");
        });
    }

    fail("当前 Surge 版本不支持切换策略，请升级 Surge");
  }

  if (!target) return fail("没有指定目标策略名");
  if (!SURGE && !HTTP) return fail("当前 Surge 版本不支持切换策略，请升级 Surge");

  var state = stateSync();
  if (state) return apply(state);

  if (HTTP) {
    return HTTP("GET", "/v1/policy_groups/select?group_name=" + encodeURIComponent(GROUP), {},
      function (result) {
        apply({ current: String((result && result.policy) || ""), options: null });
      });
  }

  apply(null);
})();
