
/** Surge outbound mode. `proxy` is what the Surge UI calls 全局模式. */
export type SurgeMode = "direct" | "proxy" | "rule"

/** Cached outbound state, refreshed with every widget load. */
export type ControlSnapshot = {
  mode: SurgeMode | null
  globalPolicy: string | null
  updatedAt: string
}

export type PolicyGroupInfo = {
  name: string
  /** select / url-test / fallback / load-balance / smart / subnet / external */
  type: string
  options: string[]
  selected: string | null
}

export type PolicyCatalog = {
  proxies: string[]
  groups: string[]
  policyGroups: PolicyGroupInfo[]
  fetchedAt: string
}

export type ControlSettings = {
  /** show the tappable mode chip on the widget */
  showControls: boolean
  /** policies the widget cycles through when the mode chip is in global mode */
  quickPolicies: string[]
}

export type ApiErrorCode =
  | "missing_config"
  | "http_error"
  | "network_error"
  | "invalid_response"
  | "unknown"

export type ApiError = {
  code: ApiErrorCode
  message: string
  detail?: string
  status?: number
}

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError }
