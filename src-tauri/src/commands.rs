use std::sync::atomic::Ordering;

use tauri::State;

use crate::platform;
use crate::platform::windows::vk;
use crate::profile::{Lighting, MacroEvent, MacroPlay, Profile, Store};
use crate::state::AppState;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub enabled: bool,
    pub elevated: bool,
    pub recording: bool,
    pub playing: bool,
    pub active_id: String,
    pub profile_count: usize,
    pub binding_count: usize,
    pub macro_count: usize,
    pub version: String,
    pub hook: platform::hook::HookHealth,
}

#[tauri::command]
pub fn get_status(state: State<'_, AppState>) -> Status {
    let summary = state.summary();
    Status {
        enabled: state.is_enabled(),
        elevated: platform::windows::is_elevated(),
        recording: state.recording.load(Ordering::Relaxed),
        playing: platform::macros::is_playing(),
        active_id: summary.active_id,
        profile_count: summary.profile_count,
        binding_count: summary.binding_count,
        macro_count: summary.macro_count,
        version: env!("CARGO_PKG_VERSION").to_string(),
        hook: platform::hook::health(),
    }
}

#[tauri::command]
pub fn set_trace(enabled: bool) {
    platform::hook::set_trace(enabled);
}

#[tauri::command]
pub fn get_hook_health() -> platform::hook::HookHealth {
    platform::hook::health()
}

#[tauri::command]
pub fn apply_lighting(lighting: Lighting) -> Result<(), String> {
    crate::lighting::apply(lighting)
}

#[tauri::command]
pub fn save_lighting(state: State<'_, AppState>) -> Result<(), String> {
    let store = state.snapshot();
    if let Some(profile) = store.active_profile() {
        crate::lighting::apply(profile.lighting)?;
    }
    crate::lighting::save()
}

#[tauri::command]
pub fn read_lighting_status() -> Result<String, String> {
    crate::lighting::read_status()
}

#[tauri::command]
pub fn get_store(state: State<'_, AppState>) -> Store {
    state.snapshot()
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogEntry {
    pub value: u32,
    pub label: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Catalog {
    pub media: Vec<CatalogEntry>,
    pub mouse: Vec<CatalogEntry>,
    pub key_names: Vec<CatalogEntry>,
}

/// Names and option lists the UI needs — single source of truth in `vk.rs`.
#[tauri::command]
pub fn get_catalog() -> Catalog {
    Catalog {
        media: vk::MEDIA_KEYS
            .iter()
            .map(|(value, label)| CatalogEntry {
                value: *value as u32,
                label: (*label).to_string(),
            })
            .collect(),
        mouse: vk::MOUSE_BUTTONS
            .iter()
            .map(|(value, label)| CatalogEntry {
                value: *value as u32,
                label: (*label).to_string(),
            })
            .collect(),
        key_names: (0u16..=0xFF)
            .map(|code| CatalogEntry {
                value: code as u32,
                label: vk::key_name(code),
            })
            .collect(),
    }
}

#[tauri::command]
pub fn set_enabled(state: State<'_, AppState>, enabled: bool) {
    if !enabled {
        platform::hook::release_pending();
    }
    state.set_enabled(enabled);
}

#[tauri::command]
pub fn save_profile(state: State<'_, AppState>, profile: Profile) -> Result<Store, String> {
    {
        let mut store = state.store.lock().unwrap();
        match store.profiles.iter_mut().find(|p| p.id == profile.id) {
            Some(existing) => *existing = profile,
            None => store.profiles.push(profile),
        }
    }
    state.publish();
    state.save().map_err(|e| e.to_string())?;
    Ok(state.snapshot())
}

#[tauri::command]
pub fn create_profile(state: State<'_, AppState>, name: String) -> Result<Store, String> {
    let id = format!(
        "p{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    {
        let mut store = state.store.lock().unwrap();
        let mut profile = crate::profile::Store::new_default().profiles.remove(0);
        profile.id = id;
        profile.name = name;
        store.profiles.push(profile);
    }
    state.save().map_err(|e| e.to_string())?;
    Ok(state.snapshot())
}

#[tauri::command]
pub fn delete_profile(state: State<'_, AppState>, id: String) -> Result<Store, String> {
    {
        let mut store = state.store.lock().unwrap();
        if store.profiles.len() <= 1 {
            return Err("cannot delete the last profile".to_string());
        }
        store.profiles.retain(|p| p.id != id);
        if store.active == id {
            store.active = store.profiles[0].id.clone();
        }
    }
    state.publish();
    state.save().map_err(|e| e.to_string())?;
    Ok(state.snapshot())
}

#[tauri::command]
pub fn set_active_profile(state: State<'_, AppState>, id: String) -> Result<Store, String> {
    {
        let mut store = state.store.lock().unwrap();
        if !store.profiles.iter().any(|p| p.id == id) {
            return Err(format!("unknown profile: {id}"));
        }
        store.active = id;
    }
    state.publish();
    state.save().map_err(|e| e.to_string())?;
    Ok(state.snapshot())
}

#[tauri::command]
pub fn start_recording(state: State<'_, AppState>) {
    state.recorded.lock().unwrap().clear();
    state.recording.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub fn stop_recording(state: State<'_, AppState>) -> Vec<MacroEvent> {
    state.recording.store(false, Ordering::Relaxed);
    std::mem::take(&mut *state.recorded.lock().unwrap())
}

#[tauri::command]
pub fn play_macro(state: State<'_, AppState>, id: u32) -> Result<(), String> {
    let store = state.snapshot();
    let profile = store.active_profile().ok_or("no active profile")?;
    let mac = profile
        .macros
        .iter()
        .find(|m| m.id == id)
        .ok_or("macro not found")?;
    platform::macros::start(mac.events.clone(), MacroPlay::Once, 0);
    Ok(())
}

#[tauri::command]
pub fn stop_macro() {
    platform::macros::cancel_active();
}

#[tauri::command]
pub fn export_store(state: State<'_, AppState>) -> Result<String, String> {
    serde_json::to_string_pretty(&state.snapshot()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_store(state: State<'_, AppState>, json: String) -> Result<Store, String> {
    let parsed: Store = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    if parsed.profiles.is_empty() {
        return Err("imported data contains no profiles".to_string());
    }
    *state.store.lock().unwrap() = parsed;
    state.publish();
    state.save().map_err(|e| e.to_string())?;
    Ok(state.snapshot())
}
