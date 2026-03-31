import React from 'react'

interface Props {
  cost: string
  size?: 'sm' | 'md'
}

// Parse "{2}{W}{U}" → ["2","W","U"]
function parseCost(cost: string): string[] {
  const matches = cost.match(/\{([^}]+)\}/g) ?? []
  return matches.map(m => m.slice(1, -1))
}

const COLOR_CLASS: Record<string, string> = {
  W: 'pip-w', U: 'pip-u', B: 'pip-b', R: 'pip-r', G: 'pip-g', C: 'pip-c',
}

export default function ManaCost({ cost, size = 'sm' }: Props) {
  const pips = parseCost(cost)
  const sz = size === 'sm' ? 'w-[14px] h-[14px] text-[8px]' : 'w-[18px] h-[18px] text-[10px]'

  return (
    <span className="inline-flex items-center gap-[2px] flex-wrap">
      {pips.map((pip, i) => {
        const colorClass = COLOR_CLASS[pip] ?? 'pip-x'
        const isNum = /^\d+$/.test(pip) || pip === 'X'
        return (
          <span
            key={i}
            className={`pip ${colorClass} ${sz}`}
            title={pip}
          >
            {isNum ? pip : ''}
          </span>
        )
      })}
    </span>
  )
}
