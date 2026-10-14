//! Low-level keyboard hook (`WH_KEYBOARD_LL`): intercepts, remaps and swallows.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU8, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Instant;

use arc_swap::ArcSwap;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage,
    UnhookWindowsHookEx, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP,
    WM_SYSKEYDOWN, WM_SYSKEYUP,
};

use super::{inject, macros, vk};
use crate::logging;
use crate::profile::{Action, MacroEvent};
use crate::state::RuntimeConfig;

struct HookState {
    config: Arc<ArcSwap<RuntimeConfig>>,
    recording: Arc<AtomicBool>,
    recorded: Arc<Mutex<Vec<MacroEvent>>>,
    layer: AtomicU8,
    mods: AtomicU8,
    /// physical vk -> injected key still held down (needs release on key-up)
    pending_release: Mutex<HashMap<u16, u16>>,
    /// physical vk -> layer it momentarily switches to
    layer_bindings: Mutex<HashMap<u16, u8>>,
    last_record_ts: Mutex<Option<Instant>>,
}

static HOOK: OnceLock<HookState> = OnceLock::new();
static INSTALLED: AtomicBool = AtomicBool::new(false);
static INSTALL_ERROR: OnceLock<Mutex<Option<String>>> = OnceLock::new();
static EVENTS: AtomicU64 = AtomicU64::new(0);
static REMAPPED: AtomicU64 = AtomicU64::new(0);
static PANICS: AtomicU64 = AtomicU64::new(0);
/// Verbose per-remap logging is off by default: the hook callback must never do
/// file I/O while the user types.
static TRACE: AtomicBool = AtomicBool::new(false);

pub fn set_trace(enabled: bool) {
    TRACE.store(enabled, Ordering::Relaxed);
    logging::info(&format!("trace logging {}", if enabled { "on" } else { "off" }));
}

/// Observable health of the hook, surfaced in the UI.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HookHealth {
    pub alive: bool,
    pub error: Option<String>,
    pub events: u64,
    pub remapped: u64,
    pub panics: u64,
    pub trace: bool,
}

pub fn health() -> HookHealth {
    HookHealth {
        alive: INSTALLED.load(Ordering::Relaxed),
        error: INSTALL_ERROR
            .get()
            .and_then(|slot| slot.lock().ok().and_then(|guard| guard.clone())),
        events: EVENTS.load(Ordering::Relaxed),
        remapped: REMAPPED.load(Ordering::Relaxed),
        panics: PANICS.load(Ordering::Relaxed),
        trace: TRACE.load(Ordering::Relaxed),
    }
}

fn set_error(message: String) {
    let slot = INSTALL_ERROR.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = slot.lock() {
        *guard = Some(message);
    }
}

pub fn start(
    config: Arc<ArcSwap<RuntimeConfig>>,
    recording: Arc<AtomicBool>,
    recorded: Arc<Mutex<Vec<MacroEvent>>>,
) -> Result<(), String> {
    let state = HookState {
        config,
        recording,
        recorded,
        layer: AtomicU8::new(0),
        mods: AtomicU8::new(0),
        pending_release: Mutex::new(HashMap::new()),
        layer_bindings: Mutex::new(HashMap::new()),
        last_record_ts: Mutex::new(None),
    };
    HOOK.set(state).map_err(|_| "keyboard hook already started".to_string())?;

    std::thread::Builder::new()
        .name("ak820-hook".into())
        .spawn(|| unsafe {
            let hook = match SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), None, 0) {
                Ok(hook) => hook,
                Err(err) => {
                    let message = format!("failed to install keyboard hook: {err}");
                    logging::warn(&message);
                    set_error(message);
                    return;
                }
            };
            INSTALLED.store(true, Ordering::Relaxed);
            logging::info("keyboard hook installed");
            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            let _ = UnhookWindowsHookEx(hook);
            INSTALLED.store(false, Ordering::Relaxed);
            logging::warn("keyboard hook message loop exited");
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Release every key we injected and are still holding (used when disabling).
pub fn release_pending() {
    let Some(state) = HOOK.get() else { return };
    let mut guard = state.pending_release.lock().unwrap();
    for (_, injected) in guard.drain() {
        inject::key(injected, false);
    }
}

unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code < 0 {
        return CallNextHookEx(None, code, wparam, lparam);
    }
    let Some(state) = HOOK.get() else {
        return CallNextHookEx(None, code, wparam, lparam);
    };
    let kb = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
    // Ignore our own synthetic input.
    if kb.dwExtraInfo == inject::MAGIC {
        return CallNextHookEx(None, code, wparam, lparam);
    }
    let msg = wparam.0 as u32;
    let down = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;
    let up = msg == WM_KEYUP || msg == WM_SYSKEYUP;
    if !down && !up {
        return CallNextHookEx(None, code, wparam, lparam);
    }
    let vk_code = kb.vkCode as u16;
    EVENTS.fetch_add(1, Ordering::Relaxed);

    let cfg = state.config.load();
    let bit = vk::modifier_bit(vk_code);
    let held_mods = state.mods.load(Ordering::Relaxed);

    // The panic combo must work in every state — including while recording, which
    // swallows every other key, and even when remapping is already disabled.
    if down {
        let mods_now = held_mods | bit;
        if let Some((panic_mods, panic_vk)) = cfg.panic {
            if panic_vk == vk_code && (panic_mods & !mods_now) == 0 {
                cfg.enabled.store(false, Ordering::Relaxed);
                state.recording.store(false, Ordering::Relaxed);
                PANICS.fetch_add(1, Ordering::Relaxed);
                release_pending();
                logging::info(&format!(
                    "panic combo fired (vk {vk_code:02X}, mods {mods_now:02X}) — remapping disabled, recording stopped"
                ));
                if bit != 0 {
                    state.mods.fetch_or(bit, Ordering::Relaxed);
                }
                return LRESULT(1);
            }
        }
    }

    if state.recording.load(Ordering::Relaxed) {
        // Keep modifier state current so the panic combo still matches mid-recording.
        if bit != 0 {
            if down {
                state.mods.fetch_or(bit, Ordering::Relaxed);
            } else {
                state.mods.fetch_and(!bit, Ordering::Relaxed);
            }
        }
        record(state, vk_code, down);
        return LRESULT(1);
    }

    if !cfg.enabled.load(Ordering::Relaxed) {
        return CallNextHookEx(None, code, wparam, lparam);
    }

    if cfg.stop_on_keypress && macros::is_playing() {
        macros::cancel_active();
    }

    if down {
        if Some(vk_code) == cfg.layer_key_vk {
            state.layer.store(1, Ordering::Relaxed);
            return LRESULT(1);
        }

        let layer = state.layer.load(Ordering::Relaxed);
        let matched = cfg.lookup(layer, held_mods, vk_code).cloned();
        if bit != 0 {
            state.mods.fetch_or(bit, Ordering::Relaxed);
        }

        if let Some(action) = matched {
            // Single lock acquisition on the hot path: claim the key and learn
            // whether this is an auto-repeat in one go.
            let is_repeat = {
                let mut guard = state.pending_release.lock().unwrap();
                if guard.contains_key(&vk_code) {
                    true
                } else {
                    guard.insert(vk_code, 0);
                    false
                }
            };
            if is_repeat {
                if let Action::Key { mods: 0, vk } = action {
                    inject::key(vk, true);
                }
            } else {
                if TRACE.load(Ordering::Relaxed) {
                    logging::info(&format!(
                        "remap: vk {vk_code:02X} (layer {layer}, mods {held_mods:02X}) -> {action:?}"
                    ));
                }
                run_action(&action, &cfg, vk_code);
            }
            REMAPPED.fetch_add(1, Ordering::Relaxed);
            return LRESULT(1);
        }
        return CallNextHookEx(None, code, wparam, lparam);
    }

    // key up
    if bit != 0 {
        state.mods.fetch_and(!bit, Ordering::Relaxed);
    }
    if Some(vk_code) == cfg.layer_key_vk {
        state.layer.store(0, Ordering::Relaxed);
        return LRESULT(1);
    }
    let layer_override = state.layer_bindings.lock().unwrap().remove(&vk_code);
    if let Some(_layer) = layer_override {
        state.layer.store(0, Ordering::Relaxed);
        return LRESULT(1);
    }
    let pending = state.pending_release.lock().unwrap().remove(&vk_code);
    if let Some(injected) = pending {
        if injected != 0 {
            inject::key(injected, false);
        }
        macros::cancel_if_trigger(vk_code);
        return LRESULT(1);
    }
    CallNextHookEx(None, code, wparam, lparam)
}

/// Execute an action. Returns nothing; held keys are tracked in `pending_release`
/// by the caller via `run_action`'s side effect on `state`.
fn run_action(action: &Action, cfg: &RuntimeConfig, physical_vk: u16) {
    let Some(state) = HOOK.get() else { return };
    match action {
        Action::Key { mods: 0, vk } => {
            inject::key(*vk, true);
            state.pending_release.lock().unwrap().insert(physical_vk, *vk);
        }
        Action::Key { mods, vk } => {
            inject::key_combo(*mods, *vk);
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
        Action::Media { vk } => {
            inject::key(*vk, true);
            inject::key(*vk, false);
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
        Action::Mouse { button } => {
            inject::mouse(*button, true);
            inject::mouse(*button, false);
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
        Action::Macro { id, play } => {
            if let Some(mac) = cfg.macros.get(id) {
                macros::start(mac.events.clone(), *play, physical_vk);
            }
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
        Action::Text { text } => {
            inject::text(text);
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
        Action::App { path } => {
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "", path])
                .spawn();
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
        Action::Layer { layer } => {
            state
                .layer_bindings
                .lock()
                .unwrap()
                .insert(physical_vk, *layer);
            state.layer.store(*layer, Ordering::Relaxed);
        }
        Action::Disabled => {
            state.pending_release.lock().unwrap().insert(physical_vk, 0);
        }
    }
}

fn record(state: &HookState, vk_code: u16, down: bool) {
    let now = Instant::now();
    {
        let mut last = state.last_record_ts.lock().unwrap();
        if let Some(previous) = *last {
            let elapsed = now.duration_since(previous).as_millis().min(60_000) as u32;
            if elapsed >= 10 {
                state
                    .recorded
                    .lock()
                    .unwrap()
                    .push(MacroEvent::Delay { ms: elapsed });
            }
        }
        *last = Some(now);
    }
    let event = if down {
        MacroEvent::KeyDown { vk: vk_code }
    } else {
        MacroEvent::KeyUp { vk: vk_code }
    };
    state.recorded.lock().unwrap().push(event);
}
