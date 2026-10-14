import { invoke } from '@tauri-apps/api/core'

export type LayerKey = 'caps_lock' | 'right_alt' | 'scroll_lock' | 'none'

export type Trigger =
  | { kind: 'vk'; vk: number }
  | { kind: 'combo'; mods: number; vk: number }

export type MacroPlay =
  | { kind: 'once' }
  | { kind: 'repeat'; times: number }
  | { kind: 'while_held' }

export type Action =
  | { kind: 'key'; mods: number; vk: number }
  | { kind: 'media'; vk: number }
  | { kind: 'mouse'; button: number }
  | { kind: 'macro'; id: number; play: MacroPlay }
  | { kind: 'app'; path: string }
  | { kind: 'text'; text: string }
  | { kind: 'disabled' }
  | { kind: 'layer'; layer: number }

export type MacroEvent =
  | { kind: 'key_down'; vk: number }
  | { kind: 'key_up'; vk: number }
  | { kind: 'mouse_down'; button: number }
  | { kind: 'mouse_up'; button: number }
  | { kind: 'delay'; ms: number }

export interface Binding {
  layer: number
  trigger: Trigger
  action: Action
  enabled: boolean
}

export interface Macro {
  id: number
  name: string
  events: MacroEvent[]
}

export interface Settings {
  panic_combo: Trigger
  stop_macro_on_keypress: boolean
  start_minimized: boolean
}

export interface Lighting {
  mode: number
  brightness: number
  speed: number
}

export interface Profile {
  id: string
  name: string
  layer_key: LayerKey
  bindings: Binding[]
  macros: Macro[]
  settings: Settings
  lighting: Lighting
}

export interface Store {
  version: number
  active: string
  profiles: Profile[]
}

export interface HookHealth {
  alive: boolean
  error: string | null
  events: number
  remapped: number
  panics: number
  trace: boolean
}

export interface Status {
  enabled: boolean
  elevated: boolean
  recording: boolean
  playing: boolean
  activeId: string
  profileCount: number
  bindingCount: number
  macroCount: number
  version: string
  hook: HookHealth
}

export interface CatalogEntry {
  value: number
  label: string
}

export interface Catalog {
  media: CatalogEntry[]
  mouse: CatalogEntry[]
  keyNames: CatalogEntry[]
}

export const MOD_CTRL = 0x01
export const MOD_SHIFT = 0x02
export const MOD_ALT = 0x04
export const MOD_WIN = 0x08

export const api = {
  status: () => invoke<Status>('get_status'),
  store: () => invoke<Store>('get_store'),
  catalog: () => invoke<Catalog>('get_catalog'),
  hookHealth: () => invoke<HookHealth>('get_hook_health'),
  setTrace: (enabled: boolean) => invoke<void>('set_trace', { enabled }),
  applyLighting: (lighting: Lighting) => invoke<void>('apply_lighting', { lighting }),
  saveLighting: () => invoke<void>('save_lighting'),
  readLightingStatus: () => invoke<string>('read_lighting_status'),
  setEnabled: (enabled: boolean) => invoke<void>('set_enabled', { enabled }),
  saveProfile: (profile: Profile) => invoke<Store>('save_profile', { profile }),
  createProfile: (name: string) => invoke<Store>('create_profile', { name }),
  deleteProfile: (id: string) => invoke<Store>('delete_profile', { id }),
  setActiveProfile: (id: string) => invoke<Store>('set_active_profile', { id }),
  startRecording: () => invoke<void>('start_recording'),
  stopRecording: () => invoke<MacroEvent[]>('stop_recording'),
  playMacro: (id: number) => invoke<void>('play_macro', { id }),
  stopMacro: () => invoke<void>('stop_macro'),
  exportStore: () => invoke<string>('export_store'),
  importStore: (json: string) => invoke<Store>('import_store', { json }),
}

export function modifierLabel(mods: number): string {
  const parts: string[] = []
  if (mods & MOD_CTRL) parts.push('Ctrl')
  if (mods & MOD_SHIFT) parts.push('Shift')
  if (mods & MOD_ALT) parts.push('Alt')
  if (mods & MOD_WIN) parts.push('Win')
  return parts.join('+')
}
