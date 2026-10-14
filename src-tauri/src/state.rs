use arc_swap::ArcSwap;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use crate::profile::{
    load_store, save_store, Action, Macro, MacroEvent, Profile, Store, StoreError, Trigger,
};

/// A compiled, immutable snapshot the low-level hook reads without locking.
#[derive(Debug, Clone, Default)]
pub struct RuntimeConfig {
    /// Shared with [`AppState`] so the hook can flip it (panic combo) and the UI sees it.
    pub enabled: Arc<AtomicBool>,
    pub layer_key_vk: Option<u16>,
    /// (layer, vk) -> action, for `Trigger::Vk`
    pub bindings: HashMap<(u8, u16), Action>,
    /// (layer, mods, vk) -> action, for `Trigger::Combo` (exact modifier match)
    pub combo_bindings: HashMap<(u8, u8, u16), Action>,
    pub macros: HashMap<u32, Macro>,
    pub panic: Option<(u8, u16)>,
    pub stop_on_keypress: bool,
}

impl RuntimeConfig {
    pub fn compile(profile: &Profile, enabled: Arc<AtomicBool>) -> Self {
        let mut cfg = RuntimeConfig {
            enabled,
            layer_key_vk: profile.layer_key.vk(),
            stop_on_keypress: profile.settings.stop_macro_on_keypress,
            ..Default::default()
        };
        for binding in profile.bindings.iter().filter(|b| b.enabled) {
            match binding.trigger {
                Trigger::Vk { vk } => {
                    cfg.bindings.insert((binding.layer, vk), binding.action.clone());
                }
                Trigger::Combo { mods, vk } => {
                    cfg.combo_bindings
                        .insert((binding.layer, mods, vk), binding.action.clone());
                }
            }
        }
        for m in &profile.macros {
            cfg.macros.insert(m.id, m.clone());
        }
        cfg.panic = match profile.settings.panic_combo {
            Trigger::Vk { vk } => Some((0, vk)),
            Trigger::Combo { mods, vk } => Some((mods, vk)),
        };
        cfg
    }

    /// Exact-modifier lookup: a combo binding only fires when the held modifiers
    /// match exactly; a plain binding fires only when no modifiers are held.
    pub fn lookup(&self, layer: u8, mods: u8, vk: u16) -> Option<&Action> {
        if let Some(action) = self.combo_bindings.get(&(layer, mods, vk)) {
            return Some(action);
        }
        if mods == 0 {
            return self.bindings.get(&(layer, vk));
        }
        None
    }
}

pub struct AppState {
    pub config: Arc<ArcSwap<RuntimeConfig>>,
    pub store: Mutex<Store>,
    pub data_dir: PathBuf,
    pub enabled: Arc<AtomicBool>,
    pub recording: Arc<AtomicBool>,
    pub recorded: Arc<Mutex<Vec<MacroEvent>>>,
}

impl AppState {
    pub fn load(data_dir: PathBuf) -> Self {
        let store = load_store(&data_dir).unwrap_or_else(|_| Store::new_default());
        let enabled = Arc::new(AtomicBool::new(false));
        let config = Arc::new(ArcSwap::from_pointee(
            store
                .active_profile()
                .map(|p| RuntimeConfig::compile(p, enabled.clone()))
                .unwrap_or_default(),
        ));
        AppState {
            config,
            store: Mutex::new(store),
            data_dir,
            enabled,
            recording: Arc::new(AtomicBool::new(false)),
            recorded: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::Relaxed)
    }

    pub fn set_enabled(&self, value: bool) {
        self.enabled.store(value, Ordering::Relaxed);
        crate::logging::info(&format!("remapping {}", if value { "enabled" } else { "disabled" }));
        self.publish();
    }

    /// Recompile the runtime snapshot from the active profile and current enabled flag.
    pub fn publish(&self) {
        let store = self.store.lock().unwrap();
        if let Some(profile) = store.active_profile() {
            let cfg = RuntimeConfig::compile(profile, self.enabled.clone());
            self.config.store(Arc::new(cfg));
        }
    }

    pub fn save(&self) -> Result<(), StoreError> {
        let store = self.store.lock().unwrap();
        save_store(&self.data_dir, &store)
    }

    pub fn snapshot(&self) -> Store {
        self.store.lock().unwrap().clone()
    }

    /// Cheap summary for the status poll — avoids cloning the whole store.
    pub fn summary(&self) -> StoreSummary {
        let store = self.store.lock().unwrap();
        let active = store.active_profile();
        StoreSummary {
            active_id: store.active.clone(),
            profile_count: store.profiles.len(),
            binding_count: active.map(|p| p.bindings.len()).unwrap_or(0),
            macro_count: active.map(|p| p.macros.len()).unwrap_or(0),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreSummary {
    pub active_id: String,
    pub profile_count: usize,
    pub binding_count: usize,
    pub macro_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profile::{
        Binding, LayerKey, MacroPlay, Settings, MOD_CTRL, MOD_SHIFT,
    };

    fn profile_with_bindings() -> Profile {
        Profile {
            id: "p1".into(),
            name: "P1".into(),
            layer_key: LayerKey::CapsLock,
            bindings: vec![
                Binding {
                    layer: 0,
                    trigger: Trigger::Vk { vk: 0x41 },
                    action: Action::Key { mods: 0, vk: 0x42 },
                    enabled: true,
                },
                Binding {
                    layer: 0,
                    trigger: Trigger::Combo {
                        mods: MOD_CTRL,
                        vk: 0x43,
                    },
                    action: Action::Disabled,
                    enabled: true,
                },
                Binding {
                    layer: 1,
                    trigger: Trigger::Vk { vk: 0x41 },
                    action: Action::Key {
                        mods: MOD_SHIFT,
                        vk: 0x44,
                    },
                    enabled: true,
                },
                Binding {
                    layer: 0,
                    trigger: Trigger::Vk { vk: 0x45 },
                    action: Action::Disabled,
                    enabled: false,
                },
            ],
            macros: vec![Macro {
                id: 3,
                name: "m".into(),
                events: vec![MacroEvent::Delay { ms: 10 }],
            }],
            settings: Settings::default(),
            lighting: crate::profile::Lighting::default(),
        }
    }

    fn compiled(enabled: bool) -> RuntimeConfig {
        RuntimeConfig::compile(&profile_with_bindings(), Arc::new(AtomicBool::new(enabled)))
    }

    #[test]
    fn plain_binding_fires_only_without_modifiers() {
        let cfg = compiled(true);
        assert_eq!(
            cfg.lookup(0, 0, 0x41),
            Some(&Action::Key { mods: 0, vk: 0x42 })
        );
        assert_eq!(cfg.lookup(0, MOD_CTRL, 0x41), None);
    }

    #[test]
    fn combo_binding_requires_exact_modifiers() {
        let cfg = compiled(true);
        assert_eq!(cfg.lookup(0, MOD_CTRL, 0x43), Some(&Action::Disabled));
        assert_eq!(cfg.lookup(0, MOD_CTRL | MOD_SHIFT, 0x43), None);
        assert_eq!(cfg.lookup(0, 0, 0x43), None);
    }

    #[test]
    fn layers_are_independent() {
        let cfg = compiled(true);
        assert_eq!(
            cfg.lookup(1, 0, 0x41),
            Some(&Action::Key {
                mods: MOD_SHIFT,
                vk: 0x44
            })
        );
    }

    #[test]
    fn disabled_bindings_are_dropped() {
        let cfg = compiled(true);
        assert_eq!(cfg.lookup(0, 0, 0x45), None);
    }

    #[test]
    fn macros_are_indexed_by_id() {
        let cfg = compiled(true);
        assert!(cfg.macros.contains_key(&3));
        assert!(!cfg.macros.contains_key(&99));
    }

    #[test]
    fn enabled_flag_is_shared_into_snapshot() {
        let flag = Arc::new(AtomicBool::new(false));
        let cfg = RuntimeConfig::compile(&profile_with_bindings(), flag.clone());
        assert!(!cfg.enabled.load(Ordering::Relaxed));
        // the hook flips the shared flag (e.g. panic combo) and the snapshot sees it
        flag.store(true, Ordering::Relaxed);
        assert!(cfg.enabled.load(Ordering::Relaxed));
    }

    #[test]
    fn macro_play_variants_serialize() {
        let once = serde_json::to_string(&MacroPlay::Once).unwrap();
        let repeat = serde_json::to_string(&MacroPlay::Repeat { times: 3 }).unwrap();
        assert!(once.contains("once"));
        assert!(repeat.contains("repeat"));
    }
}
