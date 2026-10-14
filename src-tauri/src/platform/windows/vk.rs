//! Virtual-key constants and helpers shared by the hook and injector.

use crate::profile::{MOD_ALT, MOD_CTRL, MOD_SHIFT, MOD_WIN};

pub const VK_ESCAPE: u16 = 0x1B;
pub const VK_CAPITAL: u16 = 0x14;
pub const VK_SCROLL: u16 = 0x91;
pub const VK_RMENU: u16 = 0xA5;

pub const VK_LCONTROL: u16 = 0xA2;
pub const VK_RCONTROL: u16 = 0xA3;
pub const VK_LSHIFT: u16 = 0xA0;
pub const VK_RSHIFT: u16 = 0xA1;
pub const VK_LMENU: u16 = 0xA4;
pub const VK_LWIN: u16 = 0x5B;
pub const VK_RWIN: u16 = 0x5C;
pub const VK_CONTROL: u16 = 0x11;
pub const VK_SHIFT: u16 = 0x10;
pub const VK_MENU: u16 = 0x12;

pub const VK_MEDIA_NEXT_TRACK: u16 = 0xB0;
pub const VK_MEDIA_PREV_TRACK: u16 = 0xB1;
pub const VK_MEDIA_STOP: u16 = 0xB2;
pub const VK_MEDIA_PLAY_PAUSE: u16 = 0xB3;
pub const VK_VOLUME_MUTE: u16 = 0xAD;
pub const VK_VOLUME_DOWN: u16 = 0xAE;
pub const VK_VOLUME_UP: u16 = 0xAF;
pub const VK_BROWSER_BACK: u16 = 0xA6;
pub const VK_BROWSER_FORWARD: u16 = 0xA7;
pub const VK_BROWSER_REFRESH: u16 = 0xA8;
pub const VK_BROWSER_HOME: u16 = 0xAC;

/// Modifier bit sets paired with the left-hand virtual key used to emit them.
pub const MOD_SETS: [(u8, u16); 4] = [
    (MOD_CTRL, VK_LCONTROL),
    (MOD_SHIFT, VK_LSHIFT),
    (MOD_ALT, VK_LMENU),
    (MOD_WIN, VK_LWIN),
];

/// Modifier bit for a virtual key (0 when the key is not a modifier).
pub fn modifier_bit(vk: u16) -> u8 {
    match vk {
        VK_LCONTROL | VK_RCONTROL | VK_CONTROL => MOD_CTRL,
        VK_LSHIFT | VK_RSHIFT | VK_SHIFT => MOD_SHIFT,
        VK_LMENU | VK_RMENU | VK_MENU => MOD_ALT,
        VK_LWIN | VK_RWIN => MOD_WIN,
        _ => 0,
    }
}

/// Keys that Windows expects to be flagged as extended when injected.
pub fn is_extended(vk: u16) -> bool {
    matches!(
        vk,
        VK_RCONTROL
            | VK_RMENU
            | VK_LWIN
            | VK_RWIN
            | 0x21..=0x23   // PgUp, PgDn, End
            | 0x24..=0x28   // Home, arrows
            | 0x2D | 0x2E   // Insert, Delete
            | 0x5D          // Apps/Menu
            | 0x6F | 0x90
            | 0xAD..=0xB3   // volume / media keys
            | 0xA6..=0xAC   // browser keys
    )
}

/// Media/browser keys offered by the action picker.
pub const MEDIA_KEYS: [(u16, &str); 12] = [
    (VK_MEDIA_PLAY_PAUSE, "Play / Pause"),
    (VK_MEDIA_NEXT_TRACK, "Next track"),
    (VK_MEDIA_PREV_TRACK, "Previous track"),
    (VK_MEDIA_STOP, "Stop"),
    (VK_VOLUME_UP, "Volume up"),
    (VK_VOLUME_DOWN, "Volume down"),
    (VK_VOLUME_MUTE, "Mute"),
    (VK_BROWSER_BACK, "Browser back"),
    (VK_BROWSER_FORWARD, "Browser forward"),
    (VK_BROWSER_REFRESH, "Browser refresh"),
    (VK_BROWSER_HOME, "Browser home"),
    (0x5F, "Sleep"),
];

/// Mouse buttons offered by the action picker (mask, label).
pub const MOUSE_BUTTONS: [(u8, &str); 5] = [
    (1, "Left click"),
    (2, "Right click"),
    (4, "Middle click"),
    (8, "Mouse 4 (back)"),
    (16, "Mouse 5 (forward)"),
];

/// Human-readable name for a virtual key, used for binding summaries.
pub fn key_name(vk: u16) -> String {
    if let Some((_, label)) = MEDIA_KEYS.iter().find(|(code, _)| *code == vk) {
        return (*label).to_string();
    }
    match vk {
        0x08 => "Backspace".into(),
        0x09 => "Tab".into(),
        0x0D => "Enter".into(),
        0x10 => "Shift".into(),
        0x11 => "Ctrl".into(),
        0x12 => "Alt".into(),
        0x13 => "Pause".into(),
        VK_CAPITAL => "CapsLock".into(),
        VK_ESCAPE => "Esc".into(),
        0x20 => "Space".into(),
        0x21 => "PageUp".into(),
        0x22 => "PageDown".into(),
        0x23 => "End".into(),
        0x24 => "Home".into(),
        0x25 => "Left".into(),
        0x26 => "Up".into(),
        0x27 => "Right".into(),
        0x28 => "Down".into(),
        0x2C => "PrintScreen".into(),
        0x2D => "Insert".into(),
        0x2E => "Delete".into(),
        0x5B => "LWin".into(),
        0x5C => "RWin".into(),
        0x5D => "Menu".into(),
        VK_SCROLL => "ScrollLock".into(),
        0x90 => "NumLock".into(),
        VK_LSHIFT => "LShift".into(),
        VK_RSHIFT => "RShift".into(),
        VK_LCONTROL => "LCtrl".into(),
        VK_RCONTROL => "RCtrl".into(),
        VK_LMENU => "LAlt".into(),
        VK_RMENU => "RAlt".into(),
        0xBA => ";".into(),
        0xBB => "=".into(),
        0xBC => ",".into(),
        0xBD => "-".into(),
        0xBE => ".".into(),
        0xBF => "/".into(),
        0xC0 => "`".into(),
        0xDB => "[".into(),
        0xDC => "\\".into(),
        0xDD => "]".into(),
        0xDE => "'".into(),
        _ => {
            if (0x41..=0x5A).contains(&vk) {
                char::from_u32(vk as u32).unwrap_or('?').to_string()
            } else if (0x30..=0x39).contains(&vk) {
                char::from_u32(vk as u32).unwrap_or('?').to_string()
            } else if (0x60..=0x69).contains(&vk) {
                format!("Num{}", vk - 0x60)
            } else if (0x70..=0x87).contains(&vk) {
                format!("F{}", vk - 0x6F)
            } else {
                format!("VK_{vk:02X}")
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modifier_bit_maps_left_and_generic_variants() {
        assert_eq!(modifier_bit(VK_LCONTROL), MOD_CTRL);
        assert_eq!(modifier_bit(VK_CONTROL), MOD_CTRL);
        assert_eq!(modifier_bit(VK_RSHIFT), MOD_SHIFT);
        assert_eq!(modifier_bit(VK_RMENU), MOD_ALT);
        assert_eq!(modifier_bit(VK_LWIN), MOD_WIN);
        assert_eq!(modifier_bit(0x41), 0);
    }

    #[test]
    fn extended_keys_are_flagged() {
        assert!(is_extended(VK_RCONTROL));
        assert!(is_extended(0x25)); // left arrow
        assert!(is_extended(VK_VOLUME_UP));
        assert!(!is_extended(0x41)); // A
        assert!(!is_extended(VK_LCONTROL));
    }

    #[test]
    fn key_names_cover_common_ranges() {
        assert_eq!(key_name(0x41), "A");
        assert_eq!(key_name(0x37), "7");
        assert_eq!(key_name(0x70), "F1");
        assert_eq!(key_name(0x7B), "F12");
        assert_eq!(key_name(VK_ESCAPE), "Esc");
        assert_eq!(key_name(VK_MEDIA_PLAY_PAUSE), "Play / Pause");
        assert_eq!(key_name(0x60), "Num0");
        assert_eq!(key_name(0xFF), "VK_FF");
    }
}
