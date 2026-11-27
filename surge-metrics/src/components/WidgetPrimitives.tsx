import { Button, HStack, Image, Script, Spacer, Text, VStack } from "scripting"
import type { Color, DynamicShapeStyle, ShapeStyle } from "scripting"
import { CycleGlobalPolicyIntent, CycleSurgeModeIntent, RefreshSurgeMetricsIntent } from "../app_intents"
import { formatFetchedAt } from "../services/format"
import { MODE_LABEL } from "../services/surge-api"
import type { SurgeMode } from "../services/types"

const dynamic = (light: Color, dark: Color): DynamicShapeStyle => ({ light, dark })

export const C = {
  bg: "systemBackground",
  primary: "label",
  secondary: "secondaryLabel",
  tertiary: "tertiaryLabel",
  accent: dynamic("#0A84FF", "#64D2FF"),
  down: dynamic("#30D158", "#30D158"),
  up: dynamic("#FF9F0A", "#FF9F0A"),
  warn: "systemOrange",
  track: dynamic("#E5E5EA", "#3A3A3C"),
  chip: dynamic("#F2F2F7", "#2C2C2E"),
} as const

const MODE_STYLE: Record<SurgeMode, {
  icon: string
  fg: Color | DynamicShapeStyle
  bg: Color | DynamicShapeStyle
}> = {
  rule: { icon: "arrow.triangle.branch", fg: dynamic("#0A84FF", "#64D2FF"), bg: dynamic("#E9F2FF", "#10243D") },
  proxy: { icon: "globe", fg: dynamic("#1F8A3B", "#30D158"), bg: dynamic("#E6F7EA", "#102A18") },
  direct: { icon: "arrow.right", fg: dynamic("#6C6C70", "#A1A1A6"), bg: dynamic("#EFEFF4", "#2C2C2E") },
}

/** Tappable outbound-mode pill: rule → global → direct → rule. */
export function ModeChip({ mode }: { mode: SurgeMode }) {
  const style = MODE_STYLE[mode] || MODE_STYLE.rule
  return <Button intent={CycleSurgeModeIntent(undefined)} buttonStyle="plain">
    <HStack
      spacing={4}
      alignment="center"
      padding={{ horizontal: 8, vertical: 3 }}
      background={style.bg}
      clipShape="capsule"
    >
      <Image systemName={style.icon} resizable scaleToFit foregroundStyle={style.fg} frame={{ width: 12, height: 12 }}/>
      <Text font={13} fontWeight="bold" foregroundStyle={style.fg} lineLimit={1}>{MODE_LABEL[mode] || mode}</Text>
    </HStack>
  </Button>
}

/** Tappable global-mode policy pill: cycles through the quick policies. */
export function PolicyChip({ policy, maxWidth = 148, interactive = true }: {
  policy: string
  maxWidth?: number
  interactive?: boolean
}) {
  const body = <HStack
    spacing={3}
    alignment="center"
    padding={{ horizontal: 6, vertical: 2 }}
    background={C.chip}
    clipShape="capsule"
    frame={{ maxWidth }}
  >
    {interactive
      ? <Image systemName="arrow.left.arrow.right" resizable scaleToFit foregroundStyle={C.secondary} frame={{ width: 8, height: 8 }}/>
      : <Image systemName="pin.fill" resizable scaleToFit foregroundStyle={C.tertiary} frame={{ width: 8, height: 8 }}/>}
    <Text font={11} fontWeight="semibold" foregroundStyle={C.secondary} lineLimit={1} minScaleFactor={0.7}>{policy}</Text>
  </HStack>

  return interactive
    ? <Button intent={CycleGlobalPolicyIntent(undefined)} buttonStyle="plain">{body}</Button>
    : body
}

function normalizedBuildLabel(value: string): string {
  let raw = String(value || "").trim()
  if (!raw) return "Surge —"

  // Strip the platform prefix from new and cached snapshots.
  raw = raw.replace(/^(?:iOS|macOS|Mac)\s*•\s*/i, "")
  if (/^Surge\s+/i.test(raw)) {
    return raw.replace(/^surge/i, "Surge")
  }

  // Backward compatibility with cached snapshots such as:
  // "5.102.0 · 3813" or "Version 5.102.0 · 3813".
  const legacy = raw.match(/^(?:Version\s+)?([^·•]+?)(?:\s*[·•]\s*(?:Build\s+)?(.+))?$/i)
  if (legacy) {
    const version = legacy[1].trim()
    const build = legacy[2]?.trim()
    return build
      ? `Surge ${version} • Build ${build}`
      : `Surge ${version}`
  }
  return `Surge ${raw}`
}

export function Header({ fetchedAt, cached, inset = 0, titleFont = 11, mode = null }: {
  fetchedAt: string
  cached: boolean
  inset?: number
  titleFont?: number
  mode?: SurgeMode | null
}) {
  const updated = `${cached ? "缓存" : "更新"} ${formatFetchedAt(fetchedAt)}`
  return <HStack alignment="center" frame={{ maxWidth: "infinity" }} padding={{ horizontal: inset }}>
    <HStack spacing={5} alignment="center">
      <Image filePath={`${Script.directory}/assets/surge-metrics-icon.png`} resizable scaleToFit frame={{ width: 15, height: 15 }}/>
      <Text font={titleFont} fontWeight="bold" foregroundStyle={C.accent}>Surge</Text>
      {mode ? <ModeChip mode={mode}/> : null}
    </HStack>
    <Spacer/>
    <HStack spacing={7} alignment="center">
      <Text font={10} fontWeight="medium" foregroundStyle={C.tertiary} lineLimit={1}>{updated}</Text>
      <Button intent={RefreshSurgeMetricsIntent(undefined)} buttonStyle="plain">
        <Image systemName="arrow.clockwise" foregroundStyle={C.accent} frame={{ width: 13, height: 13 }}/>
      </Button>
    </HStack>
  </HStack>
}

export function VersionLabel({ value, font = 9 }: { value: string; font?: number }) {
  return <Text font={font} fontWeight="medium" foregroundStyle={C.tertiary} lineLimit={1} minScaleFactor={0.7}>{normalizedBuildLabel(value)}</Text>
}

export function RateCard({ icon, label, value, color }: {
  icon: string
  label: string
  value: string
  color: ShapeStyle | DynamicShapeStyle
}) {
  return <VStack spacing={3} alignment="center" padding={{ horizontal: 5, vertical: 5 }} frame={{ maxWidth: "infinity", alignment: "center" }}>
    <HStack spacing={5} alignment="center">
      <Image systemName={icon} resizable scaleToFit foregroundStyle={color} frame={{ width: 11, height: 11 }}/>
      <Text font={10} fontWeight="medium" foregroundStyle={C.secondary} multilineTextAlignment="center">{label}</Text>
    </HStack>
    <Text font={22} fontWeight="bold" fontDesign="rounded" foregroundStyle={C.primary} lineLimit={1} minScaleFactor={0.58} multilineTextAlignment="center">{value}</Text>
  </VStack>
}

export function StatusBlock({ icon, label, value, color }: {
  icon: string
  label: string
  value: string
  color?: ShapeStyle | DynamicShapeStyle
}) {
  return <VStack spacing={3} alignment="center" frame={{ maxWidth: "infinity", alignment: "center" }}>
    <HStack spacing={4} alignment="center">
      <Image systemName={icon} resizable scaleToFit foregroundStyle={color || C.secondary} frame={{ width: 12, height: 12 }}/>
      <Text font={10} fontWeight="medium" foregroundStyle={C.secondary}>{label}</Text>
    </HStack>
    <Text font={13} fontWeight="bold" fontDesign="rounded" foregroundStyle={C.primary} lineLimit={1} minScaleFactor={0.68}>{value}</Text>
  </VStack>
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <VStack spacing={6} alignment="center" frame={{ maxWidth: "infinity", maxHeight: "infinity" }} padding={16}>
    <Image systemName="speedometer" foregroundStyle={C.secondary} frame={{ width: 28, height: 28 }}/>
    <Text font={14} fontWeight="bold" foregroundStyle={C.primary}>{title}</Text>
    {detail ? <Text font={11} foregroundStyle={C.secondary} multilineTextAlignment="center" lineLimit={3}>{detail}</Text> : null}
  </VStack>
}
