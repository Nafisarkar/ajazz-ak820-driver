import { useMemo, useState } from 'react'
import { useApp } from '../state/app'
import {
  MOD_ALT,
  MOD_CTRL,
  MOD_SHIFT,
  MOD_WIN,
  modifierLabel,
  type Action,
  type Trigger,
} from '../state/api'
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

/** A binding slot is identified by the key plus its exact modifier set. */
function slot(vk: number, mods: number): string {
  return `${vk}|${mods}`
}

function bindingMods(trigger: Trigger): number {
  return trigger.kind === 'combo' ? trigger.mods : 0
}

export function Keymap() {
  const { activeProfile, catalog, mutateActive } = useApp()
  const [layer, setLayer] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [slotMods, setSlotMods] = useState(0)

  const nameOf = useMemo(() => {
    const table = new Map((catalog?.keyNames ?? []).map((e) => [e.value, e.label]))
    return (vk: number) => table.get(vk) ?? `VK_${vk.toString(16)}`
  }, [catalog])

  if (!activeProfile || !catalog) return <div className="p-6 text-xs text-zinc-500">Loading…</div>

  const layerBindings = activeProfile.bindings.filter((b) => b.layer === layer)
  const bySlot = new Map(
    layerBindings.map((b) => [slot(b.trigger.vk, bindingMods(b.trigger)), b]),
  )

  // One summary per physical key, covering every modifier slot it has.
  const labels = new Map<number, string>()
  for (const binding of layerBindings) {
    const text = describeAction(binding.action, nameOf, activeProfile.macros)
    const mods = bindingMods(binding.trigger)
    const piece = mods === 0 ? text : `${modifierLabel(mods)}+${text}`
    const existing = labels.get(binding.trigger.vk)
    labels.set(binding.trigger.vk, existing ? `${existing} · ${piece}` : piece)
  }

  const selectedBindings = selected === null
    ? []
    : layerBindings.filter((b) => b.trigger.vk === selected)
  const current = selected === null ? undefined : bySlot.get(slot(selected, slotMods))
  const selectedName =
    selected !== null
      ? (KEYS.map((k) => ({ vk: hidToVk(k.hid), name: k.name })).find((k) => k.vk === selected)
          ?.name ?? nameOf(selected))
      : null

  const writeBinding = (action: Action | null) => {
    if (selected === null) return
    const trigger: Trigger =
      slotMods === 0 ? { kind: 'vk', vk: selected } : { kind: 'combo', mods: slotMods, vk: selected }
    void mutateActive((profile) => {
      const others = profile.bindings.filter(
        (b) => !(b.layer === layer && slot(b.trigger.vk, bindingMods(b.trigger)) === slot(selected, slotMods)),
      )
      if (action === null) return { ...profile, bindings: others }
      return { ...profile, bindings: [...others, { layer, trigger, action, enabled: true }] }
    })
  }

  const clearLayer = () => {
    void mutateActive((profile) => ({
      ...profile,
      bindings: profile.bindings.filter((b) => b.layer !== layer),
    }))
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Keymap</h2>
          <div className="flex">
            {LAYERS.map((l) => (
              <button
                key={l.value}
                onClick={() => {
                  setLayer(l.value)
                  setSelected(null)
                  setSlotMods(0)
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
            {layerBindings.length} binding(s) here
          </span>
          {layerBindings.length > 0 && (
            <Button variant="ghost" onClick={clearLayer}>
              Clear layer
            </Button>
          )}
        </div>

        <div className="mt-4 border border-zinc-800 bg-zinc-900 p-3">
          <KeyboardSvg
            bindings={labels}
            selected={selected}
            onSelect={(vk) => setSelected(vk)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <Legend fill="#27272a" stroke="#3f3f46" label="unbound" />
            <Legend fill="#1e3a5f" stroke="#0ea5e9" label="bound" />
            <Legend fill="#0ea5e9" stroke="#38bdf8" label="selected" />
          </div>
          <span className="text-[10px] text-zinc-600">
            a key can hold a plain binding and any number of modifier combos
          </span>
        </div>
      </div>

      <aside className="w-80 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900">
        {selected === null ? (
          <p className="p-4 text-xs text-zinc-500">Select a key on the board to edit its bindings.</p>
        ) : (
          <div className="space-y-4 p-4">
            <div className="border-b border-zinc-800 pb-3">
              <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Key</div>
              <div className="mt-0.5 text-lg font-semibold">{selectedName}</div>
              <div className="mono text-[10px] text-zinc-600">
                vk {selected.toString(16).toUpperCase()} · layer {layer}
              </div>
            </div>

            {selectedBindings.length > 0 && (
              <Panel title="Bindings on this key">
                <div className="space-y-1">
                  {selectedBindings.map((b) => {
                    const mods = bindingMods(b.trigger)
                    const active = mods === slotMods
                    return (
                      <button
                        key={slot(b.trigger.vk, mods)}
                        onClick={() => setSlotMods(mods)}
                        className={`flex w-full items-center justify-between border px-2 py-1.5 text-left text-[11px] ${
                          active
                            ? 'border-sky-500 bg-sky-600/20 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <span className="mono">
                          {mods === 0 ? 'no modifiers' : modifierLabel(mods)}
                        </span>
                        <span className="text-zinc-500">
                          {describeAction(b.action, nameOf, activeProfile.macros)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Panel>
            )}

            <Panel title="Editing slot" hint="Which modifier combination you are editing.">
              <div className="flex gap-1">
                <SlotToggle mods={slotMods} setMods={setSlotMods} bit={0} label="None" />
                <SlotToggle mods={slotMods} setMods={setSlotMods} bit={MOD_CTRL} label="Ctrl" />
                <SlotToggle mods={slotMods} setMods={setSlotMods} bit={MOD_SHIFT} label="Shift" />
                <SlotToggle mods={slotMods} setMods={setSlotMods} bit={MOD_ALT} label="Alt" />
                <SlotToggle mods={slotMods} setMods={setSlotMods} bit={MOD_WIN} label="Win" />
              </div>
              <div className="mt-2 space-y-1">
                <InfoNote>
                  “None” fires when the key is pressed alone; a modifier slot fires only with
                  exactly that combination (Ctrl+J is separate from J).
                </InfoNote>
                {current && (
                  <InfoNote>
                    This slot currently sends{' '}
                    <span className="mono text-zinc-300">
                      {describeAction(current.action, nameOf, activeProfile.macros)}
                    </span>
                    .
                  </InfoNote>
                )}
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

function Legend({ fill, stroke, label }: { fill: string; stroke: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="12" height="12" aria-hidden="true">
        <rect x="1" y="1" width="10" height="10" fill={fill} stroke={stroke} />
      </svg>
      {label}
    </span>
  )
}

function SlotToggle({
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
  const active = bit === 0 ? mods === 0 : (mods & bit) !== 0
  return (
    <Button
      variant={active ? 'primary' : 'default'}
      onClick={() => {
        if (bit === 0) setMods(0)
        else setMods(mods ^ bit)
      }}
    >
      {label}
    </Button>
  )
}
