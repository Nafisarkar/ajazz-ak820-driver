//! Macro playback: runs on a worker thread, cancellable at any time.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use crate::profile::{MacroEvent, MacroPlay};

use super::inject;

struct Active {
    trigger_vk: u16,
    cancel: Arc<AtomicBool>,
}

static ACTIVE: OnceLock<Mutex<Option<Active>>> = OnceLock::new();

fn slot() -> &'static Mutex<Option<Active>> {
    ACTIVE.get_or_init(|| Mutex::new(None))
}

/// Number of times a macro body runs for a given play mode (u32::MAX = while held).
pub fn iteration_count(play: MacroPlay) -> u32 {
    match play {
        MacroPlay::Once => 1,
        MacroPlay::Repeat { times } => times.max(1),
        MacroPlay::WhileHeld => u32::MAX,
    }
}

pub fn is_playing() -> bool {
    slot().lock().unwrap().is_some()
}

pub fn cancel_active() {
    if let Some(active) = slot().lock().unwrap().take() {
        active.cancel.store(true, Ordering::Relaxed);
    }
}

/// Stop a while-held macro when its trigger key is released.
pub fn cancel_if_trigger(vk: u16) {
    let mut guard = slot().lock().unwrap();
    if let Some(active) = guard.as_ref() {
        if active.trigger_vk == vk {
            active.cancel.store(true, Ordering::Relaxed);
            *guard = None;
        }
    }
}

pub fn start(events: Vec<MacroEvent>, play: MacroPlay, trigger_vk: u16) {
    cancel_active();
    let cancel = Arc::new(AtomicBool::new(false));
    *slot().lock().unwrap() = Some(Active {
        trigger_vk,
        cancel: cancel.clone(),
    });

    let spawned = std::thread::Builder::new()
        .name("ak820-macro".into())
        .spawn(move || {
            let iterations = iteration_count(play);
            'outer: for _ in 0..iterations {
                for event in &events {
                    if cancel.load(Ordering::Relaxed) {
                        break 'outer;
                    }
                    match *event {
                        MacroEvent::KeyDown { vk } => inject::key(vk, true),
                        MacroEvent::KeyUp { vk } => inject::key(vk, false),
                        MacroEvent::MouseDown { button } => inject::mouse(button, true),
                        MacroEvent::MouseUp { button } => inject::mouse(button, false),
                        MacroEvent::Delay { ms } => sleep_interruptible(ms, &cancel),
                    }
                }
            }
            let mut guard = slot().lock().unwrap();
            let ours = guard
                .as_ref()
                .map(|a| Arc::ptr_eq(&a.cancel, &cancel))
                .unwrap_or(false);
            if ours {
                *guard = None;
            }
        });

    if spawned.is_err() {
        cancel_active();
    }
}

/// Sleep in small slices so cancellation is responsive.
fn sleep_interruptible(ms: u32, cancel: &AtomicBool) {
    let mut left = ms;
    while left > 0 && !cancel.load(Ordering::Relaxed) {
        let slice = left.min(10);
        std::thread::sleep(Duration::from_millis(slice as u64));
        left -= slice;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn once_runs_a_single_iteration() {
        assert_eq!(iteration_count(MacroPlay::Once), 1);
    }

    #[test]
    fn repeat_floors_at_one() {
        assert_eq!(iteration_count(MacroPlay::Repeat { times: 5 }), 5);
        assert_eq!(iteration_count(MacroPlay::Repeat { times: 0 }), 1);
    }

    #[test]
    fn while_held_runs_until_cancelled() {
        assert_eq!(iteration_count(MacroPlay::WhileHeld), u32::MAX);
    }

    #[test]
    fn interruptible_sleep_returns_when_cancelled() {
        let cancel = AtomicBool::new(false);
        let start = std::time::Instant::now();
        std::thread::scope(|scope| {
            scope.spawn(|| {
                std::thread::sleep(Duration::from_millis(20));
                cancel.store(true, Ordering::Relaxed);
            });
            sleep_interruptible(5_000, &cancel);
        });
        assert!(start.elapsed() < Duration::from_secs(1));
    }
}
