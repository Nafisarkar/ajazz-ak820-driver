import { useState } from 'react'
import { useApp } from '../state/app'
import { api } from '../state/api'
import { Button, Panel, TextInput } from '../components/ui'

export function Profiles() {
  const { store, activeProfile, createProfile, deleteProfile, setActiveProfile, notify, error } =
    useApp()
  const [name, setName] = useState('')
  const [importText, setImportText] = useState('')
  const [exportText, setExportText] = useState('')

  if (!store) return <div className="p-6 text-xs text-zinc-500">Loading…</div>

  const doExport = async () => {
    setExportText(await api.exportStore())
    notify('Exported below — copy it somewhere safe.')
  }

  const doImport = async () => {
    try {
      await api.importStore(importText)
      setImportText('')
      notify('Imported')
    } catch (e) {
      notify(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Profiles</h2>
      <p className="mt-1 text-xs text-zinc-500">
        One profile is active at a time; switching recompiles bindings immediately.
      </p>

      <div className="mt-4 border border-zinc-800">
        {store.profiles.map((profile) => {
          const active = activeProfile?.id === profile.id
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 border-b border-zinc-800 px-3 py-2 last:border-b-0 ${
                active ? 'bg-sky-950/40' : 'bg-zinc-900'
              }`}
            >
              <button
                onClick={() => setActiveProfile(profile.id)}
                className={`mono h-3.5 w-3.5 border ${
                  active ? 'border-sky-400 bg-sky-500' : 'border-zinc-600'
                }`}
                aria-label={`Activate ${profile.name}`}
              />
              <div className="flex-1">
                <div className="text-xs font-medium text-zinc-200">{profile.name}</div>
                <div className="mono text-[10px] text-zinc-500">
                  {profile.bindings.length} bindings · {profile.macros.length} macros · layer key{' '}
                  {profile.layer_key.replace('_', ' ')} · light m{profile.lighting.mode}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => deleteProfile(profile.id)}
                disabled={store.profiles.length <= 1}
              >
                Delete
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex-1">
          <TextInput value={name} onChange={setName} placeholder="New profile name" />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            if (name.trim()) {
              void createProfile(name.trim())
              setName('')
            }
          }}
        >
          Create
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
        <Panel title="Import / export" hint="Paste JSON to import, or export the current store.">
          <textarea
            value={exportText || importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setExportText('')
            }}
            placeholder="Paste profile JSON here…"
            className="mono h-56 w-full border border-zinc-700 bg-black/40 p-2 text-[11px] text-zinc-300"
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={doExport}>Export</Button>
            <Button onClick={doImport} disabled={!importText.trim()}>
              Import
            </Button>
          </div>
        </Panel>
        <div className="w-64 space-y-2">
          {error && (
            <div className="border border-red-900 bg-red-950/40 p-2 text-[11px] text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
