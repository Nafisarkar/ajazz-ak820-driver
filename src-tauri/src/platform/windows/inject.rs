//! Keystroke/mouse injection through `SendInput`.
//!
//! Every event is tagged with [`MAGIC`] in `dwExtraInfo` so the hook can
//! recognize — and ignore — its own synthetic input (loop prevention).

use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYBD_EVENT_FLAGS,
    KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, MOUSEINPUT, MOUSEEVENTF_LEFTDOWN,
    MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_RIGHTDOWN,
    MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_XDOWN, MOUSEEVENTF_XUP, MOUSE_EVENT_FLAGS, VIRTUAL_KEY,
};

use super::vk;
use super::vk::MOD_SETS;

/// Tag written to `dwExtraInfo` on every injected event.
pub const MAGIC: usize = 0xA820_C0DE;

fn send(inputs: &[INPUT]) -> bool {
    if inputs.is_empty() {
        return true;
    }
    let sent = unsafe { SendInput(inputs, std::mem::size_of::<INPUT>() as i32) };
    sent as usize == inputs.len()
}

fn keyboard_input(vk_code: u16, flags: KEYBD_EVENT_FLAGS) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk_code),
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: MAGIC,
            },
        },
    }
}

fn mouse_input(flags: MOUSE_EVENT_FLAGS, data: u32) -> INPUT {
    INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: data,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: MAGIC,
            },
        },
    }
}

/// Press or release a single key.
pub fn key(vk_code: u16, down: bool) {
    let mut flags = KEYBD_EVENT_FLAGS(0);
    if vk::is_extended(vk_code) {
        flags |= KEYEVENTF_EXTENDEDKEY;
    }
    if !down {
        flags |= KEYEVENTF_KEYUP;
    }
    send(&[keyboard_input(vk_code, flags)]);
}

/// Press a key with modifiers, then release everything in reverse order.
pub fn key_combo(mods: u8, vk_code: u16) {
    let mut inputs = Vec::with_capacity(8);
    let mut held = Vec::with_capacity(4);
    for (bit, mod_vk) in MOD_SETS {
        if mods & bit != 0 {
            let mut flags = KEYBD_EVENT_FLAGS(0);
            if vk::is_extended(mod_vk) {
                flags |= KEYEVENTF_EXTENDEDKEY;
            }
            inputs.push(keyboard_input(mod_vk, flags));
            held.push((mod_vk, flags));
        }
    }
    let mut key_flags = KEYBD_EVENT_FLAGS(0);
    if vk::is_extended(vk_code) {
        key_flags |= KEYEVENTF_EXTENDEDKEY;
    }
    inputs.push(keyboard_input(vk_code, key_flags));
    inputs.push(keyboard_input(vk_code, key_flags | KEYEVENTF_KEYUP));
    for (mod_vk, flags) in held.into_iter().rev() {
        inputs.push(keyboard_input(mod_vk, flags | KEYEVENTF_KEYUP));
    }
    send(&inputs);
}

/// Type a literal string as Unicode input (layout independent).
pub fn text(value: &str) {
    let mut inputs = Vec::with_capacity(value.len() * 2);
    for unit in value.encode_utf16() {
        let down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: unit,
                    dwFlags: KEYEVENTF_UNICODE,
                    time: 0,
                    dwExtraInfo: MAGIC,
                },
            },
        };
        let up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: unit,
                    dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: MAGIC,
                },
            },
        };
        inputs.push(down);
        inputs.push(up);
    }
    send(&inputs);
}

/// Press or release a mouse button. Button mask: 1 left, 2 right, 4 middle,
/// 8 back (X1), 16 forward (X2).
pub fn mouse(button: u8, down: bool) {
    let (flag, data): (MOUSE_EVENT_FLAGS, u32) = match (button & 0b11111, down) {
        (1, true) => (MOUSEEVENTF_LEFTDOWN, 0),
        (1, false) => (MOUSEEVENTF_LEFTUP, 0),
        (2, true) => (MOUSEEVENTF_RIGHTDOWN, 0),
        (2, false) => (MOUSEEVENTF_RIGHTUP, 0),
        (4, true) => (MOUSEEVENTF_MIDDLEDOWN, 0),
        (4, false) => (MOUSEEVENTF_MIDDLEUP, 0),
        (8, true) => (MOUSEEVENTF_XDOWN, 1),
        (8, false) => (MOUSEEVENTF_XUP, 1),
        (16, true) => (MOUSEEVENTF_XDOWN, 2),
        (16, false) => (MOUSEEVENTF_XUP, 2),
        _ => return,
    };
    send(&[mouse_input(flag, data)]);
}
