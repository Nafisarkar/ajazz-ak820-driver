import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Action, Catalog, Macro, MacroPlay } from '../state/api'
import { modsFromEvent, vkFromEvent } from '../state/capture'
import { describeAction } from '../state/describe'
import { Button, Field, Select, TextInput } from './ui'

interface Props {
  action: Action
  macros: Macro[]
  catalog: Catalog
  nameOf: (vk: number) => string
  onChange: (action: Action) => void
  onClear: () => void
}

const KINDS: { kind: Action['kind']; label: string }[] = [
  { kind: 'key', label: 'Key' },
  { kind: 'media', label: 'Media' },
  { kind: 'mouse', label: 'Mouse' },
  { kind: 'macro', label: 'Macro' },
  { kind: 'app', label: 'App' },
  { kind: 'text', label: 'Text' },
  { kind: 'layer', label: 'Layer' },
  { kind: 'disabled', label: 'Disable' },
]

export function ActionPicker({ action, macros, catalog, nameOf, onChange, onClear }: Props) {
  const [capturing, setCapturing] = useState(false)
  const captureRef = useRef<HTMLInputElement>(null)

  // Focus the hidden capture field as soon as arming starts.
  useEffect(() => {
    if (capturing) captureRef.current?.focus()
  }, [capturing])

  const capture = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!capturing) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape' && !event.ctrlKey && !event.altKey) {
      setCapturing(false)
      return
    }
    const vk = vkFromEvent(event)
    if (vk === null) return
    onChange({ kind: 'key', mods: modsFromEvent(event), vk })
    setCapturing(false)
  }

  const switchKind = (kind: Action['kind']) => {
    if (kind === action.kind) return
    switch (kind) {
      case 'disabled':
        return onChange({ kind: 'disabled' })
      case 'macro':
        return onChange({ kind: 'macro', id: macros[0]?.id ?? 0, play: { kind: 'once' } })
      case 'media':
        return onChange({ kind: 'media', vk: catalog.media[0]?.value ?? 0 })
      case 'mouse':
        return onChange({ kind: 'mouse', button: catalog.mouse[0]?.value ?? 1 })
      case 'app':
        return onChange({ kind: 'app', path: '' })
      case 'text':
        return onChange({ kind: 'text', text: '' })
      case 'layer':
        return onChange({ kind: 'layer', layer: 1 })
      case 'key':
        return onChange({ kind: 'key', mods: 0, vk: 0x41 })
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1">
        {KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => switchKind(kind)}
            className={`border px-1 py-1 text-[10px] font-medium uppercase tracking-wide ${
              action.kind === kind
                ? 'border-sky-500 bg-sky-600 text-white'
                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {action.kind === 'key' && (
        <div className="space-y-2">
          <Button variant={capturing ? 'primary' : 'default'} className="w-full" onClick={() => setCapturing(true)}>
            {capturing ? 'Press a key or combo…' : `Send: ${describeAction(action, nameOf, macros)}`}
          </Button>
          <input
            ref={captureRef}
            className="h-0 w-0 border-0 p-0 opacity-0"
            onKeyDown={capture}
            onBlur={() => setCapturing(false)}
            aria-label="Capture keystroke"
          />
          {capturing && (
            <div className="mono text-[10px] text-sky-400">listening… (Esc cancels)</div>
          )}
        </div>
      )}

      {action.kind === 'media' && (
        <Select
          value={action.vk}
          onChange={(v) => onChange({ kind: 'media', vk: Number(v) })}
          options={catalog.media.map((e) => ({ value: e.value, label: e.label }))}
        />
      )}

      {action.kind === 'mouse' && (
        <Select
          value={action.button}
          onChange={(v) => onChange({ kind: 'mouse', button: Number(v) })}
          options={catalog.mouse.map((e) => ({ value: e.value, label: e.label }))}
        />
      )}

      {action.kind === 'macro' && (
        <div className="space-y-2">
          <Select
            value={action.id}
            onChange={(v) => onChange({ ...action, id: Number(v) })}
            options={
              macros.length
                ? macros.map((m) => ({ value: m.id, label: `${m.name} (${m.events.length} ev)` }))
                : [{ value: 0, label: 'No macros yet' }]
            }
          />
          <Select
            value={action.play.kind}
            onChange={(v) => {
              const kind = v as MacroPlay['kind']
              const play: MacroPlay =
                kind === 'repeat'
                  ? { kind: 'repeat', times: 3 }
                  : kind === 'once'
                    ? { kind: 'once' }
                    : { kind: 'while_held' }
              onChange({ ...action, play })
            }}
            options={[
              { value: 'once', label: 'Play once' },
              { value: 'repeat', label: 'Repeat x3' },
              { value: 'while_held', label: 'While held' },
            ]}
          />
        </div>
      )}

      {action.kind === 'app' && (
        <Field label="Executable path">
          <TextInput
            mono
            value={action.path}
            placeholder="C:\Windows\System32\calc.exe"
            onChange={(path) => onChange({ kind: 'app', path })}
          />
        </Field>
      )}

      {action.kind === 'text' && (
        <Field label="Text to type">
          <TextInput value={action.text} onChange={(text) => onChange({ kind: 'text', text })} />
        </Field>
      )}

      {action.kind === 'layer' && (
        <Select
          value={action.layer}
          onChange={(v) => onChange({ kind: 'layer', layer: Number(v) })}
          options={[
            { value: 1, label: 'Layer 1 (hold)' },
            { value: 2, label: 'Layer 2 (hold)' },
          ]}
        />
      )}

      {action.kind === 'disabled' && (
        <p className="text-[11px] text-zinc-500">The key is swallowed and produces nothing.</p>
      )}

      <Button variant="ghost" className="w-full" onClick={onClear}>
        Clear binding
      </Button>
    </div>
  )
}
