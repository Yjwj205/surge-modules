import {
  Button,
  HStack,
  List,
  Navigation,
  NavigationStack,
  Picker,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  Widget,
  useState,
} from "scripting"
import { LargeWidgetView } from "./components/LargeWidgetView"
import { MediumWidgetView } from "./components/MediumWidgetView"
import { formatFetchedAtWithSeconds, maskKey } from "./services/format"
import { fetchMetrics, getCachedMetrics, testConnection } from "./services/metrics"
import {
  clearCache,
  getCachedCatalog,
  getCachedControl,
  getConnection,
  getControlSettings,
  getSettings,
  setConnection,
  setControlSettings,
  setSettings,
} from "./services/settings"
import {
  fetchControl,
  fetchPolicyCatalog,
  MODE_LABEL,
  normalizeMode,
  selectGroupPolicy,
  setGlobalPolicy,
  setOutboundMode,
  isSelectableGroup,
} from "./services/surge-api"
import type {
  ConnectionConfig,
  ControlSettings,
  ControlSnapshot,
  MetricsResult,
  PolicyCatalog,
  PolicyGroupInfo,
  WidgetSettings,
} from "./services/types"

function reloadWidgets() {
  try {
    Widget.reloadAll()
  } catch {
    /* ignore */
  }
}

function modeText(snapshot: ControlSnapshot | null): string {
  if (!snapshot) return "尚未读取"
  if (!snapshot.mode) return "未知"
  return `${MODE_LABEL[snapshot.mode]}模式`
}

export function App() {
  const initialConnection = getConnection()
  const initialSettings = getSettings()
  const [host, setHost] = useState(initialConnection.host)
  const [port, setPort] = useState(String(initialConnection.port))
  const [apiKey, setApiKey] = useState(initialConnection.apiKey)
  const [useTls, setUseTls] = useState(initialConnection.useTls)
  const [reloadMinutes, setReloadMinutes] = useState(String(initialSettings.reloadMinutes))
  const [requestStat, setRequestStat] = useState<WidgetSettings["requestStat"]>(initialSettings.requestStat)
  const [requestOffset, setRequestOffset] = useState(initialSettings.requestOffset)
  const [calibration, setCalibration] = useState("")
  const [status, setStatus] = useState(initialConnection.apiKey.trim() ? "已加载本地配置" : "请填写本机 Surge HTTP API")
  const [preview, setPreview] = useState<MetricsResult | null>(() => {
    const cache = getCachedMetrics()
    return cache ? { ok: true, snapshot: cache } : null
  })
  const [busy, setBusy] = useState(false)
  const [saveTitle, setSaveTitle] = useState("保存")

  const [control, setControl] = useState<ControlSnapshot | null>(() => getCachedControl())
  const [catalog, setCatalog] = useState<PolicyCatalog | null>(() => getCachedCatalog())
  const [controlSettings, setControlSettingsState] = useState<ControlSettings>(() => getControlSettings())
  const [controlBusy, setControlBusy] = useState(false)
  const [controlStatus, setControlStatus] = useState("")

  function markEdited() {
    setSaveTitle("保存")
  }

  function saveConnection(): ConnectionConfig {
    const parsedPort = Number(port)
    return setConnection({
      host: host.trim() || "127.0.0.1",
      port: Number.isFinite(parsedPort) ? parsedPort : 6171,
      apiKey: apiKey.trim(),
      useTls,
    })
  }

  function saveSettings(): WidgetSettings {
    const minutes = Number(reloadMinutes)
    return setSettings({
      reloadMinutes: Number.isFinite(minutes) ? minutes : 5,
      requestStat,
      requestOffset,
    })
  }

  async function onSave() {
    const conn = saveConnection()
    const settings = saveSettings()
    setStatus(`已保存 · ${conn.host}:${conn.port} · 刷新 ${settings.reloadMinutes} 分钟 · Key ${maskKey(conn.apiKey)}`)
    setSaveTitle("已保存")
    reloadWidgets()
    // Fill in the control section right away so the mode / policy pickers show up.
    if (conn.apiKey.trim()) await onSyncControl()
  }

  async function onTest() {
    setBusy(true)
    saveConnection()
    saveSettings()
    setStatus("正在测试连通…")
    try {
      const result = await testConnection()
      setStatus(result.ok ? result.message : `失败：${result.message}${result.detail ? " · " + result.detail : ""}`)
    } catch (error) {
      setStatus("测试异常：" + (error instanceof Error ? error.message : String(error)))
    } finally {
      setBusy(false)
    }
  }

  async function onRefresh() {
    setBusy(true)
    saveConnection()
    saveSettings()
    setStatus("正在拉取 metrics…")
    try {
      const result = await fetchMetrics()
      setPreview(result)
      if (result.ok) {
        setStatus(`已更新 · ${formatFetchedAtWithSeconds(result.snapshot.fetchedAt)} · 接口 ${result.snapshot.interfaces.length}`)
        reloadWidgets()
      } else {
        setStatus(`拉取失败：${result.error.message}${result.error.detail ? " · " + result.error.detail : ""}`)
      }
    } catch (error) {
      setStatus("刷新异常：" + (error instanceof Error ? error.message : String(error)))
    } finally {
      setBusy(false)
    }
  }

  function onClearCache() {
    clearCache()
    setPreview(null)
    setStatus("已清除本地数据缓存")
    reloadWidgets()
  }

  /* ---------------------------------------------------------------- */
  /* Control actions                                                  */
  /* ---------------------------------------------------------------- */

  async function onSyncControl() {
    setControlBusy(true)
    saveConnection()
    setControlStatus("正在读取运行模式与策略列表…")
    try {
      const [controlResult, catalogResult] = await Promise.all([
        fetchControl(),
        fetchPolicyCatalog(),
      ])
      if (controlResult.ok) setControl(controlResult.value)
      if (catalogResult.ok) setCatalog(catalogResult.value)

      if (controlResult.ok) {
        const mode = controlResult.value.mode ? MODE_LABEL[controlResult.value.mode] : "未知"
        setControlStatus(
          `当前：${mode}模式${controlResult.value.globalPolicy ? ` · 全局策略 ${controlResult.value.globalPolicy}` : ""}` +
          (catalogResult.ok ? ` · 节点 ${catalogResult.value.proxies.length} · 策略组 ${catalogResult.value.groups.length}` : ""),
        )
      } else {
        setControlStatus(`读取失败：${controlResult.error.message}${controlResult.error.detail ? " · " + controlResult.error.detail : ""}`)
      }
    } catch (error) {
      setControlStatus("读取异常：" + (error instanceof Error ? error.message : String(error)))
    } finally {
      setControlBusy(false)
    }
  }

  async function onSetMode(value: string) {
    const mode = normalizeMode(value)
    if (!mode) return
    saveConnection()
    setControlBusy(true)
    setControlStatus(`正在切换到${MODE_LABEL[mode]}模式…`)
    try {
      const result = await setOutboundMode(mode)
      if (result.ok) {
        setControl(getCachedControl())
        setControlStatus(`已切换到${MODE_LABEL[result.value]}模式`)
        reloadWidgets()
      } else {
        setControlStatus(`切换失败：${result.error.message}${result.error.detail ? " · " + result.error.detail : ""}`)
      }
    } catch (error) {
      setControlStatus("切换异常：" + (error instanceof Error ? error.message : String(error)))
    } finally {
      setControlBusy(false)
    }
  }

  async function onSetGlobalPolicy(value: string) {
    if (!value.trim()) return
    saveConnection()
    setControlBusy(true)
    setControlStatus(`正在设置全局策略为 ${value}…`)
    try {
      const result = await setGlobalPolicy(value)
      if (result.ok) {
        setControl(getCachedControl())
        setControlStatus(`全局默认策略已设为 ${result.value}`)
        reloadWidgets()
      } else {
        setControlStatus(`设置失败：${result.error.message}${result.error.detail ? " · " + result.error.detail : ""}`)
      }
    } catch (error) {
      setControlStatus("设置异常：" + (error instanceof Error ? error.message : String(error)))
    } finally {
      setControlBusy(false)
    }
  }

  async function onSelectGroup(groupName: string, policy: string) {
    if (!policy.trim()) return
    saveConnection()
    setControlBusy(true)
    setControlStatus(`正在切换「${groupName}」→ ${policy}…`)
    try {
      const result = await selectGroupPolicy(groupName, policy)
      if (result.ok) {
        setCatalog(getCachedCatalog())
        setControlStatus(`「${groupName}」已选择 ${result.value}`)
        reloadWidgets()
      } else {
        setControlStatus(`切换失败：${result.error.message}${result.error.detail ? " · " + result.error.detail : ""}`)
      }
    } catch (error) {
      setControlStatus("切换异常：" + (error instanceof Error ? error.message : String(error)))
    } finally {
      setControlBusy(false)
    }
  }

  function onCalibrate() {
    const raw = preview ? (preview.ok ? preview.snapshot.requestTotal : preview.cache?.requestTotal) : null
    const target = Number(calibration)
    if (raw == null) {
      setStatus("请先点「立即刷新并预览」拿到原始请求 ID")
      return
    }
    if (!Number.isFinite(target) || target <= 0) {
      setStatus("请填写 Surge 仪表盘当前显示的请求数")
      return
    }
    const offset = Math.max(0, Math.round(raw) - Math.round(target))
    const next = setSettings({
      reloadMinutes: Number(reloadMinutes) || 5,
      requestStat,
      requestOffset: offset,
    })
    setRequestOffset(next.requestOffset)
    setStatus(`已校准：原始 ${Math.round(raw)} − 偏移 ${next.requestOffset} = ${Math.max(0, Math.round(raw) - next.requestOffset)}`)
    reloadWidgets()
  }

  function onToggleControls(value: boolean) {
    const next = setControlSettings({ showControls: value })
    setControlSettingsState(next)
    reloadWidgets()
  }

  function onAddQuick(policy: string) {
    if (!policy.trim()) return
    const next = setControlSettings({ quickPolicies: [...controlSettings.quickPolicies, policy] })
    setControlSettingsState(next)
  }

  function onRemoveQuick(policy: string) {
    const next = setControlSettings({ quickPolicies: controlSettings.quickPolicies.filter(item => item !== policy) })
    setControlSettingsState(next)
  }

  /* ---------------------------------------------------------------- */
  /* Derived lists                                                    */
  /* ---------------------------------------------------------------- */

  const policyOptions: string[] = (() => {
    const names: string[] = []
    const seen = new Set<string>()
    const push = (value: string | null | undefined) => {
      const name = String(value || "").trim()
      if (!name || seen.has(name)) return
      seen.add(name)
      names.push(name)
    }
    push(control?.globalPolicy)
    catalog?.groups.forEach(push)
    catalog?.proxies.forEach(push)
    return names
  })()

  const quickAddOptions = policyOptions.filter(name => !controlSettings.quickPolicies.includes(name))
  const hasGroups = Boolean(catalog && catalog.policyGroups.length)

  function groupOptions(group: PolicyGroupInfo): string[] {
    const list = [...group.options]
    if (group.selected && !list.includes(group.selected)) list.unshift(group.selected)
    return list
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="Surge 监控"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarTrailing: <Button title={saveTitle} action={onSave} />,
        }}
      >
        <Section
          header={<Text>连接</Text>}
          footer={
            <Text>
              本机 Surge iOS 在配置中开启 HTTP API，例如 http-api = your-key@127.0.0.1:6171。小组件通过 /v1/metrics?x-key=… 拉取；模式与策略控制使用 /v1/outbound、/v1/outbound/global 与 /v1/policy_groups。
            </Text>
          }
        >
          <TextField title="Host" value={host} onChanged={(value) => { setHost(value); markEdited() }} prompt="127.0.0.1" />
          <TextField title="Port" value={port} onChanged={(value) => { setPort(value); markEdited() }} prompt="6171" />
          <TextField title="API Key" value={apiKey} onChanged={(value) => { setApiKey(value); markEdited() }} prompt="与 http-api 中的 key 一致" />
          <Toggle title="使用 HTTPS (http-api-tls)" value={useTls} onChanged={(value) => { setUseTls(value); markEdited() }} />
        </Section>

        <Section header={<Text>小组件</Text>} footer={<Text>流量直接读取 Surge 原生累计 counter，引擎重启后归零。Medium 显示引擎核心总览；Large 额外展示累计流量最高的 3 个网络接口。Surge 没有官方的累计请求指标，「请求总数」取 /v1/requests/recent 中最大的请求 ID 作为估算，引擎重启后归零。</Text>}>
          <Picker
            title="请求刷新间隔"
            value={reloadMinutes}
            onChanged={(value: string) => { setReloadMinutes(String(value)); markEdited() }}
            pickerStyle="navigationLink"
          >
            <Text tag="5">5 分钟</Text>
            <Text tag="10">10 分钟</Text>
            <Text tag="15">15 分钟</Text>
            <Text tag="30">30 分钟</Text>
            <Text tag="60">60 分钟</Text>
          </Picker>

          <Picker
            title="请求统计"
            value={requestStat}
            onChanged={(value: string) => {
              setRequestStat(value === "active" ? "active" : "total")
              markEdited()
            }}
            pickerStyle="navigationLink"
          >
            <Text tag="total">请求总数（累计）</Text>
            <Text tag="active">活跃请求（进行中）</Text>
          </Picker>
        </Section>

        <Section
          header={<Text>请求数校准</Text>}
          footer={<Text>「请求总数」是 Surge 请求 ID 的估算值，和仪表盘可能差一个固定数（例如引擎重启前的 ID）。把 Surge 仪表盘当前显示的请求数填进来点校准，小组件会一直减去这个差值。当前偏移：{requestOffset}</Text>}
        >
          <HStack>
            <Text>原始请求 ID</Text>
            <Spacer/>
            <Text foregroundStyle="secondaryLabel">
              {preview ? String((preview.ok ? preview.snapshot.requestTotal : preview.cache?.requestTotal) ?? "—") : "—"}
            </Text>
          </HStack>
          <TextField title="Surge 显示" value={calibration} onChanged={setCalibration} prompt="例如 2623" />
          <Button title="校准" action={onCalibrate} />
        </Section>

        <Section
          header={<Text>运行模式</Text>}
          footer={
            <Text>
              {"直连=不走代理；规则=按规则分流；全局=所有请求走「全局默认策略」。这里的改动会立即写入 Surge（需要 HTTP API 可写），小组件上的胶囊只是同一组开关的快捷方式。" + (controlStatus ? "\n\n" + controlStatus : "")}
            </Text>
          }
        >
          <HStack>
            <Text>当前状态</Text>
            <Spacer/>
            <Text foregroundStyle="secondaryLabel" lineLimit={1}>
              {modeText(control)}{control?.globalPolicy ? ` · ${control.globalPolicy}` : ""}
            </Text>
          </HStack>

          {control?.mode ? (
            <Picker
              title="切换模式"
              value={control.mode}
              onChanged={(value: string) => onSetMode(String(value))}
              pickerStyle="navigationLink"
            >
              <Text tag="rule">规则模式</Text>
              <Text tag="proxy">全局模式</Text>
              <Text tag="direct">直连模式</Text>
            </Picker>
          ) : null}

          {policyOptions.length ? (
            <Picker
              title="全局默认策略"
              value={control?.globalPolicy ?? ""}
              onChanged={(value: string) => onSetGlobalPolicy(String(value))}
              pickerStyle="navigationLink"
            >
              {control?.globalPolicy ? null : <Text tag="">未读取</Text>}
              {policyOptions.map(name => <Text key={name} tag={name}>{name}</Text>)}
            </Picker>
          ) : null}

          <Toggle title="小组件显示模式切换" value={controlSettings.showControls} onChanged={onToggleControls} />

          <Button
            title={controlBusy ? "请稍候…" : "同步模式与策略列表"}
            action={() => {
              if (!controlBusy) onSyncControl()
            }}
          />
        </Section>

        <Section
          header={<Text>小组件快捷策略</Text>}
          footer={
            <Text>
              全局模式下，点小组件底部「↔ 策略名」胶囊会在下面这些策略之间轮换（最多 6 个）。可以填节点名，也可以填策略组名——放宽到策略组时，由该组自己决定最终出口。
            </Text>
          }
        >
          {controlSettings.quickPolicies.length
            ? controlSettings.quickPolicies.map(name => (
              <HStack key={name}>
                <Text lineLimit={1}>{name}</Text>
                <Spacer/>
                <Button title="移除" role="destructive" action={() => onRemoveQuick(name)} />
              </HStack>
            ))
            : <Text foregroundStyle="secondaryLabel">尚未添加，先同步一次策略列表</Text>}

          {quickAddOptions.length ? (
            <Picker
              title="添加策略"
              value=""
              onChanged={(value: string) => onAddQuick(String(value))}
              pickerStyle="navigationLink"
            >
              <Text tag="">选择…</Text>
              {quickAddOptions.map(name => <Text key={name} tag={name}>{name}</Text>)}
            </Picker>
          ) : null}
        </Section>

        {hasGroups ? (
          <Section
            header={<Text>策略组</Text>}
            footer={<Text>手动选择组（select）可直接切换；自动测试组、负载均衡组等只显示当前出口。全局模式下把「全局默认策略」设为某个组，也会使用这里的组内选择。</Text>}
          >
            {catalog!.policyGroups.map(group => isSelectableGroup(group) ? (
              <Picker
                key={group.name}
                title={group.name}
                value={group.selected ?? ""}
                onChanged={(value: string) => onSelectGroup(group.name, String(value))}
                pickerStyle="navigationLink"
              >
                {group.selected ? null : <Text tag="">未读取</Text>}
                {groupOptions(group).map(name => <Text key={name} tag={name}>{name}</Text>)}
              </Picker>
            ) : (
              <HStack key={group.name}>
                <VStack>
                  <Text>{group.name}</Text>
                  <Text font="footnote" foregroundStyle="secondaryLabel">{group.type || "group"}</Text>
                </VStack>
                <Spacer/>
                <Text font="footnote" foregroundStyle="secondaryLabel" lineLimit={1}>{group.selected ?? "—"}</Text>
              </HStack>
            ))}
            <Button
              title={controlBusy ? "请稍候…" : "重新读取策略组"}
              action={() => {
                if (!controlBusy) onSyncControl()
              }}
            />
          </Section>
        ) : null}

        <Section header={<Text>刷新状态</Text>} footer={<Text>这里设置的是 WidgetKit 最早请求刷新时间，不是严格定时器；iOS 可能根据电量、使用频率和系统预算延后执行。</Text>}>
          <Text>上次数据刷新：{preview ? formatFetchedAtWithSeconds(preview.ok ? preview.snapshot.fetchedAt : preview.cache?.fetchedAt) : "尚未刷新"}</Text>
          <Text>最早请求刷新：每 {reloadMinutes} 分钟</Text>
        </Section>

        <Section header={<Text>操作</Text>} footer={<Text>{status}</Text>}>
          <Button
            title={busy ? "请稍候…" : "测试连通"}
            action={() => {
              if (!busy) onTest()
            }}
          />
          <Button
            title={busy ? "请稍候…" : "立即刷新并预览"}
            action={() => {
              if (!busy) onRefresh()
            }}
          />
          <Button title="清除缓存" role="destructive" action={onClearCache} />
        </Section>

        <Section header={<Text>Medium 预览</Text>}>
          <MediumWidgetView
            result={
              preview || {
                ok: false,
                error: { code: "missing_config", message: "点击上方刷新以加载预览" },
              }
            }
          />
        </Section>

        <Section header={<Text>Large 预览</Text>}>
          <LargeWidgetView
            result={
              preview || {
                ok: false,
                error: { code: "missing_config", message: "点击上方刷新以加载预览" },
              }
            }
          />
        </Section>

        <Section header={<Text>本机 Surge 配置示例</Text>}>
          <Text font="footnote" foregroundStyle="secondaryLabel">
            {[
              "[General]",
              "http-api = YOUR_SECRET_KEY@127.0.0.1:6171",
              "",
              "# 可选：HTTPS",
              "# http-api-tls = true",
              "",
              "# 版本要求：iOS 5.22.0+",
              "# 保存配置后确保 Surge 已启动（VPN 开关打开）",
            ].join("\n")}
          </Text>
        </Section>
      </List>
    </NavigationStack>
  )
}

async function main() {
  await Navigation.present(<App />)
  Script.exit()
}

main()
