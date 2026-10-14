import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

/** Best-effort VK for a captured keystroke in the UI (remap targets). */
export function vkFromEvent(event: ReactKeyboardEvent): number | null {
  const key = event.key
  if (key.length === 1) {
    const upper = key.toUpperCase()
    if (upper >= 'A' && upper <= 'Z') return upper.charCodeAt(0)
    if (key >= '0' && key <= '9') return key.charCodeAt(0)
  }
  const byName: Record<string, number> = {
    Escape: 0x1b,
    Enter: 0x0d,
    Tab: 0x09,
    Backspace: 0x08,
    ' ': 0x20,
    ArrowLeft: 0x25,
    ArrowUp: 0x26,
    ArrowRight: 0x27,
    ArrowDown: 0x28,
    Home: 0x24,
    End: 0x23,
    PageUp: 0x21,
    PageDown: 0x22,
    Insert: 0x2d,
    Delete: 0x2e,
    PrintScreen: 0x2c,
    ScrollLock: 0x91,
    Pause: 0x13,
    CapsLock: 0x14,
    Shift: 0xa0,
    Control: 0xa2,
    Alt: 0xa4,
    Meta: 0x5b,
    ContextMenu: 0x5d,
    '-': 0xbd,
    '=': 0xbb,
    '[': 0xdb,
    ']': 0xdd,
    '\\': 0xdc,
    ';': 0xba,
    "'": 0xde,
    '`': 0xc0,
    ',': 0xbc,
    '.': 0xbe,
    '/': 0xbf,
  }
  if (key in byName) return byName[key]
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) return 0x6f + Number(key.slice(1))
  return null
}

/** Modifier bits held during the captured keystroke. */
export function modsFromEvent(event: ReactKeyboardEvent): number {
  let mods = 0
  if (event.ctrlKey) mods |= 0x01
  if (event.shiftKey) mods |= 0x02
  if (event.altKey) mods |= 0x04
  if (event.metaKey) mods |= 0x08
  return mods
}
