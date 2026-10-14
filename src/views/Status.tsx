import { useState } from 'react'
import { useApp, useStatus } from '../state/app'
import { api } from '../state/api'
import { Button, InfoNote, Panel, Stat } from '../components/ui'

export function StatusView() {
  const { error, toast, activeProfile } = useApp()
  const { status, refresh } = useStatus()
  const hook = status?.hook
  const [tracePending, setTracePending] = useState(false)

  const toggleTrace = async () => {
    if (!hook) return
    setTracePending(true)
    try {
      await api.setTrace(!hook.trace)
      await refresh()
    } finally {
      setTracePending(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Diagnostics</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Live counters from the keyboard hook. If <span className="mono">events</span> stays at 0
        while you type, the hook is not receiving input.
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        <Stat
          label="hook"
          value={hook?.alive ? 'installed' : 'down'}
          tone={hook?.alive ? 'ok' : 'bad'}
        />
        <Stat label="events" value={hook?.events ?? 0} />
        <Stat label="remapped" value={hook?.remapped ?? 0} />
        <Stat label="panics" value={hook?.panics ?? 0} tone={hook?.panics ? 'warn' : 'default'} />
        <Stat label="profile" value={activeProfile?.name ?? '—'} />
      </div>

      {hook?.error && (
        <div className="mt-3 border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          Hook error: {hook.error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Panel title="Runtime">
          <dl className="space-y-1.5 text-xs">
            <Row label="remapping" value={status?.enabled ? 'enabled' : 'disabled'} />
            <Row label="privilege" value={status?.elevated ? 'administrator' : 'standard user'} />
            <Row label="recording" value={status?.recording ? 'yes' : 'no'} />
            <Row label="macro playing" value={status?.playing ? 'yes' : 'no'} />
            <Row label="bindings" value={String(status?.bindingCount ?? 0)} />
            <Row label="macros" value={String(status?.macroCount ?? 0)} />
            <Row label="panic combo" value="Ctrl + Alt + Esc" />
          </dl>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Trace logging"
            hint="Writes every remap to the log file. Off by default: the hook never does file I/O while you type."
          >
            <div className="flex items-center gap-3">
              <Button
                variant={hook?.trace ? 'primary' : 'default'}
                onClick={toggleTrace}
                disabled={tracePending}
              >
                Trace: {hook?.trace ? 'ON' : 'OFF'}
              </Button>
              <span className="text-[11px] text-zinc-500">
                Panic fires, enable/disable and lighting changes are always logged.
              </span>
            </div>
          </Panel>

          <Panel title="Notes">
            <div className="space-y-2">
              <InfoNote>
                Panic only acts while remapping is ON — with it off there is nothing to disable.
                Each fire increments <span className="mono">panics</span> above.
              </InfoNote>
              <InfoNote>
                Log: <span className="mono">%APPDATA%\dev.ak820.companion\companion.log</span>
              </InfoNote>
              {!status?.elevated && (
                <InfoNote>
                  Standard user: keys are not remapped inside administrator windows. Relaunch as
                  administrator for full coverage.
                </InfoNote>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {(toast || error) && (
        <div className="mt-4 flex items-center gap-3">
          {toast && <span className="text-xs text-zinc-300">{toast}</span>}
          {error && <span className="text-xs text-red-300">{error}</span>}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-zinc-800 pb-1">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mono text-zinc-300">{value}</dd>
    </div>
  )
}
