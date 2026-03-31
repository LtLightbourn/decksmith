import React, { useState } from 'react'
import type { DeckCard } from '../../types'
import DeckCardRow from './DeckCardRow'

interface Props {
  name: string
  cards: DeckCard[]
}

export default function DeckSection({ name, cards }: Props) {
  const [open, setOpen] = useState(true)
  if (cards.length === 0) return null

  const total = cards.reduce((s, dc) => s + dc.qty, 0)

  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-[4px] border-b border-t"
        style={{
          background: 'rgba(16,12,8,0.7)',
          borderColor: 'rgba(50,42,28,0.5)',
        }}
      >
        <span
          className="text-[9px] font-cinzel uppercase tracking-[2px]"
          style={{ color: '#8a7040' }}
        >
          {name}
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(120,95,55,0.35), transparent)' }} />
        <span className="text-[9px] font-cinzel" style={{ color: '#5a5040' }}>
          {total}
        </span>
        <span className="text-[9px]" style={{ color: '#5a5040' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {/* Cards */}
      {open && cards.map(dc => (
        <DeckCardRow key={dc.card.id} dc={dc} />
      ))}
    </div>
  )
}
