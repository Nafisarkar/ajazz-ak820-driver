import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

// Regenerates src/data/layout.ts from the vendor keyboard layout XML.
//
//   bun run tools/gen-layout.ts <path-to-KB-K102.xml>
//
// The vendor layout file is NOT part of this repository (it ships inside the
// official installer). Only the extracted key geometry ends up in the output;
// no vendor artwork or assets are copied.
const XML = process.argv[2]
if (!XML) {
  console.error('usage: bun run tools/gen-layout.ts <path-to-KB-K102.xml>')
  process.exit(1)
}
const OUT = new URL('../src/data/layout.ts', import.meta.url).pathname.replace(/^\//, '')

const xml = readFileSync(XML, 'utf8')

const keyRe = /<key\s+code="(0x[0-9a-fA-F]+)"\s+name="([^"]*)"\s+desc="([^"]*)"\s+key_index="(\d+)"[^>]*row_col="(\d+)#(\d+)"\s*rect=\s*"([^"]*)"/g

interface KeyDef {
  name: string
  hid: number
  index: number
  row: number
  col: number
  x: number
  y: number
  w: number
  h: number
}

const keys: KeyDef[] = []
const seen = new Set<string>()

let m: RegExpExecArray | null
while ((m = keyRe.exec(xml))) {
  const [, code, name, , index, row, col, rect] = m
  const nums = rect
    .split('#')
    .map((s) => Number(s.trim()))
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) continue
  const [x, y, w, h] = nums
  if (w === 0 || h === 0) continue // numpad aliases not present on this board
  const id = `${row}#${col}`
  if (seen.has(id)) continue
  seen.add(id)
  const clean = name
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  keys.push({ name: clean, hid: parseInt(code, 16), index: Number(index), row: Number(row), col: Number(col), x, y, w, h })
}

keys.sort((a, b) => (a.row - b.row) || (a.col - b.col) || (a.x - b.x))

const banner = `// Generated from the vendor layout KB-K102.xml (key geometry only — no vendor artwork).
// Regenerate with: bun tools/gen-layout.ts

export interface KeyDef {
  /** Label drawn on the keycap */
  name: string
  /** Default HID usage of the physical key */
  hid: number
  /** Vendor key index (lighting index; not used for host-side remapping) */
  index: number
  row: number
  col: number
  x: number
  y: number
  w: number
  h: number
}

/** Board drawing area in layout units. */
export const BOARD = { width: 600, height: 291 } as const

export const KEYS: KeyDef[] = ${JSON.stringify(keys, null, 2)}
`

mkdirSync('f:/Dev/Test/ak820-companion/src/data', { recursive: true })
writeFileSync(OUT, banner)
console.log(`wrote ${keys.length} keys to ${OUT}`)
