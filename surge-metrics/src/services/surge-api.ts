import {
  baseUrl,
  dedupeStrings,
  getCachedCatalog,
  getCachedControl,
  getConnection,
  getControlSettings,
  setCachedCatalog,
  setCachedControl,
} from "./settings"
import type {
  ApiError,
  ApiResult,
  ControlSnapshot,
  PolicyCatalog,
  PolicyGroupInfo,
  SurgeMode,
} from "./types"

const API_TIMEOUT = 8
export const MODE_ORDER: SurgeMode[] = ["rule", "proxy", "direct"]
export const MODE_LABEL: Record<SurgeMode, string> = {
  rule: "规则",
  proxy: "全局",
  direct: "直连",
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function debug(event: string, data: Record<string, unknown> = {}): void {
  try { console.log(`[Surge Metrics] ${event} ${JSON.stringify(data)}`) } catch { /* ignore */ }
}

function redactDetail(value: unknown, apiKey: string): string {
  let detail = value instanceof Error ? value.message : String(value)
  const key = (apiKey || "").trim()
  if (key) detail = detail.split(key).join("[REDACTED]")
  return detail.replace(/([?&]x-key=)[^&\s]+/gi, "$1[REDACTED]")
}

function fail(code: ApiError["code"], message: string, extra: Partial<ApiError> = {}): ApiResult<never> {
  return { ok: false, error: { code, message, ...extra } }
}

async function apiRequest<T = unknown>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const connection = getConnection()
  if (!connection.apiKey.trim()) {
    return fail("missing_config", "请先配置 HTTP API Key", { detail: `当前地址 ${baseUrl(connection)}` })
  }
  const method = options.method || "GET"
  const url = `${baseUrl(connection)}${path}`
  debug("api.request", { method, path })
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "X-Key": connection.apiKey,
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(options.body ?? {}) } : {}),
      timeout: API_TIMEOUT,
      allowInsecureRequest: !connection.useTls,
      debugLabel: "SurgeControl",
    })
    const text = await response.text()
    if (!response.ok) {
      return fail(
        "http_error",
        response.status === 401 || response.status === 403
          ? "API Key 无效或无控制权限"
          : `请求失败 HTTP ${response.status}`,
        {
          status: response.status,
          detail: redactDetail(`${method} ${path} · ${text.slice(0, 200)}`, connection.apiKey),
        },
      )
    }
    if (!text.trim()) return { ok: true, value: null as unknown as T }
    try {
      return { ok: true, value: JSON.parse(text) as T }
    } catch {
      return fail("invalid_response", "响应不是有效 JSON", {
        detail: redactDetail(`${method} ${path} · ${text.slice(0, 200)}`, connection.apiKey),
      })
    }
  } catch (error) {
    return fail("network_error", "无法连接 Surge HTTP API", {
      detail: redactDetail(error, connection.apiKey),
    })
  }
}

/* ------------------------------------------------------------------ */
/* Parsers (exported for tests)                                       */
/* ------------------------------------------------------------------ */

export function normalizeMode(value: unknown): SurgeMode | null {
  const raw = typeof value === "string" ? value : ""
  const v = raw.trim().toLowerCase()
  if (v === "direct") return "direct"
  if (v === "proxy" || v === "global") return "proxy"
  if (v === "rule" || v === "rules") return "rule"
  return null
}

export function parseOutboundMode(json: unknown): SurgeMode | null {
  if (typeof json === "string") return normalizeMode(json)
  if (isObject(json)) {
    for (const key of ["mode", "outbound_mode", "outboundMode", "current_mode", "currentMode"]) {
      const mode = normalizeMode(json[key])
      if (mode) return mode
    }
  }
  return null
}

export function parseGlobalPolicy(json: unknown): string | null {
  if (typeof json === "string") return str(json) || null
  if (isObject(json)) {
    for (const key of ["policy", "global_policy", "globalPolicy", "proxy", "outbound_policy"]) {
      const value = str(json[key])
      if (value) return value
    }
  }
  return null
}

function collectNames(value: unknown, out: string[]): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    if (typeof item === "string") {
      if (item.trim()) out.push(item.trim())
    } else if (isObject(item)) {
      const name = str(item.name) || str(item.policy) || str(item.policy_name)
      if (name) out.push(name)
    }
  }
}

export function parsePolicyList(json: unknown): { proxies: string[]; groups: string[] } {
  const proxies: string[] = []
  const groups: string[] = []
  if (Array.isArray(json)) {
    collectNames(json, proxies)
  } else if (isObject(json)) {
    collectNames(json.proxies, proxies)
    collectNames(json.policies, proxies)
    collectNames(json["policy-groups"], groups)
    collectNames(json.policy_groups, groups)
    collectNames(json.groups, groups)
  }
  return { proxies: dedupeStrings(proxies), groups: dedupeStrings(groups) }
}

export function parsePolicyGroups(json: unknown): PolicyGroupInfo[] {
  let raw: unknown[] = []
  if (Array.isArray(json)) {
    raw = json
  } else if (isObject(json)) {
    const list = json.policy_groups ?? json["policy-groups"] ?? json.groups
    if (Array.isArray(list)) {
      raw = list
    } else {
      // Keyed form: { "Group A": { options: [...] }, ... }
      const entries: unknown[] = []
      for (const [name, def] of Object.entries(json)) {
        if (isObject(def)) entries.push({ name, ...def })
      }
      raw = entries
    }
  }

  const out: PolicyGroupInfo[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!isObject(item)) continue
    const name = str(item.name) || str(item.group_name) || str(item.groupName) || str(item.title)
    if (!name || seen.has(name)) continue
    seen.add(name)
    const type = str(item.type) || str(item.group_type) || str(item.groupType) || str(item.policy_type) || ""
    const options: string[] = []
    collectNames(item.options, options)
    collectNames(item.policies, options)
    collectNames(item.choices, options)
    collectNames(item.policy_options, options)
    collectNames(item.members, options)
    const selected =
      str(item.selected) ||
      str(item.selected_policy) ||
      str(item.selectedPolicy) ||
      str(item.current) ||
      str(item.now) ||
      str(item.policy) ||
      null
    out.push({ name, type, options: dedupeStrings(options), selected })
  }
  return out
}

export function isSelectableGroup(group: PolicyGroupInfo): boolean {
  const type = group.type.toLowerCase()
  if (!type) return group.options.length > 0
  return type === "select" || type === "manual" || type === "manual-select"
}

/* ------------------------------------------------------------------ */
/* Outbound mode                                                      */
/* ------------------------------------------------------------------ */

export async function fetchControl(): Promise<ApiResult<ControlSnapshot>> {
  const [modeRes, globalRes] = await Promise.all([
    apiRequest("/v1/outbound"),
    apiRequest("/v1/outbound/global"),
  ])
  if (!modeRes.ok && !globalRes.ok) {
    return { ok: false, error: modeRes.ok ? (globalRes as { error: ApiError }).error : modeRes.error }
  }
  const previous = getCachedControl()
  const mode = modeRes.ok ? parseOutboundMode(modeRes.value) : null
  const globalPolicy = globalRes.ok ? parseGlobalPolicy(globalRes.value) : null
  const snapshot: ControlSnapshot = {
    mode: mode ?? previous?.mode ?? null,
    globalPolicy: globalPolicy ?? previous?.globalPolicy ?? null,
    updatedAt: new Date().toISOString(),
  }
  setCachedControl(snapshot)
  debug("control.ok", { mode: snapshot.mode, globalPolicy: snapshot.globalPolicy })
  return { ok: true, value: snapshot }
}

export async function setOutboundMode(mode: SurgeMode): Promise<ApiResult<SurgeMode>> {
  const requested = normalizeMode(mode)
  if (!requested) return fail("invalid_response", "未知的运行模式")
  const res = await apiRequest("/v1/outbound", { method: "POST", body: { mode: requested } })
  if (!res.ok) return res
  const applied = parseOutboundMode(res.value) || requested
  const current = getCachedControl()
  setCachedControl({
    mode: applied,
    globalPolicy: current?.globalPolicy ?? null,
    updatedAt: new Date().toISOString(),
  })
  debug("mode.set", { mode: applied, requested })
  return { ok: true, value: applied }
}

export async function setGlobalPolicy(policy: string): Promise<ApiResult<string>> {
  const name = str(policy)
  if (!name) return fail("missing_config", "请选择全局模式策略")
  const res = await apiRequest("/v1/outbound/global", { method: "POST", body: { policy: name } })
  if (!res.ok) return res
  const applied = parseGlobalPolicy(res.value) || name
  const current = getCachedControl()
  setCachedControl({
    mode: current?.mode ?? null,
    globalPolicy: applied,
    updatedAt: new Date().toISOString(),
  })
  debug("global.set", { policy: applied })
  return { ok: true, value: applied }
}

/* ------------------------------------------------------------------ */
/* Policies and groups                                                */
/* ------------------------------------------------------------------ */

export async function fetchPolicyCatalog(): Promise<ApiResult<PolicyCatalog>> {
  const [policiesRes, groupsRes] = await Promise.all([
    apiRequest("/v1/policies"),
    apiRequest("/v1/policy_groups"),
  ])
  if (!policiesRes.ok && !groupsRes.ok) {
    return { ok: false, error: policiesRes.ok ? (groupsRes as { error: ApiError }).error : policiesRes.error }
  }
  const listed = policiesRes.ok
    ? parsePolicyList(policiesRes.value)
    : { proxies: [] as string[], groups: [] as string[] }
  const policyGroups = groupsRes.ok ? parsePolicyGroups(groupsRes.value) : []
  const groupNames = dedupeStrings([
    ...listed.groups,
    ...policyGroups.map(group => group.name),
  ])
  const catalog: PolicyCatalog = {
    proxies: listed.proxies.filter(name => !groupNames.includes(name)),
    groups: groupNames,
    policyGroups,
    fetchedAt: new Date().toISOString(),
  }
  setCachedCatalog(catalog)
  debug("catalog.ok", {
    proxies: catalog.proxies.length,
    groups: catalog.groups.length,
    details: policyGroups.length,
  })
  return { ok: true, value: catalog }
}

export async function selectGroupPolicy(groupName: string, policy: string): Promise<ApiResult<string>> {
  const group = str(groupName)
  const option = str(policy)
  if (!group || !option) return fail("missing_config", "策略组或策略为空")
  const res = await apiRequest("/v1/policy_groups/select", {
    method: "POST",
    body: { group_name: group, policy: option },
  })
  if (!res.ok) return res
  const cached = getCachedCatalog()
  if (cached) {
    setCachedCatalog({
      ...cached,
      policyGroups: cached.policyGroups.map(item =>
        item.name === group ? { ...item, selected: option } : item
      ),
    })
  }
  debug("group.select", { group, policy: option })
  return { ok: true, value: option }
}

/* ------------------------------------------------------------------ */
/* Widget gestures                                                    */
/* ------------------------------------------------------------------ */

function nextInCycle<T>(order: T[], current: T | null): T {
  if (!current) return order[0]
  const index = order.indexOf(current)
  if (index < 0) return order[0]
  return order[(index + 1) % order.length]
}

/** rule → global → direct → rule */
export async function cycleOutboundMode(): Promise<ApiResult<SurgeMode>> {
  // Read the live mode first: the user may have switched it in Surge since the
  // widget was last rendered, and cycling from a stale value feels random.
  const snapshot = await fetchControl()
  const current = snapshot.ok ? snapshot.value.mode : getCachedControl()?.mode ?? null
  const next = nextInCycle(MODE_ORDER, current)
  return setOutboundMode(next)
}

/** Cycle through the user's quick policies (nodes or policy groups). */
export async function cycleGlobalPolicy(): Promise<ApiResult<string>> {
  const quick = getControlSettings().quickPolicies
  if (!quick.length) {
    return fail("missing_config", "未设置快捷策略", {
      detail: "在 Surge 监控 App 的「小组件快捷策略」中添加节点或策略组",
    })
  }
  const snapshot = await fetchControl()
  const current = snapshot.ok ? snapshot.value.globalPolicy : getCachedControl()?.globalPolicy ?? null
  const next = nextInCycle(quick, current)
  return setGlobalPolicy(next)
}
