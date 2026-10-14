# AK820 Companion — Architecture

Native, user-mode companion for the AJAZZ AK820 (wired single-light edition). It
provides key remapping, layers, macros and profiles — the features the official
driver implements host-side — without shipping a kernel driver.

## Why host-side, and why user-mode

The official app does **not** program keymaps into this keyboard. A USB capture
proved it writes only lighting reports; the vendor PDB shows the rest of the
feature surface (`KeyboardDlg::VHidSendMacroRecord`, `m_bVHidDevice`) is
implemented on the PC: it monitors keys and injects remapped input through
`vhidflt.sys`, a Virtual-HID-Framework keyboard driver.

This project takes the same host-side approach but stays in user mode:

| | Official app | AK820 Companion |
|---|---|---|
| Lighting | feature report 0x07 (USB) | not implemented — see `ak820-web` |
| Interception | kernel virtual-HID driver | `WH_KEYBOARD_LL` low-level hook |
| Injection | virtual keyboard device | `SendInput` |
| Requires admin to install | yes (driver) | no |
| Works in elevated windows | yes | only when run elevated (UIPI) |
| Works with anti-cheat games | usually | often not |

## Layers

```
React UI (src/)
  state/app.tsx        store + status + catalog, polling, mutations
  state/api.ts         typed wrappers over Tauri commands
  data/layout.ts       KB-K102 key geometry (generated from the vendor XML)
  data/hidToVk.ts      HID usage -> Windows VK, for host-side triggers
        │  invoke()
        ▼
Tauri commands (src-tauri/src/commands.rs)
  get_status / get_store / get_catalog
  set_enabled / save_profile / create_profile / delete_profile / set_active_profile
  start_recording / stop_recording / play_macro / stop_macro
  export_store / import_store
        │
        ▼
App state (state.rs)
  Mutex<Store>            persisted profiles (JSON in the app data dir)
  ArcSwap<RuntimeConfig>  lock-free compiled snapshot read by the hook thread
  Arc<AtomicBool> enabled shared with the hook (panic combo can flip it)
        │
        ▼
Input backend (platform/windows/)
  hook.rs    WH_KEYBOARD_LL on a dedicated thread with a message pump
  inject.rs  SendInput wrappers, all events tagged with dwExtraInfo = 0xA820C0DE
  macros.rs  macro playback on a worker thread, cancellable, interruptible sleeps
  vk.rs      VK constants, modifier mapping, key-name table (also feeds the UI)
```

## Hook behaviour

* **Message pump thread.** `SetWindowsHookExW(WH_KEYBOARD_LL, …)` plus
  `GetMessageW`; the callback runs on that thread and must stay fast.
* **Loop prevention.** Every injected event carries `dwExtraInfo = MAGIC`
  (`0xA820C0DE`); the hook returns immediately for tagged events, so remapped
  output cannot re-enter the remapper.
* **Lock-free lookup.** The callback reads an `ArcSwap<RuntimeConfig>` snapshot —
  no mutex on the hot path. Editing a profile compiles a new snapshot atomically.
* **Exact-modifier matching.** A plain binding fires only with no modifiers held;
  a combo binding fires only when the held modifier set matches exactly.
* **Swallow semantics.** A matched key-down is swallowed and its action is
  injected. Held output keys are remembered; the physical key-up releases them.
  Disabling (panic combo or tray) releases everything still held — no stuck keys.
* **Auto-repeat.** Repeats re-emit for plain key remaps and are ignored for
  macros, media and mouse actions.
* **Layers.** The layer key (CapsLock by default) is swallowed and switches the
  active layer while held. `Action::Layer` gives momentary layer switching per key.
* **Recording.** While recording, the hook swallows all keys and appends events
  (with inter-event delays ≥ 10 ms) to a buffer the UI collects on stop.

## Macro engine

`MacroEvent`s are a linear program: key/mouse down-up and delays. Playback runs on
its own thread and supports `once`, `repeat { times }` and `while_held` (loops
until the trigger key is released or any key is pressed when
`stop_macro_on_keypress` is set). Delays sleep in 10 ms slices so cancellation is
immediate rather than waiting for a long delay to elapse.

## Persistence

`%APPDATA%/dev.ak820.companion/profiles.json` — one `Store` holding all profiles
plus the active profile id. The runtime snapshot is always derived from it, so
the file is the single source of truth.

## Performance

The hook callback runs on every keystroke, so it is the one place where cost
matters most.

| Area | Choice |
|---|---|
| Hot-path allocation | none — stack buffers and arrays only |
| Hot-path file I/O | none — per-remap logging is behind an opt-in trace flag (Diagnostics → Trace) |
| Binding lookup | lock-free `ArcSwap<RuntimeConfig>` snapshot; two `HashMap` lookups |
| Key state | one mutex acquisition per event (claim key + detect auto-repeat together) |
| Counters | plain `AtomicU64` increments (events / remapped / panics) |
| Status polling | `AppState::summary()` returns four small fields; the whole `Store` is never cloned for status |
| UI re-renders | split React contexts — live status is separate from profile data, so the 1.5 s poll does not re-render editors |
| Profile writes | edits apply optimistically and persist after a 400 ms pause (coalesces typing and slider drags) |
| Lighting writes | 80 ms coalescing and duplicate suppression before the HID feature report |
| Release binary | LTO, `opt-level = "s"`, `codegen-units = 1`, `strip`, `panic = "abort"` |

## Extending to Linux

`platform/mod.rs` exposes `hook`, `macros` (and `windows::is_elevated`) behind a
module boundary; a Linux backend would implement the same surface with
`evdev`/`uinput` (`EVIOCGRAB` for interception, `uinput` for injection). The
profile model, macro engine and UI are platform-neutral.
