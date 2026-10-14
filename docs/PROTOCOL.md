# AJAZZ AK820 (wired single-light edition) — USB HID Protocol

Reverse-engineered from a live USBPcap capture of the official vendor app
(`DeviceDriver.exe` Beta 1.0.3.4) driving the real keyboard, 2026-10-14.
The capture and extracted vendor files are **not** part of this repository
(they are vendor artefacts); the config source is the installer's `config.xml`,
`layouts/KB-K102.xml` and `language/1033.lan`.

## Device identity

| Item | Value |
|---|---|
| VID / PID | `0x1A2C` / `0x9605` |
| Product name | "Ajazz AK820 有线单光版" (wired single-light: white / ice-blue LEDs) |
| Device type | `101` (same family id as AK820 Pro config schema) |
| Interfaces | MI_00 = standard keyboard, MI_01 = 7 collections (consumer, system ctrl, vendor) |
| Command channel | **HID feature reports, Report ID `0x07`, on interface MI_01** |
| Typing channel | MI_00 interrupt IN, 8-byte standard boot-report layout |
| Vendor event echo | MI_01 also echoes pressed keys on its interrupt IN endpoint (8-byte, usage at byte 2) |

The board is **not** in the Sonix `04 xx` 64-byte command family used by the AK820 Pro
(`0C45:8009`). Different vendor, much simpler protocol.

## Transport (verified)

- Windows HID `SET_REPORT` (bRequest `0x09`), `wValue = 0x0307` (Feature, report ID 0x07),
  `wIndex = 1` (interface MI_01), `wLength = 8`.
- **Fire-and-forget** — no GET_REPORT ack, no status readback observed.
- WebHID equivalent: `device.sendFeatureReport(0x07, payload7bytes)` on the MI_01 collection
  whose usage page is vendor-defined.

## Lighting command (verified)

```
byte 0    0x07   report ID
byte 1    0xFF   set-command marker
byte 2    0xFF   set-command marker
byte 3    mode   onboard mode number MINUS 1 (0-indexed)
byte 4    brightness 0-4   (UI shows 1-5; XML default_brightness=5 -> wire 0x04)
byte 5    speed      0-4   (XML default_speed=4 -> wire 0x03)
byte 6    0x00
byte 7    0x00
```

Observed packets (time-ordered, from the capture):

```
112.6s  07 FF FF 00 04 03 00 00   app startup (defaults restored: Steady, bright 5, speed 4)
161.5s  07 FF FF 00 04 03 00 00
167.5s  07 FF FF 02 04 03 00 00   Breathing selected (XML mode 3 -> wire 2)
177-185 07 FF FF 02 0{2,1,0} 03   brightness clicks (5->3->2->1)
194.7s  07 FF FF 02 04 03 00 00   brightness back to max
203-211 07 FF FF 02 04 0{4,3,2,1,0}  speed clicks
215.7s  07 FF FF 00 04 03 00 00   Steady selected (XML mode 1 -> wire 0)
470.5s  07 F0 AA 00 00 00 00 00   SAVE/COMMIT, sent once at app close
```

### Modes

From `KB-K102.xml` + `language/1033.lan` (wire byte = mode - 1):

| wire | mode | name |
|---|---|---|
| 0x00 | 1 | Steady |
| 0x01 | 2 | Custom mode (disabled in XML) |
| 0x02 | 3 | Breathing |
| 0x03 | 4 | Press and destroy |
| 0x04 | 5 | Neon_stream (default) |
| 0x05 | 6 | Streamer |
| 0x06 | 7 | Flowing light and color |
| 0x07 | 8 | Dripping ripples |
| 0x08 | 9 | Brilliant point |
| 0x09 | 10 | Flash away |
| 0x0A | 11 | Shadow_disappear |
| 0x0B | 12 | Ripples shining |
| 0x0C | 13 | Rich and honored |
| 0x0D | 14 | Marquee effect |
| 0x0E | 15 | Rotating storm |
| 0x0F | 16 | Serpentine horse race |
| 0x10 | 17 | Stars twinkle |
| 0x11 | 18 | Retro_snake |
| 0x12 | 19 | Diagonal transformation |
| 0x13 | 20 | Sine wave |
| 0x14 | 21 | Music (name id 100, attribute 512) |

Only modes 0x00 and 0x02 are capture-verified; the mode-1 mapping is a single
consistent hypothesis (Steady=1→0, Breathing=3→2). Verify the rest live in Phase 4.

### Save/commit

`07 F0 AA 00 00 00 00 00` — sent exactly once, immediately before app exit.
The `AA` marker matches the family convention (`AA 55` end markers on AK820 Pro).

## Keymap / Macros / System settings — host-side only (proven)

In the entire capture (including keymap remap, macro record+bind, Win-key toggle,
factory reset performed in the UI) **zero** host→keyboard writes occurred besides
the lighting reports above. The vendor app's own SQLite DB
(`%LOCALAPPDATA%\Ajazz AK820 Files\db\Ajazz AK820_data_v1.db`) ended the session with
`t_key_macro_data`, `t_macro_data`, `t_key_otherdata`, `t_key_light_data` all **empty**
and `disable_win/alttab/altf4 = 0`.

The vendor PDB confirms the mechanism: `KeyboardDlg::VHidSendMacroRecord`,
`m_bVHidDevice`, and the bundled `vhidflt.sys` (KMDF Virtual-HID-Framework filter,
already installed and running on the test system). The app:

1. monitors key echoes on the vendor interface (interrupt IN, boot-report layout),
2. looks up bindings in its SQLite DB,
3. injects the remapped/macro keystrokes through the vhidflt virtual keyboard.

Consequence: a browser page cannot reproduce these features (no OS hooks, no
virtual devices from the web), and firmware-side programming was ruled out by
probe — see below.

## Firmware-side keymap support — ruled out by probe (2026-10-14)

Live WebHID probes against the connected board:

| Probe | Result |
|---|---|
| feature report ID 0 (default report) | `Failed to write the feature report` — no default report exists |
| output report ID 0 | `Failed to write the report` — device has no output reports |
| feature report ID 7, 64-byte payload | accepted, truncated to the 8-byte report (silently discards the rest) |

The HID descriptor exposes exactly one usable pipe: **feature report 0x07, 8 bytes**.
The AK820-Pro `04 xx` 64-byte command family therefore cannot be delivered to this
firmware. Firmware-side keymap/macro programming: **not available on this hardware**.

### Feature report 0x07 is readable (bonus, undocumented)

`receiveFeatureReport(0x07)` succeeds and returns (Chrome includes the report ID):

```
07 01 16 00 00 00 00 00
```

The vendor app never performs a GET_REPORT — all 15 writes in the capture were
fire-and-forget. The layout of this status block is **not decoded** (byte 1 = 0x01,
byte 2 varied per session; unrelated to the write layout). Decode it by reading
before/after a known mode change if a status readback is wanted.

The byte-1 value `0x01` also means a read-back is never a command ACK on this
hardware, so no ACK-based command protocol should be assumed.

## Per-key custom light (unverified)

`t_key_light_data(keylight_id, profile, light_id, key_code, key_rgb)` exists in the
vendor DB (0 rows in this capture) and the UI has a Custom Light page. Wire encoding
unknown — likely another report ID on the same feature pipe. Experiment in Phase 4.

## Capture inventory (side channels ruled out)

| Endpoint | Packets | Role |
|---|---|---|
| 1.3.0 control | 19 out / 19 in | enumeration + ALL vendor SET_REPORTs |
| 1.3.1 interrupt IN | 74 | key echoes (boot report layout) |
| 1.2.3 interrupt IN | 81k | unrelated device idle polling |
| 1.1.2 isochronous | 8.4k | unrelated audio device |

No interrupt-OUT endpoints exist on the keyboard; no bulk endpoints; no `04 xx`
commands ever sent.
