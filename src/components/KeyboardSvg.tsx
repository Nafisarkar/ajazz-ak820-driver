import { BOARD, KEYS } from '../data/layout'
import { hidToVk } from '../data/hidToVk'

interface Props {
  /** vk -> short binding summary (undefined = unbound) */
  bindings: Map<number, string>
  selected: number | null
  onSelect: (vk: number) => void
}

export function KeyboardSvg({ bindings, selected, onSelect }: Props) {
  return (
    <svg
      viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
      className="w-full select-none"
      role="group"
      aria-label="Keyboard layout"
    >
      {KEYS.map((key) => {
        const vk = hidToVk(key.hid)
        const bound = vk !== null ? bindings.get(vk) : undefined
        const isSelected = vk !== null && vk === selected
        const clickable = vk !== null && key.name !== 'Fn'
        const fill = isSelected ? '#0ea5e9' : bound ? '#1e3a5f' : '#27272a'
        const stroke = isSelected ? '#38bdf8' : bound ? '#0ea5e9' : '#3f3f46'
        return (
          <g
            key={`${key.row}-${key.col}`}
            onClick={() => clickable && vk !== null && onSelect(vk)}
            className={clickable ? 'cursor-pointer' : 'cursor-not-allowed'}
          >
            <rect
              x={key.x}
              y={key.y}
              width={key.w}
              height={key.h}
              rx={0}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.2}
            />
            <text
              x={key.x + key.w / 2}
              y={key.y + key.h / 2 + 3}
              textAnchor="middle"
              fontSize={key.w > 40 ? 9 : 8}
              fill={key.name === 'Fn' ? '#71717a' : '#e4e4e7'}
            >
              {key.name}
            </text>
            {bound && (
              <text
                x={key.x + key.w / 2}
                y={key.y + key.h - 3}
                textAnchor="middle"
                fontSize={6}
                fill="#7dd3fc"
              >
                {bound.length > 12 ? `${bound.slice(0, 11)}…` : bound}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
