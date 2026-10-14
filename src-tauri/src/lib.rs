mod commands;
mod lighting;
mod logging;
mod platform;
mod profile;
mod state;

use std::sync::atomic::Ordering;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir).ok();
            logging::init(data_dir.join("companion.log"));
            logging::info(&format!("app data dir: {}", data_dir.display()));
            let state = AppState::load(data_dir);
            let (config, recording, recorded) = (
                state.config.clone(),
                state.recording.clone(),
                state.recorded.clone(),
            );
            app.manage(state);
            platform::hook::start(config, recording, recorded)
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;

            let toggle = MenuItem::with_id(app, "toggle", "Enable remapping", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show window", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &show, &quit])?;
            let mut builder = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .tooltip("AK820 Companion")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        let state = app.state::<AppState>();
                        let next = !state.is_enabled();
                        if !next {
                            platform::hook::release_pending();
                        }
                        state.set_enabled(next);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon().cloned() {
                builder = builder.icon(icon);
            }
            builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window keeps the remapper running in the tray.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_status,
            commands::get_store,
            commands::get_catalog,
            commands::get_hook_health,
            commands::set_trace,
            commands::apply_lighting,
            commands::save_lighting,
            commands::read_lighting_status,
            commands::set_enabled,
            commands::save_profile,
            commands::create_profile,
            commands::delete_profile,
            commands::set_active_profile,
            commands::start_recording,
            commands::stop_recording,
            commands::play_macro,
            commands::stop_macro,
            commands::export_store,
            commands::import_store,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AK820 Companion");
}

/// Re-exported for the tray toggle path.
pub fn is_enabled(state: &AppState) -> bool {
    state.enabled.load(Ordering::Relaxed)
}
