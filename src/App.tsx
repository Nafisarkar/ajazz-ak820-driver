import { useState } from 'react'
import { AppProvider, useApp, useStatus } from './state/app'
import { StatusView } from './views/Status'
import { LightingView } from './views/Lighting'
import { Keymap } from './views/Keymap'
import { Macros } from './views/Macros'
import { Profiles } from './views/Profiles'
import { Settings } from './views/Settings'

type Tab = 'status' | 'lighting' | 'keymap' | 'macros' | 'profiles' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'keymap', label: 'Keymap' },
  { id: 'macros', label: 'Macros' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'status', label: 'Diagnostics' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('keymap')
  const { activeProfile, setEnabled } = useApp()
  const { status } = useStatus()
  const hook = status?.hook

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-stretch border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center border-r border-zinc-800 px-4 py-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em]">AK820 Companion</div>
            <div className="mono text-[10px] text-zinc-500">v{status?.version ?? '…'} · user-mode hooks</div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-zinc-800 px-4">
          <button
            onClick={() => setEnabled(!status?.enabled)}
            className={`mono px-4 py-1.5 text-xs font-semibold uppercase tracking-widest ${
              status?.enabled
                ? 'border border-emerald-500 bg-emerald-600 text-white'
                : 'border border-zinc-600 bg-zinc-800 text-zinc-300'
            }`}
          >
            {status?.enabled ? 'Remap ON' : 'Remap OFF'}
          </button>
          <span className="mono text-[10px] leading-tight text-zinc-500">
            {status?.elevated ? 'ADMIN' : 'USER'}
            <br />
            {hook?.alive ? 'HOOK OK' : 'HOOK DOWN'}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-6 px-4">
          <HeaderStat label="profile" value={activeProfile?.name ?? '—'} />
          <HeaderStat label="events" value={hook?.events ?? 0} />
          <HeaderStat label="remapped" value={hook?.remapped ?? 0} />
          <HeaderStat label="panics" value={hook?.panics ?? 0} />
          {status?.recording && <span className="mono text-xs text-red-400">● RECORDING</span>}
          {status?.playing && <span className="mono text-xs text-sky-400">▶ MACRO</span>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-40 shrink-0 border-r border-zinc-800 bg-zinc-900">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`block w-full border-b border-zinc-800 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest ${
                tab === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <main className="flex-1 overflow-hidden">
          {tab === 'status' && <StatusView />}
          {tab === 'lighting' && <LightingView />}
          {tab === 'keymap' && <Keymap />}
          {tab === 'macros' && <Macros />}
          {tab === 'profiles' && <Profiles />}
          {tab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

function HeaderStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">{label}</div>
      <div className="mono text-xs text-zinc-300">{value}</div>
    </div>
  )
}
