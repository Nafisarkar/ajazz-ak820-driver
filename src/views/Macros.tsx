import { useMemo, useState } from 'react'
import { useApp } from '../state/app'
import { api, type Action, type Macro, type MacroEvent, type MacroPlay } from '../state/api'
import { KEYS } from '../data/layout'
import { hidToVk } from '../data/hidToVk'
import { Button, Field, InfoNote, Panel, Select, TextInput } from '../components/ui'

const LAYERS = [
  { value: 0, label: 'Base layer' },
  { value: 1, label: 'Layer 1' },
  { value: 2, label: 'Layer 2' },
]

export function Macros() {
  const { activeProfile, catalog, mutateActive, notify } = useApp()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [recording, setRecording] = useState(false)
  const [delayMs, setDelayMs] = useState(50)
  const [bindKey, setBindKey] = useState<number>(0x3a)
  const [bindLayer, setBindLayer] = useState(0)
  const [bindPlay, setBindPlay] = useState<MacroPlay['kind']>('once')

  const keyOptions = useMemo(() => {
    const seen = new Set<number>()
    const options: { value: number; label: string }[] = []
    for (const key of KEYS) {
      const vk = hidToVk(key.hid)
      if (vk === null || key.name === 'Fn' || seen.has(vk)) continue
      seen.add(vk)
      options.push({ value: vk, label: `${key.name}  (vk ${vk.toString(16).toUpperCase()})` })
    }
    return options
  }, [])

  if (!activeProfile || !catalog) return <div className="p-6 text-xs text-zinc-500">Loading…</div>

  const nameOf = (vk: number) =>
    catalog.keyNames.find((e) => e.value === vk)?.label ?? `VK_${vk.toString(16)}`
  const macro = activeProfile.macros.find((m) => m.id === selectedId) ?? activeProfile.macros[0] ?? null

  const updateMacro = (next: Macro) => {
    void mutateActive((profile) => ({
      ...profile,
      macros: profile.macros.map((m) => (m.id === next.id ? next : m)),
    }))
  }

  const addMacro = () => {
    const id = Math.max(0, ...activeProfile.macros.map((m) => m.id)) + 1
    const created: Macro = { id, name: `Macro ${id}`, events: [] }
    void mutateActive((profile) => ({ ...profile, macros: [...profile.macros, created] }))
    setSelectedId(id)
  }

  const deleteMacro = (id: number) => {
    void mutateActive((profile) => ({
      ...profile,
      macros: profile.macros.filter((m) => m.id !== id),
      bindings: profile.bindings.filter(
        (b) => !(b.action.kind === 'macro' && b.action.id === id),
      ),
    }))
    setSelectedId(null)
  }

  const bindTrigger = () => {
    if (!macro) return
    const action: Action = {
      kind: 'macro',
      id: macro.id,
      play: bindPlay === 'repeat' ? { kind: 'repeat', times: 3 } : bindPlay === 'once' ? { kind: 'once' } : { kind: 'while_held' },
    }
    void mutateActive((profile) => ({
      ...profile,
      bindings: [
        ...profile.bindings.filter((b) => !(b.layer === bindLayer && b.trigger.vk === bindKey)),
        { layer: bindLayer, trigger: { kind: 'vk', vk: bindKey }, action, enabled: true },
      ],
    }))
    notify(`Bound "${macro.name}" to ${nameOf(bindKey)}`)
  }

  const macroBindings = macro
    ? activeProfile.bindings.filter((b) => b.action.kind === 'macro' && b.action.id === macro.id)
    : []

  const toggleRecording = async () => {
    if (!macro) return
    if (!recording) {
      await api.startRecording()
      setRecording(true)
      notify('Recording — keys are swallowed while recording. Click Stop when done.')
    } else {
      const events = await api.stopRecording()
      setRecording(false)
      updateMacro({ ...macro, events: [...macro.events, ...events] })
      notify(`Recorded ${events.length} event(s)`)
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Macros
          </span>
          <Button onClick={addMacro}>New</Button>
        </div>
        {activeProfile.macros.length === 0 && (
          <p className="p-3 text-[11px] text-zinc-500">No macros yet.</p>
        )}
        {activeProfile.macros.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className={`block w-full border-b border-zinc-800 px-3 py-2 text-left text-xs ${
              macro?.id === m.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
            }`}
          >
            {m.name}
            <span className="mono ml-2 text-[10px] text-zinc-600">{m.events.length} ev</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!macro ? (
          <p className="text-xs text-zinc-500">Create a macro to get started.</p>
        ) : (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TextInput value={macro.name} onChange={(name) => updateMacro({ ...macro, name })} />
              </div>
              <Button variant="primary" onClick={toggleRecording}>
                {recording ? 'Stop recording' : 'Record'}
              </Button>
              <Button onClick={() => api.playMacro(macro.id)}>Play</Button>
              <Button variant="danger" onClick={() => deleteMacro(macro.id)}>
                Delete
              </Button>
            </div>

            <Panel title="Trigger key" hint="Which key runs this macro, and how it plays.">
              <div className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2">
                <Field label="Key">
                  <Select
                    value={bindKey}
                    onChange={(v) => setBindKey(Number(v))}
                    options={keyOptions}
                  />
                </Field>
                <Field label="Layer">
                  <Select
                    value={bindLayer}
                    onChange={(v) => setBindLayer(Number(v))}
                    options={LAYERS}
                  />
                </Field>
                <Field label="Play">
                  <Select
                    value={bindPlay}
                    onChange={(v) => setBindPlay(v as MacroPlay['kind'])}
                    options={[
                      { value: 'once', label: 'Once' },
                      { value: 'repeat', label: 'Repeat x3' },
                      { value: 'while_held', label: 'While held' },
                    ]}
                  />
                </Field>
                <Button variant="primary" onClick={bindTrigger}>
                  Bind
                </Button>
              </div>

              <div className="mt-3 space-y-1">
                {macroBindings.length === 0 ? (
                  <div className="text-[11px] text-zinc-500">
                    Not bound to any key yet — pick one above and press Bind.
                  </div>
                ) : (
                  macroBindings.map((b) => (
                    <div
                      key={`${b.layer}-${b.trigger.vk}`}
                      className="flex items-center justify-between border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs"
                    >
                      <span className="mono text-zinc-300">
                        {b.layer === 0 ? 'Base' : `Layer ${b.layer}`} · {nameOf(b.trigger.vk)}
                      </span>
                      <button
                        onClick={() =>
                          void mutateActive((profile) => ({
                            ...profile,
                            bindings: profile.bindings.filter((x) => x !== b),
                          }))
                        }
                        className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-red-300"
                      >
                        unbind
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Sequence" hint="Playback order, with delays in milliseconds.">
              <div className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
                <span>Add delay</span>
                <input
                  type="number"
                  min={1}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Math.max(1, Number(e.target.value)))}
                  className="mono w-20 border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                />
                <span>ms</span>
                <Button
                  onClick={() =>
                    updateMacro({ ...macro, events: [...macro.events, { kind: 'delay', ms: delayMs }] })
                  }
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => updateMacro({ ...macro, events: [] })}
                  disabled={macro.events.length === 0}
                >
                  Clear
                </Button>
              </div>

              <ol className="border border-zinc-800">
                {macro.events.length === 0 && (
                  <li className="px-3 py-2 text-xs text-zinc-500">Empty — record or add a delay.</li>
                )}
                {macro.events.map((event, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 border-b border-zinc-800 px-3 py-1.5 last:border-b-0"
                  >
                    <span className="mono w-6 text-[10px] text-zinc-600">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="mono flex-1 text-xs text-zinc-300">
                      {describeEvent(event, nameOf)}
                    </span>
                    <button
                      onClick={() =>
                        updateMacro({
                          ...macro,
                          events: macro.events.filter((_, i) => i !== index),
                        })
                      }
                      className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-red-300"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ol>

              <div className="mt-3">
                <InfoNote>
                  Recording swallows keystrokes while active — use the mouse to stop. If a trigger
                  already exists on that key/layer it is replaced.
                </InfoNote>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}

function describeEvent(event: MacroEvent, nameOf: (vk: number) => string): string {
  switch (event.kind) {
    case 'key_down':
      return `key ↓ ${nameOf(event.vk)}`
    case 'key_up':
      return `key ↑ ${nameOf(event.vk)}`
    case 'mouse_down':
      return `mouse ${event.button} ↓`
    case 'mouse_up':
      return `mouse ${event.button} ↑`
    case 'delay':
      return `delay ${event.ms} ms`
  }
}
