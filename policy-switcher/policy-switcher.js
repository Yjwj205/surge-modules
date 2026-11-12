/**
 * 定时切换策略 · Surge
 *
 * 到点把指定的 select 策略组切换到指定子策略（默认 09:00 → Matrix，19:00 → 吹雪云观影组）。
 * 优先用 Surge 原生 $surge.setSelectGroupPolicy()，老版本回退 HTTP API /v1/policy_groups/select。
 * 幂等：已经是目标策略时什么都不做，也不发通知。
 *
 * 参数（module 里以 argument="k=v&k2=v2" 传入，也兼容 JSON 字符串）：
 *   mode      am | pm | auto            本次按哪个时段处理；auto 按当前时间判断（用于启动补一次 / 手动执行）
 *   group     策略组名称（select 类型）
 *   amCron    早间 cron（auto 模式下用于判断时段与面板倒计时）
 *   amTarget  早间目标子策略
 *   pmCron    晚间 cron
 *   pmTarget  晚间目标子策略
 *   notify    true/false，切换成功后是否通知（失败总是通知）
 *   target    直接指定目标（可选，优先级低于 mode）
 *
 * 作者：Yjwj205 / Minis
 */

var SCRIPT_TAG = "定时切换策略";
var LAST_KEY = "policy_switcher_last";

var DEFAULTS = {
    group: "综合利用EMBY4837",
    amCron: "0 9 * * *",
    amTarget: "Matrix",
    pmCron: "0 19 * * *",
    pmTarget: "吹雪云观影组",
    notify: "true"
};

var ARGS = parseArgs(typeof $argument !== "undefined" ? $argument : "");
var OPT = {
    mode: String(ARGS.mode || "auto").toLowerCase(),
    group: String(ARGS.group || DEFAULTS.group),
    amCron: String(ARGS.amCron || DEFAULTS.amCron),
    amTarget: String(ARGS.amTarget || DEFAULTS.amTarget),
    pmCron: String(ARGS.pmCron || DEFAULTS.pmCron),
    pmTarget: String(ARGS.pmTarget || DEFAULTS.pmTarget),
    target: ARGS.target ? String(ARGS.target) : "",
    notify: truthy(ARGS.notify, true)
};

var IS_PANEL = !!(typeof $input !== "undefined" && $input && $input.purpose === "panel");

/* ------------------------------------------------------------------ 工具 */

function log() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(String(arguments[i]));
    try {
        console.log("[policy-switcher] " + parts.join(" "));
    } catch (e) { /* ignore */ }
}

function safeDecode(s) {
    try {
        return decodeURIComponent(String(s).replace(/\+/g, " "));
    } catch (e) {
        return String(s);
    }
}

function parseArgs(raw) {
    var out = {};
    if (raw === undefined || raw === null || raw === "") return out;
    if (typeof raw === "object") {
        for (var k in raw) {
            if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = raw[k];
        }
        return out;
    }
    var text = String(raw).trim();
    if (text.charAt(0) === "{") {
        try {
            var obj = JSON.parse(text);
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
            }
            return out;
        } catch (e) { /* 不是 JSON，按 query string 继续解析 */ }
    }
    text.split("&").forEach(function (pair) {
        if (!pair) return;
        var at = pair.indexOf("=");
        if (at < 0) {
            out[safeDecode(pair.trim())] = "true";
            return;
        }
        var name = safeDecode(pair.slice(0, at).trim());
        var val = safeDecode(pair.slice(at + 1).trim());
        if (name) out[name] = val;
    });
    return out;
}

function truthy(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    var s = String(value).toLowerCase();
    return !(s === "false" || s === "0" || s === "off" || s === "no");
}

function pad(n) {
    return (n < 10 ? "0" : "") + n;
}

function errText(e) {
    if (!e) return "未知错误";
    if (typeof e === "string") return e;
    return String(e.message || e);
}

/** 解析 cron 的分、时两个字段；只接受纯数字，复杂表达式返回 null（auto 模式会跳过判断） */
function cronMinutes(expr) {
    var fields = String(expr || "").trim().split(/\s+/);
    if (fields.length === 6) fields = fields.slice(1); // 6 段 cron 带秒
    if (fields.length !== 5) return null;
    if (!/^\d+$/.test(fields[0]) || !/^\d+$/.test(fields[1])) return null;
    var minute = parseInt(fields[0], 10);
    var hour = parseInt(fields[1], 10);
    if (minute > 59 || hour > 23) return null;
    return hour * 60 + minute;
}

function minutesLabel(mins) {
    if (mins === null) return "?";
    return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60);
}

function notify(title, subtitle, body, autoDismiss) {
    try {
        if (typeof $notification === "undefined" || !$notification) return;
        if (typeof $notification.post === "function") {
            try {
                $notification.post(title, subtitle, body, { "auto-dismiss": !!autoDismiss });
            } catch (e) {
                $notification.post(title, subtitle, body);
            }
        }
    } catch (e) {
        log("通知失败:", errText(e));
    }
}

function logbook(line) {
    try {
        if (typeof $surge !== "undefined" && $surge && typeof $surge.logbook === "function") {
            $surge.logbook(line);
        }
    } catch (e) { /* ignore */ }
}

function done(result) {
    try {
        if (typeof $done === "function") $done(result || {});
    } catch (e) {
        log("$done 失败:", errText(e));
    }
}

function saveLast(entry) {
    try {
        if (typeof $persistentStore === "undefined" || !$persistentStore) return;
        $persistentStore.write(JSON.stringify(entry), LAST_KEY);
    } catch (e) { /* ignore */ }
}

function readLast() {
    try {
        if (typeof $persistentStore === "undefined" || !$persistentStore) return null;
        var raw = $persistentStore.read(LAST_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/* ------------------------------------------------------------ 时段与目标 */

/** 返回 {phase, label, target, cron} 或 {error} */
function resolveTarget() {
    if (OPT.mode === "am") {
        return { phase: "am", label: "早间", target: OPT.amTarget, cron: OPT.amCron };
    }
    if (OPT.mode === "pm") {
        return { phase: "pm", label: "晚间", target: OPT.pmTarget, cron: OPT.pmCron };
    }
    if (OPT.mode === "target" && OPT.target) {
        return { phase: "manual", label: "手动", target: OPT.target, cron: "" };
    }

    var am = cronMinutes(OPT.amCron);
    var pm = cronMinutes(OPT.pmCron);
    if (am === null || pm === null) {
        return { error: "自动模式无法从 cron 解析切换时间（仅支持「分 时 * * *」形式），请用 am/pm 方式运行" };
    }
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var candidates = [
        { phase: "am", label: "早间", target: OPT.amTarget, cron: OPT.amCron, at: am },
        { phase: "pm", label: "晚间", target: OPT.pmTarget, cron: OPT.pmCron, at: pm }
    ];
    var best = candidates[0];
    var bestDelta = Infinity;
    candidates.forEach(function (item) {
        var delta = (mins - item.at + 1440) % 1440; // 距今过去多少分钟（跨天环绕）
        if (delta < bestDelta) {
            bestDelta = delta;
            best = item;
        }
    });
    return { phase: best.phase, label: best.label, target: best.target, cron: best.cron, at: best.at, delta: bestDelta };
}

/** 距离下一次切换还有多久 */
function nextSwitch(nowMins) {
    var am = cronMinutes(OPT.amCron);
    var pm = cronMinutes(OPT.pmCron);
    if (am === null || pm === null) return null;
    var soonest = null;
    [am, pm].forEach(function (at) {
        var delta = (at - nowMins + 1440) % 1440;
        if (delta === 0) delta = 1440;
        if (soonest === null || delta < soonest.delta) soonest = { at: at, delta: delta };
    });
    return soonest;
}

/* -------------------------------------------------------------- Surge API */

function groupDetails() {
    try {
        if (typeof $surge !== "undefined" && $surge && typeof $surge.selectGroupDetails === "function") {
            var info = $surge.selectGroupDetails();
            if (info && info.decisions) return info;
        }
    } catch (e) {
        log("selectGroupDetails 失败:", errText(e));
    }
    return null;
}

/** 读取当前选中项与可选子策略 */
function readState(callback) {
    var info = groupDetails();
    if (info) {
        var groups = info.groups || {};
        var decisions = info.decisions || {};
        return callback(null, decisions[OPT.group] || null, groups[OPT.group] || null);
    }
    if (typeof $httpAPI === "function") {
        var path = "/v1/policy_groups/select?group_name=" + encodeURIComponent(OPT.group);
        return $httpAPI("GET", path, {}, function (result) {
            callback(null, (result && (result.policy || result.selected)) || null, null);
        });
    }
    callback(null, null, null);
}

function applyPolicy(target, callback) {
    try {
        if (typeof $surge !== "undefined" && $surge && typeof $surge.setSelectGroupPolicy === "function") {
            var ok = $surge.setSelectGroupPolicy(OPT.group, target);
            return callback(ok === false ? "setSelectGroupPolicy 返回 false" : null);
        }
    } catch (e) {
        return callback(errText(e));
    }
    if (typeof $httpAPI === "function") {
        return $httpAPI("POST", "/v1/policy_groups/select",
            { group_name: OPT.group, policy: target },
            function (result) {
                if (result && result.error) return callback(String(result.error));
                callback(null);
            });
    }
    callback("当前环境不支持策略切换（需要 Surge 5.x 及以上）");
}

/* ------------------------------------------------------------------ 面板 */

function renderPanel() {
    var picked = resolveTarget();
    readState(function (err, current, subs) {
        var expected = picked.error ? null : picked.target;
        var lines = [];
        lines.push("策略组：" + OPT.group);
        lines.push("当前节点：" + (current || "未知"));
        lines.push("早间 " + minutesLabel(cronMinutes(OPT.amCron)) + " → " + OPT.amTarget);
        lines.push("晚间 " + minutesLabel(cronMinutes(OPT.pmCron)) + " → " + OPT.pmTarget);

        var now = new Date();
        var nowMins = now.getHours() * 60 + now.getMinutes();
        var next = nextSwitch(nowMins);
        if (next) {
            var hours = Math.floor(next.delta / 60);
            var mins = next.delta % 60;
            var inText = hours > 0 ? hours + " 小时 " + mins + " 分" : mins + " 分";
            lines.push("下次切换：" + minutesLabel(next.at) + "（" + inText + "后）");
        }
        if (picked.error) {
            lines.push("自动判断：" + picked.error);
        } else if (picked.label !== "手动") {
            lines.push("当前应是：" + picked.label + " → " + picked.target);
        }

        var last = readLast();
        if (last && last.time) lines.push("上次切换：" + last.time);

        var style = "info";
        if (expected && current) style = current === expected ? "good" : "alert";
        if (picked.error) style = "alert";

        done({
            title: SCRIPT_TAG,
            content: lines.join("\n"),
            style: style,
            icon: "arrow.triangle.swap",
            "icon-color": "0A84FF"
        });
    });
}

/* ------------------------------------------------------------------ 主流程 */

function fail(reason, subtitle, options) {
    log("失败:", reason);
    logbook(SCRIPT_TAG + " 失败：" + reason);
    var body = reason;
    if (options && options.length) {
        body += "\n可选：" + options.slice(0, 12).join(" / ") + (options.length > 12 ? " …" : "");
    }
    notify(SCRIPT_TAG + " ❌ 未切换", subtitle || OPT.group, body, false);
    done();
}

function main() {
    if (IS_PANEL) return renderPanel();

    var picked = resolveTarget();
    if (picked.error) return fail(picked.error);

    readState(function (err, current, subs) {
        if (err) return fail(errText(err));
        if (subs && subs.length && subs.indexOf(picked.target) < 0) {
            return fail("目标子策略「" + picked.target + "」不在「" + OPT.group + "」里，请检查模块参数", OPT.group, subs);
        }

        var trigger = typeof $trigger !== "undefined" ? String($trigger) : "";

        if (current && current === picked.target) {
            log("已是 " + picked.target + "（" + picked.label + "），无需切换");
            logbook(SCRIPT_TAG + "：" + OPT.group + " 已是 " + picked.target + "，跳过");
            if (trigger === "button") {
                notify(SCRIPT_TAG, OPT.group, "当前已经是 " + picked.target + "，无需切换", true);
            }
            return done();
        }

        applyPolicy(picked.target, function (applyErr) {
            if (applyErr) {
                return fail("切换失败：" + applyErr + (subs ? "" : "（策略组不存在或不是 select 类型）"), OPT.group, subs);
            }
            log("已切换 " + OPT.group + " → " + picked.target);
            logbook(SCRIPT_TAG + "：" + OPT.group + " " + (current || "?") + " → " + picked.target);
            var now = new Date();
            var stamp = (now.getMonth() + 1) + "-" + now.getDate() + " " +
                pad(now.getHours()) + ":" + pad(now.getMinutes());
            saveLast({ time: stamp, phase: picked.label, from: current || "", to: picked.target });
            if (OPT.notify) {
                notify(SCRIPT_TAG, OPT.group,
                    (current ? current + " → " : "") + picked.target + "（" + picked.label + "）", true);
            }
            done();
        });
    });
}

main();
