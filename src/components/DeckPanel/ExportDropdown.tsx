import React, { useRef, useEffect } from 'react'
import { exportMoxfield, exportMTGO, exportArena, exportPlainText } from '../../utils/deckParser'
import type { Card, DeckCard } from '../../types'

interface Props {
  commander: Card | null
  cards: DeckCard[]
  onClose: () => void
  onToast: (msg: string) => void
}

const FORMATS = [
  { id: 'moxfield', label: 'Moxfield', hint: 'Commander: Name + list' },
  { id: 'mtgo',     label: 'MTGO',     hint: 'Qty CardName (no header)' },
  { id: 'arena',    label: 'Arena',    hint: 'Qty CardName (SET)' },
  { id: 'plain',    label: 'Plain',    hint: 'Grouped by type' },
] as const

type FormatId = typeof FORMATS[number]['id']

function getExportText(format: FormatId, commander: Card | null, cards: DeckCard[]): string {
  switch (format) {
    case 'moxfield': return exportMoxfield(commander, cards)
    case 'mtgo':     return exportMTGO(commander, cards)
    case 'arena':    return exportArena(commander, cards)
    case 'plain':    return exportPlainText(commander, cards)
  }
}

export default function ExportDropdown({ commander, cards, onClose, onToast }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function handleFormat(format: FormatId) {
    const text = getExportText(format, commander, cards)
    await navigator.clipboard.writeText(text)
    const label = FORMATS.find(f => f.id === format)?.label ?? format
    onToast(`${label} format copied to clipboard`)
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-30 rounded-sm overflow-hidden"
      style={{
        background: 'rgba(16,11,6,0.99)',
        border: '1px solid rgba(100,80,40,0.5)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        minWidth: 160,
      }}
    >
      <div className="px-3 py-1.5 border-b" style={{ borderColor: 'rgba(50,40,24,0.4)' }}>
        <p className="text-[8px] font-cinzel uppercase tracking-widest text-gold-faint">
          Copy as...
        </p>
      </div>
      {FORMATS.map(f => (
        <button
          key={f.id}
          onClick={() => handleFormat(f.id)}
          className="w-full flex items-center justify-between px-3 py-2 transition-colors"
          style={{ background: 'transparent', borderBottom: '1px solid rgba(40,32,18,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120,95,40,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="text-[10px] font-cinzel uppercase tracking-wide" style={{ color: '#c0a060' }}>
            {f.label}
          </span>
          <span className="text-[8px] font-body italic text-gold-dim">
            {f.hint}
          </span>
        </button>
      ))}
    </div>
  )
}
