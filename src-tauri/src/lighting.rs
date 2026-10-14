//! Lighting control for the AK820 over HID.
//!
//! Verified protocol (see ../ak820-web/docs/PROTOCOL.md): the board exposes a
//! single 8-byte feature report, ID 0x07, on the MI_01 vendor collection.
//!
//!   [0]=0x07 report ID  [1]=0xFF  [2]=0xFF  [3]=mode-1  [4]=brightness-1
//!   [5]=speed-1         [6]=0     [7]=0
//!
//! Commit (persist to the keyboard): 0x07 0xF0 0xAA 0x00 0x00 0x00 0x00 0x00

use hidapi::{HidApi, HidDevice};

use crate::logging;
use crate::profile::Lighting;

const VENDOR_ID: u16 = 0x1a2c;
const PRODUCT_ID: u16 = 0x9605;
const REPORT_ID: u8 = 0x07;

fn open() -> Result<HidDevice, String> {
    let api = HidApi::new().map_err(|e| format!("HID init failed: {e}"))?;
    let mut candidates: Vec<_> = api
        .device_list()
        .filter(|d| d.vendor_id() == VENDOR_ID && d.product_id() == PRODUCT_ID)
        .collect();
    if candidates.is_empty() {
        return Err(format!(
            "AK820 not found (VID {VENDOR_ID:04X}, PID {PRODUCT_ID:04X}) — is it plugged in?"
        ));
    }
    // The command collection is vendor-defined on MI_01; prefer a vendor usage
    // page, then interface 1.
    candidates.sort_by_key(|d| {
        let vendor_page = if d.usage_page() >= 0xff00 { 0 } else { 1 };
        let interface = if d.interface_number() == 1 { 0 } else { 1 };
        (vendor_page, interface)
    });
    let info = candidates[0];
    logging::info(&format!(
        "lighting: opening {} (interface {}, usage page {:#06x})",
        info.path().to_string_lossy(),
        info.interface_number(),
        info.usage_page()
    ));
    api.open_path(info.path())
        .map_err(|e| format!("open failed: {e}"))
}

/// Apply a lighting state to the keyboard (live, not persisted).
pub fn apply(lighting: Lighting) -> Result<(), String> {
    let device = open()?;
    let payload = [
        REPORT_ID,
        0xff,
        0xff,
        lighting.mode.saturating_sub(1),
        lighting.brightness.saturating_sub(1),
        lighting.speed.saturating_sub(1),
        0,
        0,
    ];
    device
        .send_feature_report(&payload)
        .map_err(|e| format!("send failed: {e}"))?;
    logging::info(&format!(
        "lighting: mode {} brightness {} speed {}",
        lighting.mode, lighting.brightness, lighting.speed
    ));
    Ok(())
}

/// Persist the current state so it survives power-off.
pub fn save() -> Result<(), String> {
    let device = open()?;
    device
        .send_feature_report(&[REPORT_ID, 0xf0, 0xaa, 0, 0, 0, 0, 0])
        .map_err(|e| format!("save failed: {e}"))?;
    logging::info("lighting: state committed to keyboard");
    Ok(())
}

/// Read the board's status report (layout not decoded; shown raw).
pub fn read_status() -> Result<String, String> {
    let device = open()?;
    let mut buffer = [0u8; 8];
    buffer[0] = REPORT_ID;
    let read = device
        .get_feature_report(&mut buffer)
        .map_err(|e| format!("read failed: {e}"))?;
    Ok(buffer[..read]
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<Vec<_>>()
        .join(" "))
}
