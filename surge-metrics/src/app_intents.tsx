import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { fetchMetrics } from "./services/metrics"
import { getControlSettings } from "./services/settings"
import { cycleGlobalPolicy, cycleOutboundMode, fetchControl } from "./services/surge-api"

function reloadWidgets() {
  try {
    Widget.reloadUserWidgets()
  } catch {
    try { Widget.reloadAll() } catch { /* ignore */ }
  }
}

export const RefreshSurgeMetricsIntent = AppIntentManager.register({
  name: "RefreshSurgeMetricsIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    try {
      // Pull the native counters immediately and update the local snapshot cache.
      await fetchMetrics()
      // Keep the mode / global-policy pills in sync as well.
      if (getControlSettings().showControls) await fetchControl()
    } catch {
      // Still request a timeline reload so the widget can surface cache/error state.
    }
    reloadWidgets()
  },
})

/** Tap the mode pill: rule → global → direct → rule. */
export const CycleSurgeModeIntent = AppIntentManager.register({
  name: "CycleSurgeModeIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    try {
      await cycleOutboundMode()
    } catch {
      /* ignore, the widget still reloads to show the cached state */
    }
    reloadWidgets()
  },
})

/** Tap the global-policy pill: next quick policy (node or policy group). */
export const CycleGlobalPolicyIntent = AppIntentManager.register({
  name: "CycleGlobalPolicyIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    try {
      await cycleGlobalPolicy()
    } catch {
      /* ignore */
    }
    reloadWidgets()
  },
})
