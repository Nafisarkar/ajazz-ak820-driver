// Generated from the vendor layout KB-K102.xml (key geometry only — no vendor artwork).
// Regenerate with: bun run tools/gen-layout.ts <path-to-KB-K102.xml>

export interface KeyDef {
  /** Label drawn on the keycap */
  name: string
  /** Default HID usage of the physical key */
  hid: number
  /** Vendor key index (lighting index; not used for host-side remapping) */
  index: number
  /** Row/column derived from the key's geometry */
  row: number
  col: number
  x: number
  y: number
  w: number
  h: number
}

/** Board drawing area in layout units. */
export const BOARD = { width: 600, height: 291 } as const

export const KEYS: KeyDef[] = [
  {
    "name": "Esc",
    "hid": 41,
    "index": 0,
    "row": 0,
    "col": 0,
    "x": 17,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F1",
    "hid": 58,
    "index": 12,
    "row": 0,
    "col": 1,
    "x": 60,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F2",
    "hid": 59,
    "index": 18,
    "row": 0,
    "col": 2,
    "x": 94,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F3",
    "hid": 60,
    "index": 24,
    "row": 0,
    "col": 3,
    "x": 129,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F4",
    "hid": 61,
    "index": 30,
    "row": 0,
    "col": 4,
    "x": 163,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F5",
    "hid": 62,
    "index": 36,
    "row": 0,
    "col": 5,
    "x": 207,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F6",
    "hid": 63,
    "index": 42,
    "row": 0,
    "col": 6,
    "x": 241,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F7",
    "hid": 64,
    "index": 48,
    "row": 0,
    "col": 7,
    "x": 276,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F8",
    "hid": 65,
    "index": 54,
    "row": 0,
    "col": 8,
    "x": 310,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F9",
    "hid": 66,
    "index": 60,
    "row": 0,
    "col": 9,
    "x": 353,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F10",
    "hid": 67,
    "index": 66,
    "row": 0,
    "col": 10,
    "x": 388,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F11",
    "hid": 68,
    "index": 72,
    "row": 0,
    "col": 11,
    "x": 422,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "F12",
    "hid": 69,
    "index": 78,
    "row": 0,
    "col": 12,
    "x": 457,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "Del",
    "hid": 76,
    "index": 92,
    "row": 0,
    "col": 13,
    "x": 500,
    "y": 36,
    "w": 32,
    "h": 32
  },
  {
    "name": "`~",
    "hid": 53,
    "index": 1,
    "row": 1,
    "col": 0,
    "x": 17,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "1!",
    "hid": 30,
    "index": 7,
    "row": 1,
    "col": 1,
    "x": 51,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "2@",
    "hid": 31,
    "index": 13,
    "row": 1,
    "col": 2,
    "x": 86,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "3#",
    "hid": 32,
    "index": 19,
    "row": 1,
    "col": 3,
    "x": 120,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "4$",
    "hid": 33,
    "index": 25,
    "row": 1,
    "col": 4,
    "x": 155,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "5%",
    "hid": 34,
    "index": 31,
    "row": 1,
    "col": 5,
    "x": 189,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "6^",
    "hid": 35,
    "index": 37,
    "row": 1,
    "col": 6,
    "x": 224,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "7&",
    "hid": 36,
    "index": 43,
    "row": 1,
    "col": 7,
    "x": 258,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "8*",
    "hid": 37,
    "index": 49,
    "row": 1,
    "col": 8,
    "x": 293,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "9(",
    "hid": 38,
    "index": 55,
    "row": 1,
    "col": 9,
    "x": 327,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "0)",
    "hid": 39,
    "index": 61,
    "row": 1,
    "col": 10,
    "x": 362,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "-_",
    "hid": 45,
    "index": 67,
    "row": 1,
    "col": 11,
    "x": 396,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "=+",
    "hid": 46,
    "index": 73,
    "row": 1,
    "col": 12,
    "x": 431,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "Backspace",
    "hid": 42,
    "index": 79,
    "row": 1,
    "col": 13,
    "x": 465,
    "y": 78,
    "w": 67,
    "h": 32
  },
  {
    "name": "Home",
    "hid": 74,
    "index": 91,
    "row": 1,
    "col": 14,
    "x": 550,
    "y": 78,
    "w": 32,
    "h": 32
  },
  {
    "name": "Tab",
    "hid": 43,
    "index": 2,
    "row": 2,
    "col": 0,
    "x": 17,
    "y": 112,
    "w": 49,
    "h": 32
  },
  {
    "name": "Q",
    "hid": 20,
    "index": 8,
    "row": 2,
    "col": 1,
    "x": 68,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "W",
    "hid": 26,
    "index": 14,
    "row": 2,
    "col": 2,
    "x": 103,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "E",
    "hid": 8,
    "index": 20,
    "row": 2,
    "col": 3,
    "x": 137,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "R",
    "hid": 21,
    "index": 26,
    "row": 2,
    "col": 4,
    "x": 172,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "T",
    "hid": 23,
    "index": 32,
    "row": 2,
    "col": 5,
    "x": 207,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "Y",
    "hid": 28,
    "index": 38,
    "row": 2,
    "col": 6,
    "x": 241,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "U",
    "hid": 24,
    "index": 44,
    "row": 2,
    "col": 7,
    "x": 276,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "I",
    "hid": 12,
    "index": 50,
    "row": 2,
    "col": 8,
    "x": 310,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "O",
    "hid": 18,
    "index": 56,
    "row": 2,
    "col": 9,
    "x": 345,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "P",
    "hid": 19,
    "index": 62,
    "row": 2,
    "col": 10,
    "x": 379,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "[{",
    "hid": 47,
    "index": 68,
    "row": 2,
    "col": 11,
    "x": 414,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "]}",
    "hid": 48,
    "index": 74,
    "row": 2,
    "col": 12,
    "x": 448,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "\\|",
    "hid": 49,
    "index": 80,
    "row": 2,
    "col": 13,
    "x": 483,
    "y": 112,
    "w": 49,
    "h": 32
  },
  {
    "name": "PgUp",
    "hid": 75,
    "index": 97,
    "row": 2,
    "col": 14,
    "x": 550,
    "y": 112,
    "w": 32,
    "h": 32
  },
  {
    "name": "CapsLock",
    "hid": 57,
    "index": 3,
    "row": 3,
    "col": 0,
    "x": 17,
    "y": 147,
    "w": 58,
    "h": 32
  },
  {
    "name": "A",
    "hid": 4,
    "index": 9,
    "row": 3,
    "col": 1,
    "x": 77,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "S",
    "hid": 22,
    "index": 15,
    "row": 3,
    "col": 2,
    "x": 112,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "D",
    "hid": 7,
    "index": 21,
    "row": 3,
    "col": 3,
    "x": 146,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "F",
    "hid": 9,
    "index": 27,
    "row": 3,
    "col": 4,
    "x": 181,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "G",
    "hid": 10,
    "index": 33,
    "row": 3,
    "col": 5,
    "x": 215,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "H",
    "hid": 11,
    "index": 39,
    "row": 3,
    "col": 6,
    "x": 250,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "J",
    "hid": 13,
    "index": 45,
    "row": 3,
    "col": 7,
    "x": 284,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "K",
    "hid": 14,
    "index": 51,
    "row": 3,
    "col": 8,
    "x": 319,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "L",
    "hid": 15,
    "index": 57,
    "row": 3,
    "col": 9,
    "x": 353,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": ";:",
    "hid": 51,
    "index": 63,
    "row": 3,
    "col": 10,
    "x": 388,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "'\"",
    "hid": 52,
    "index": 69,
    "row": 3,
    "col": 11,
    "x": 422,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "Enter",
    "hid": 40,
    "index": 81,
    "row": 3,
    "col": 12,
    "x": 457,
    "y": 147,
    "w": 77,
    "h": 32
  },
  {
    "name": "PgDn",
    "hid": 78,
    "index": 92,
    "row": 3,
    "col": 13,
    "x": 550,
    "y": 147,
    "w": 32,
    "h": 32
  },
  {
    "name": "Shift",
    "hid": 225,
    "index": 4,
    "row": 4,
    "col": 0,
    "x": 17,
    "y": 181,
    "w": 75,
    "h": 32
  },
  {
    "name": "Z",
    "hid": 29,
    "index": 10,
    "row": 4,
    "col": 1,
    "x": 94,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "X",
    "hid": 27,
    "index": 16,
    "row": 4,
    "col": 2,
    "x": 129,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "C",
    "hid": 6,
    "index": 22,
    "row": 4,
    "col": 3,
    "x": 163,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "V",
    "hid": 25,
    "index": 28,
    "row": 4,
    "col": 4,
    "x": 198,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "B",
    "hid": 5,
    "index": 34,
    "row": 4,
    "col": 5,
    "x": 232,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "N",
    "hid": 17,
    "index": 40,
    "row": 4,
    "col": 6,
    "x": 267,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "M",
    "hid": 16,
    "index": 46,
    "row": 4,
    "col": 7,
    "x": 301,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": ",<",
    "hid": 54,
    "index": 52,
    "row": 4,
    "col": 8,
    "x": 336,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": ".>",
    "hid": 55,
    "index": 58,
    "row": 4,
    "col": 9,
    "x": 370,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "/?",
    "hid": 56,
    "index": 64,
    "row": 4,
    "col": 10,
    "x": 405,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "Shift",
    "hid": 229,
    "index": 82,
    "row": 4,
    "col": 11,
    "x": 440,
    "y": 181,
    "w": 57,
    "h": 32
  },
  {
    "name": "End",
    "hid": 77,
    "index": 92,
    "row": 4,
    "col": 12,
    "x": 550,
    "y": 181,
    "w": 32,
    "h": 32
  },
  {
    "name": "↑",
    "hid": 82,
    "index": 94,
    "row": 5,
    "col": 0,
    "x": 507,
    "y": 189,
    "w": 32,
    "h": 32
  },
  {
    "name": "Ctrl",
    "hid": 224,
    "index": 5,
    "row": 6,
    "col": 0,
    "x": 17,
    "y": 216,
    "w": 40,
    "h": 32
  },
  {
    "name": "Win",
    "hid": 227,
    "index": 11,
    "row": 6,
    "col": 1,
    "x": 60,
    "y": 216,
    "w": 40,
    "h": 32
  },
  {
    "name": "Alt",
    "hid": 226,
    "index": 17,
    "row": 6,
    "col": 2,
    "x": 103,
    "y": 216,
    "w": 40,
    "h": 32
  },
  {
    "name": "Space",
    "hid": 44,
    "index": 35,
    "row": 6,
    "col": 3,
    "x": 146,
    "y": 216,
    "w": 213,
    "h": 32
  },
  {
    "name": "Alt",
    "hid": 230,
    "index": 53,
    "row": 6,
    "col": 4,
    "x": 362,
    "y": 216,
    "w": 32,
    "h": 32
  },
  {
    "name": "Fn",
    "hid": 255,
    "index": 59,
    "row": 6,
    "col": 5,
    "x": 396,
    "y": 216,
    "w": 32,
    "h": 32
  },
  {
    "name": "Ctrl",
    "hid": 228,
    "index": 83,
    "row": 6,
    "col": 6,
    "x": 431,
    "y": 216,
    "w": 32,
    "h": 32
  },
  {
    "name": "←",
    "hid": 80,
    "index": 89,
    "row": 7,
    "col": 0,
    "x": 473,
    "y": 223,
    "w": 32,
    "h": 32
  },
  {
    "name": "↓",
    "hid": 81,
    "index": 95,
    "row": 7,
    "col": 1,
    "x": 507,
    "y": 223,
    "w": 32,
    "h": 32
  },
  {
    "name": "→",
    "hid": 82,
    "index": 101,
    "row": 7,
    "col": 2,
    "x": 542,
    "y": 223,
    "w": 32,
    "h": 32
  }
]
