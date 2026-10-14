import { useEffect, useState } from 'react'
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useApp, useStatus } from '../state/app'
import { Button, Check, InfoNote, Panel, Select } from '../components/ui'

export function Settings() {
  const { activeProfile, mutateActive, notify } = useApp()
  const { status } = useStatus()
  const [autostart, setAutostart] = useState(false)
  const [capturingPanic, setCapturingPanic] = useState(false)

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => undefined)
  }, [])

  if (!activeProfile) return <div className="p-6 text-xs text-zinc-500">Loading…</div>

  const settings = activeProfile.settings

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Settings</h2>

      <div className="mt-4 grid max-w-3xl grid-cols-2 gap-4">
        <Panel title="Layer key" hint="Hold to reach Layer 1 bindings.">
          <Select
            value={activeProfile.layer_key}
            onChange={(v) =>
              void mutateActive((profile) => ({
                ...profile,
                layer_key: v as typeof profile.layer_key,
              }))
            }
            options={[
              { value: 'caps_lock', label: 'CapsLock' },
              { value: 'right_alt', label: 'Right Alt' },
              { value: 'scroll_lock', label: 'Scroll Lock' },
              { value: 'none', label: 'None' },
            ]}
          />
        </Panel>

        <Panel title="Panic combo" hint="Disables remapping instantly from the keyboard.">
          <div className="flex items-center gap-2">
            <span className="mono flex-1 border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300">
              {formatTrigger(settings.panic_combo)}
            </span>
            <Button variant={capturingPanic ? 'primary' : 'default'} onClick={() => setCapturingPanic(true)}>
              {capturingPanic ? 'Press…' : 'Change'}
            </Button>
          </div>
          {capturingPanic && (
            <input
              autoFocus
              className="h-0 w-0 border-0 p-0 opacity-0"
              onKeyDown={(e) => {
                e.preventDefault()
                // Bare Esc cancels; Esc with modifiers is a valid combo (the default
                // panic is Ctrl+Alt+Esc, which must be re-bindable).
                if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                  setCapturingPanic(false)
                  return
                }
                const vk = keyToVk(e)
                if (vk === null) return
                let mods = 0
                if (e.ctrlKey) mods |= 0x01
                if (e.shiftKey) mods |= 0x02
                if (e.altKey) mods |= 0x04
                if (e.metaKey) mods |= 0x08
                void mutateActive((profile) => ({
                  ...profile,
                  settings: {
                    ...profile.settings,
                    panic_combo: mods === 0 ? { kind: 'vk', vk } : { kind: 'combo', mods, vk },
                  },
                }))
                setCapturingPanic(false)
              }}
              onBlur={() => setCapturingPanic(false)}
            />
          )}
          <div className="mt-2">
            <InfoNote>Requires remapping to be ON to have any effect.</InfoNote>
          </div>
        </Panel>

        <Panel title="Macro behaviour">
          <Check
            checked={settings.stop_macro_on_keypress}
            onChange={(checked) =>
              void mutateActive((profile) => ({
                ...profile,
                settings: { ...profile.settings, stop_macro_on_keypress: checked },
              }))
            }
            label="Stop a playing macro when any key is pressed"
          />
        </Panel>

        <Panel title="Startup">
          <div className="space-y-3">
            <Check
              checked={autostart}
              onChange={async (checked) => {
                try {
                  if (checked) await enable()
                  else await disable()
                  setAutostart(checked)
                  notify(checked ? 'Autostart enabled' : 'Autostart disabled')
                } catch (err) {
                  notify(`Autostart failed: ${err instanceof Error ? err.message : String(err)}`)
                }
              }}
              label="Start at login"
            />
            <Check
              checked={settings.start_minimized}
              onChange={(checked) =>
                void mutateActive((profile) => ({
                  ...profile,
                  settings: { ...profile.settings, start_minimized: checked },
                }))
              }
              label="Start minimized to tray"
            />
          </div>
        </Panel>

        <Panel title="Limits" className="col-span-2">
          <ul className="space-y-2 text-[11px] text-zinc-400">
            <li>
              Privilege: {status?.elevated ? 'administrator — full coverage' : 'standard user — no remapping inside administrator windows'}.
            </li>
            <li>Games with anti-cheat may ignore injected input (no kernel driver is used).</li>
            <li>The Fn key is handled by the keyboard firmware and never reaches Windows.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function formatTrigger(trigger: { kind: string; mods?: number; vk: number }): string {
  const parts: string[] = []
  const mods = trigger.mods ?? 0
  if (mods & 0x01) parts.push('Ctrl')
  if (mods & 0x02) parts.push('Shift')
  if (mods & 0x04) parts.push('Alt')
  if (mods & 0x08) parts.push('Win')
  parts.push(vkName(trigger.vk))
  return parts.join(' + ')
}

function vkName(vk: number): string {
  if (vk === 0x1b) return 'Esc'
  if (vk >= 0x41 && vk <= 0x5a) return String.fromCharCode(vk)
  if (vk >= 0x70 && vk <= 0x87) return `F${vk - 0x6f}`
  return `VK ${vk.toString(16).toUpperCase()}`
}

function keyToVk(event: React.KeyboardEvent): number | null {
  const key = event.key
  if (key.length === 1) {
    const upper = key.toUpperCase()
    if (upper >= 'A' && upper <= 'Z') return upper.charCodeAt(0)
    if (key >= '0' && key <= '9') return key.charCodeAt(0)
  }
  const byName: Record<string, number> = {
    Escape: 0x1b,
    Enter: 0x0d,
    Tab: 0x09,
    Backspace: 0x08,
    ' ': 0x20,
    Insert: 0x2d,
    Delete: 0x2e,
    Home: 0x24,
    End: 0x23,
  }
  if (key in byName) return byName[key]
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) return 0x6f + Number(key.slice(1))
  return null
}
