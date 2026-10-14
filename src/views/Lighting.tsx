import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/app'
import { api } from '../state/api'
import type { Lighting } from '../state/api'
import { BRIGHTNESS_MAX, LIGHTING_MODES, SPEED_MAX } from '../data/lightingModes'
import { Button, InfoNote, Panel, Stat } from '../components/ui'

export function LightingView() {
  const { activeProfile, mutateActive } = useApp()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(true)
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastApplied = useRef('')

  const lighting: Lighting = activeProfile?.lighting ?? { mode: 1, brightness: 5, speed: 4 }

  // Coalesce rapid slider/mode clicks into one HID write.
  useEffect(() => {
    if (!live || !activeProfile) return
    const key = `${lighting.mode}/${lighting.brightness}/${lighting.speed}`
    if (lastApplied.current === key) return
    if (applyTimer.current) clearTimeout(applyTimer.current)
    applyTimer.current = setTimeout(() => {
      lastApplied.current = key
      api.applyLighting(lighting).then(
        () => setError(null),
        (e) => setError(e instanceof Error ? e.message : String(e)),
      )
    }, 80)
    return () => {
      if (applyTimer.current) clearTimeout(applyTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lighting.mode, lighting.brightness, lighting.speed, live, activeProfile?.id])

  if (!activeProfile) return <div className="p-6 text-xs text-zinc-500">Loading…</div>

  const update = (patch: Partial<Lighting>) => {
    void mutateActive((profile) => ({ ...profile, lighting: { ...profile.lighting, ...patch } }))
  }

  const readStatus = async () => {
    try {
      setStatus(await api.readLightingStatus())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const save = async () => {
    try {
      await api.saveLighting()
      setStatus('committed')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Lighting</h2>
      <p className="mt-1 text-xs text-zinc-500">
        8-byte feature report 0x07 over HID — the only thing this board's firmware accepts.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="mode" value={lighting.mode} />
        <Stat label="brightness" value={`${lighting.brightness}/${BRIGHTNESS_MAX}`} />
        <Stat label="speed" value={`${lighting.speed}/${SPEED_MAX}`} />
      </div>

      <div className="mt-4 grid grid-cols-[2fr_1fr] gap-4">
        <Panel title="Mode" hint="Click to apply immediately.">
          <div className="grid grid-cols-3 gap-1">
            {LIGHTING_MODES.map((m) => (
              <button
                key={m.mode}
                onClick={() => update({ mode: m.mode })}
                className={`border px-2 py-1.5 text-left text-xs ${
                  lighting.mode === m.mode
                    ? 'border-sky-500 bg-sky-600/20 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <span className="mono mr-1 text-[10px] text-zinc-600">
                  {String(m.mode).padStart(2, '0')}
                </span>
                {m.name}
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Brightness">
            <Stepper
              value={lighting.brightness}
              max={BRIGHTNESS_MAX}
              onChange={(v) => update({ brightness: v })}
            />
          </Panel>
          <Panel title="Speed">
            <Stepper value={lighting.speed} max={SPEED_MAX} onChange={(v) => update({ speed: v })} />
          </Panel>
          <Panel title="Actions">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={save}>
                Save to keyboard
              </Button>
              <Button onClick={readStatus}>Read status</Button>
              <Button variant={live ? 'default' : 'ghost'} onClick={() => setLive(!live)}>
                {live ? 'Live: on' : 'Live: off'}
              </Button>
            </div>
            {status && <div className="mono mt-3 text-[11px] text-zinc-400">status: {status}</div>}
            {error && <div className="mt-3 text-[11px] text-red-300">{error}</div>}
            <div className="mt-3">
              <InfoNote>
                Live applies each change instantly. “Save to keyboard” commits the state so it
                survives power-off (the vendor app only commits when it exits).
              </InfoNote>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-stretch gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`mono flex-1 border py-2 text-xs ${
            value === level
              ? 'border-sky-500 bg-sky-600 text-white'
              : 'border-zinc-700 bg-zinc-950 text-zinc-500 hover:text-zinc-200'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  )
}
