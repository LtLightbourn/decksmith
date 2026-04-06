import React from 'react'
import type { Card } from '../../types'
import ManaCost from '../ManaSymbol/ManaCost'
import CardPreview from '../CardPreview/CardPreview'
import { useDeckStore } from '../../store/deckStore'
import { isCommanderLegal } from '../../utils/colorIdentity'

interface Props { card: Card }

const TYPE_COLOR: Record<string, string> = {
  creature: '#6a8a4a',
  instant: '#4a6a9a',
  sorcery: '#8a5a8a',
  enchantment: '#9a7a3a',
  artifact: '#7a8a9a',
  planeswalker: '#9a6a3a',
  land: '#5a7a5a',
}

function typeColor(typeLine: string): string {
  const tl = typeLine.toLowerCase()
  for (const [k, v] of Object.entries(TYPE_COLOR)) {
    if (tl.includes(k)) return v
  }
  return '#6a6a6a'
}

function shortType(typeLine: string): string {
  const tl = typeLine.toLowerCase()
  if (tl.includes('creature')) return 'Creature'
  if (tl.includes('instant')) return 'Instant'
  if (tl.includes('sorcery')) return 'Sorcery'
  if (tl.includes('enchantment')) return 'Enchant'
  if (tl.includes('artifact')) return 'Artifact'
  if (tl.includes('planeswalker')) return 'PW'
  if (tl.includes('land')) return 'Land'
  return 'Other'
}

export default function CardRow({ card }: Props) {
  const { addCard, setCommander, commander } = useDeckStore()
  const isLegendary = isCommanderLegal(card)

  function handleAdd() {
    addCard(card)
  }

  function handleSetCommander(e: React.MouseEvent) {
    e.stopPropagation()
    setCommander(card)
  }

  return (
    <CardPreview card={card}>
      <div className="card-row flex items-center gap-2 px-2 py-[5px] border-b border-[rgba(40,34,24,0.4)]">
        {/* Mana cost */}
        <div className="flex-shrink-0 w-16 flex justify-end">
          <ManaCost cost={card.manaCost} />
        </div>

        {/* Name */}
        <span
          className="flex-1 truncate text-label font-body"
          style={{ color: '#c0b090', letterSpacing: '0.3px' }}
        >
          {card.name}
        </span>

        {/* Type badge */}
        <span
          className="flex-shrink-0 text-micro font-cinzel uppercase tracking-widest"
          style={{ color: typeColor(card.typeLine) }}
        >
          {shortType(card.typeLine)}
        </span>

        {/* Set commander button if legendary */}
        {isLegendary && !commander && (
          <button
            onClick={handleSetCommander}
            className="flex-shrink-0 text-micro font-cinzel px-1"
            style={{ color: '#c9a060', borderLeft: '1px solid rgba(120,95,55,0.3)' }}
            title="Set as commander"
          >
            ♛
          </button>
        )}

        {/* Add button */}
        <button
          onClick={handleAdd}
          className="flex-shrink-0 text-body leading-none"
          style={{ color: '#6a7a5a' }}
          title="Add to deck"
        >
          +
        </button>
      </div>
    </CardPreview>
  )
}
