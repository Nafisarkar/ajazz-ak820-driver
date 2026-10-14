use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// A complete, named configuration: bindings, macros and settings.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub layer_key: LayerKey,
    #[serde(default)]
    pub bindings: Vec<Binding>,
    #[serde(default)]
    pub macros: Vec<Macro>,
    #[serde(default)]
    pub settings: Settings,
    #[serde(default)]
    pub lighting: Lighting,
}

/// Onboard lighting state (modes are 1-indexed as in the vendor UI).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct Lighting {
    pub mode: u8,
    pub brightness: u8,
    pub speed: u8,
}

impl Default for Lighting {
    fn default() -> Self {
        Lighting {
            mode: 1,
            brightness: 5,
            speed: 4,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum LayerKey {
    #[default]
    CapsLock,
    RightAlt,
    ScrollLock,
    None,
}

impl LayerKey {
    pub fn vk(self) -> Option<u16> {
        match self {
            LayerKey::CapsLock => Some(0x14),
            LayerKey::RightAlt => Some(0xA5),
            LayerKey::ScrollLock => Some(0x91),
            LayerKey::None => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Trigger {
    Vk { vk: u16 },
    Combo { mods: u8, vk: u16 },
}

impl Trigger {
    pub fn vk(&self) -> u16 {
        match self {
            Trigger::Vk { vk } => *vk,
            Trigger::Combo { vk, .. } => *vk,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum MacroPlay {
    Once,
    Repeat { times: u32 },
    WhileHeld,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Action {
    Key { mods: u8, vk: u16 },
    Media { vk: u16 },
    Mouse { button: u8 },
    Macro { id: u32, play: MacroPlay },
    App { path: String },
    Text { text: String },
    Disabled,
    Layer { layer: u8 },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Binding {
    pub layer: u8,
    pub trigger: Trigger,
    pub action: Action,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Macro {
    pub id: u32,
    pub name: String,
    #[serde(default)]
    pub events: Vec<MacroEvent>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum MacroEvent {
    KeyDown { vk: u16 },
    KeyUp { vk: u16 },
    MouseDown { button: u8 },
    MouseUp { button: u8 },
    Delay { ms: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Settings {
    #[serde(default = "default_panic")]
    pub panic_combo: Trigger,
    #[serde(default)]
    pub stop_macro_on_keypress: bool,
    #[serde(default)]
    pub start_minimized: bool,
}

fn default_panic() -> Trigger {
    // Ctrl + Alt + Esc
    Trigger::Combo {
        mods: MOD_CTRL | MOD_ALT,
        vk: 0x1B,
    }
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            panic_combo: default_panic(),
            stop_macro_on_keypress: false,
            start_minimized: false,
        }
    }
}

pub const MOD_CTRL: u8 = 0x01;
pub const MOD_SHIFT: u8 = 0x02;
pub const MOD_ALT: u8 = 0x04;
pub const MOD_WIN: u8 = 0x08;

/// Everything persisted to disk.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Store {
    pub version: u32,
    pub active: String,
    pub profiles: Vec<Profile>,
}

impl Store {
    pub fn new_default() -> Self {
        let profile = Profile {
            id: "default".to_string(),
            name: "Default".to_string(),
            layer_key: LayerKey::CapsLock,
            bindings: Vec::new(),
            macros: Vec::new(),
            settings: Settings::default(),
            lighting: Lighting::default(),
        };
        Store {
            version: 1,
            active: profile.id.clone(),
            profiles: vec![profile],
        }
    }

    pub fn active_profile(&self) -> Option<&Profile> {
        self.profiles.iter().find(|p| p.id == self.active)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

pub fn store_path(data_dir: &Path) -> PathBuf {
    data_dir.join("profiles.json")
}

pub fn load_store(data_dir: &Path) -> Result<Store, StoreError> {
    let path = store_path(data_dir);
    if !path.exists() {
        return Ok(Store::new_default());
    }
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn save_store(data_dir: &Path, store: &Store) -> Result<(), StoreError> {
    std::fs::create_dir_all(data_dir)?;
    let raw = serde_json::to_string_pretty(store)?;
    std::fs::write(store_path(data_dir), raw)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_store() -> Store {
        let mut store = Store::new_default();
        store.profiles[0].bindings.push(Binding {
            layer: 0,
            trigger: Trigger::Vk { vk: 0x41 },
            action: Action::Key { mods: 0, vk: 0x42 },
            enabled: true,
        });
        store.profiles[0].bindings.push(Binding {
            layer: 1,
            trigger: Trigger::Combo {
                mods: MOD_CTRL,
                vk: 0x43,
            },
            action: Action::Macro {
                id: 7,
                play: MacroPlay::WhileHeld,
            },
            enabled: true,
        });
        store.profiles[0].macros.push(Macro {
            id: 7,
            name: "greet".to_string(),
            events: vec![
                MacroEvent::KeyDown { vk: 0x48 },
                MacroEvent::Delay { ms: 50 },
                MacroEvent::KeyUp { vk: 0x48 },
            ],
        });
        store
    }

    #[test]
    fn store_round_trips_through_json() {
        let store = sample_store();
        let json = serde_json::to_string(&store).unwrap();
        let back: Store = serde_json::from_str(&json).unwrap();
        assert_eq!(store, back);
    }

    #[test]
    fn missing_file_yields_default_store() {
        let dir = std::env::temp_dir().join("ak820-companion-test-missing");
        let _ = std::fs::remove_dir_all(&dir);
        let store = load_store(&dir).unwrap();
        assert_eq!(store.profiles.len(), 1);
        assert_eq!(store.active, "default");
    }

    #[test]
    fn save_then_load_round_trips() {
        let dir = std::env::temp_dir().join("ak820-companion-test-round");
        let _ = std::fs::remove_dir_all(&dir);
        let store = sample_store();
        save_store(&dir, &store).unwrap();
        let back = load_store(&dir).unwrap();
        assert_eq!(store, back);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn default_panic_combo_is_ctrl_alt_esc() {
        let settings = Settings::default();
        assert_eq!(
            settings.panic_combo,
            Trigger::Combo {
                mods: MOD_CTRL | MOD_ALT,
                vk: 0x1B
            }
        );
    }

    #[test]
    fn layer_keys_map_to_vk_codes() {
        assert_eq!(LayerKey::CapsLock.vk(), Some(0x14));
        assert_eq!(LayerKey::RightAlt.vk(), Some(0xA5));
        assert_eq!(LayerKey::ScrollLock.vk(), Some(0x91));
        assert_eq!(LayerKey::None.vk(), None);
    }
}
