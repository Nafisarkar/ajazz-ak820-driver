import { useMemo, useState } from 'react'
import { useApp } from '../state/app'
import { MOD_ALT, MOD_CTRL, MOD_SHIFT, MOD_WIN, type Action, type Trigger } from '../state/api'
import { describeAction } from '../state/describe'
import { KeyboardSvg } from '../components/KeyboardSvg'
import { ActionPicker } from '../components/ActionPicker'
import { Button, InfoNote, Panel } from '../components/ui'
import { hidToVk } from '../data/hidToVk'
import { KEYS } from '../data/layout'

const LAYERS = [
  { value: 0, label: 'BASE' },
  { value: 1, label: 'LAYER 1' },
  { value: 2, label: 'LAYER 2' },
]

export function Keymap() {
  const { activeProfile, catalog, mutateActive } = useApp()
  const [layer, setLayer] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [triggerMods, setTriggerMods] = useState(0)

  const nameOf = useMemo(() => {
    const table = new Map((catalog?.keyNames ?? []).map((e) => [e.value, e.label]))
    return (vk: number) => table.get(vk) ?? `VK_${vk.toString(16)}`
  }, [catalog])

  if (!activeProfile || !catalog) return <div className="p-6 text-xs text-zinc-500">Loading…</div>

  const bindings = activeProfile.bindings.filter((b) => b.layer === layer)
  const byVk = new Map(bindings.map((b) => [b.trigger.vk, b]))
  const labels = new Map(
    bindings.map((b) => [b.trigger.vk, describeAction(b.action, nameOf, activeProfile.macros)]),
  )
  const current = selected !== null ? byVk.get(selected) : undefined
  const selectedName =
    selected !== null
      ? (KEYS.map((k) => ({ vk: hidToVk(k.hid), name: k.name })).find((k) => k.vk === selected)?.name ??
        nameOf(selected))
      : null

  const writeBinding = (action: Action | null) => {
    if (selected === null) return
    const trigger: Trigger =
      triggerMods === 0
        ? { kind: 'vk', vk: selected }
        : { kind: 'combo', mods: triggerMods, vk: selected }
    void mutateActive((profile) => {
      const others = profile.bindings.filter((b) => !(b.layer === layer && b.trigger.vk === selected))
      if (action === null) return { ...profile, bindings: others }
      return { ...profile, bindings: [...others, { layer, trigger, action, enabled: true }] }
    })
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Keymap</h2>
          <div className="flex">
            {LAYERS.map((l) => (
              <button
                key={l.value}
                onClick={() => {
                  setLayer(l.value)
                  setSelected(null)
                }}
                className={`border px-3 py-1 text-[11px] font-medium tracking-widest ${
                  layer === l.value
                    ? 'border-sky-500 bg-sky-600 text-white'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="mono text-[10px] text-zinc-600">
            {bindings.length} binding(s) on this layer
          </span>
        </div>

        <div className="mt-4 border border-zinc-800 bg-zinc-900 p-3">
          <KeyboardSvg
            bindings={labels}
            selected={selected}
            onSelect={(vk) => {
              setSelected(vk)
              const existing = byVk.get(vk)
              setTriggerMods(
                existing && existing.trigger.kind === 'combo' ? existing.trigger.mods : 0,
              )
            }}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <InfoNote>
            Click a key to edit it. Layer 1 is reached by holding the layer key (currently{' '}
            <span className="mono">{activeProfile.layer_key.replace('_', ' ')}</span>) — set per
            profile in Settings. Fn never reaches Windows and cannot be remapped.
          </InfoNote>
        </div>
      </div>

      <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900">
        {selected === null ? (
          <p className="p-4 text-xs text-zinc-500">Select a key on the board to edit its binding.</p>
        ) : (
          <div className="space-y-4 p-4">
            <div className="border-b border-zinc-800 pb-3">
              <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Key
              </div>
              <div className="mt-0.5 text-lg font-semibold">{selectedName}</div>
              <div className="mono text-[10px] text-zinc-600">
                vk {selected.toString(16).toUpperCase()} · layer {layer}
              </div>
            </div>

            <Panel title="Trigger modifiers" hint="None = the key alone.">
              <div className="flex gap-1">
                <ModToggle mods={triggerMods} setMods={setTriggerMods} bit={MOD_CTRL} label="Ctrl" />
                <ModToggle mods={triggerMods} setMods={setTriggerMods} bit={MOD_SHIFT} label="Shift" />
                <ModToggle mods={triggerMods} setMods={setTriggerMods} bit={MOD_ALT} label="Alt" />
                <ModToggle mods={triggerMods} setMods={setTriggerMods} bit={MOD_WIN} label="Win" />
              </div>
            </Panel>

            <Panel title="Action">
              <ActionPicker
                action={current?.action ?? { kind: 'disabled' }}
                macros={activeProfile.macros}
                catalog={catalog}
                nameOf={nameOf}
                onChange={(action) => writeBinding(action)}
                onClear={() => writeBinding(null)}
              />
            </Panel>
          </div>
        )}
      </aside>
    </div>
  )
}

function ModToggle({
  mods,
  setMods,
  bit,
  label,
}: {
  mods: number
  setMods: (mods: number) => void
  bit: number
  label: string
}) {
  const active = (mods & bit) !== 0
  return (
    <Button
      variant={active ? 'primary' : 'default'}
      onClick={() => setMods(active ? mods & ~bit : mods | bit)}
    >
      {label}
    </Button>
  )
}
