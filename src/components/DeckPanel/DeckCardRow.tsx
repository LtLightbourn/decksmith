import React from 'react'
import type { DeckCard } from '../../types'
import ManaCost from '../ManaSymbol/ManaCost'
import CardPreview from '../CardPreview/CardPreview'
import { useDeckStore } from '../../store/deckStore'
import { getFlagForCard } from '../../utils/bracketData'
import { getPriceValue, priceDisplayColor, formatPrice, tcgPlayerUrl } from '../../utils/priceUtils'

interface Props { dc: DeckCard }

const CATEGORY_COLOR: Record<string, string> = {
  'Fast Mana':              '#e06020',
  'Optimal Tutor':          '#c040c0',
  'Budget Tutor':           '#9050b0',
  'Extra Turn':             '#2090c0',
  'Free Spell':             '#2090c0',
  'Draw Engine':            '#4080b0',
  'Mass Land Destruction':  '#c05030',
  'Infinite Combo':         '#d04040',
  'Broken Combo':           '#d04040',
  'Stax':                   '#808040',
}

const CATEGORY_ABBR: Record<string, string> = {
  'Fast Mana':              'MANA',
  'Optimal Tutor':          'TUT',
  'Budget Tutor':           'TUT',
  'Extra Turn':             '+TURN',
  'Free Spell':             'FREE',
  'Draw Engine':            'DRAW',
  'Mass Land Destruction':  'MLD',
  'Infinite Combo':         '∞',
  'Broken Combo':           '∞',
  'Stax':                   'STAX',
}

export default function DeckCardRow({ dc }: Props) {
  const { incrementCard, decrementCard, targetBracket, proxyMode, proxyCardIds, toggleProxyCard, prices, pricesFetching } = useDeckStore()
  const flag = getFlagForCard(dc.card.name, dc.card.oracleText)
  const isFlagged = flag !== null && flag.minBracket > targetBracket
  const isProxied = proxyCardIds.includes(dc.card.id)

  const flagColor = flag ? (CATEGORY_COLOR[flag.category] ?? '#888') : ''
  const flagAbbr  = flag ? (CATEGORY_ABBR[flag.category]  ?? '!') : ''

  // Resolve price: live prices map → card-level fallback
  const priceData = prices[dc.card.name.toLowerCase()]
  const effectivePrice = priceData ? getPriceValue(priceData) : (dc.card.priceUsd ?? null)
  const isLoadingPrice = pricesFetching && effectivePrice == null

  return (
    <CardPreview card={dc.card}>
      <div className="card-row flex items-center gap-1 px-2 py-[4px] border-b border-[rgba(40,34,24,0.3)]"
        style={isFlagged ? { background: 'rgba(180,80,20,0.05)' } : undefined}>
        {/* Proxy checkbox */}
        {proxyMode && (
          <button
            onClick={e => { e.stopPropagation(); toggleProxyCard(dc.card.id) }}
            className="flex-shrink-0 w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-colors"
            style={{
              background: isProxied ? 'rgba(140,110,50,0.3)' : 'rgba(20,15,8,0.6)',
              border: isProxied ? '1px solid rgba(180,140,50,0.6)' : '1px solid rgba(60,50,30,0.5)',
            }}
            title={isProxied ? 'Remove from proxy list' : 'Add to proxy list'}
          >
            {isProxied && <span style={{ fontSize: 7, color: '#c9a060', lineHeight: 1 }}>✓</span>}
          </button>
        )}
        {/* Qty */}
        <span className="text-[10px] font-cinzel w-5 text-center flex-shrink-0" style={{ color: '#6a5e44' }}>
          {dc.qty}
        </span>

        {/* Mana cost */}
        <div className="flex-shrink-0 w-14 flex justify-end">
          <ManaCost cost={dc.card.manaCost} />
        </div>

        {/* Name with TCGPlayer hover link */}
        <span className="group flex-1 flex items-center gap-0.5 min-w-0">
          <span
            className="truncate text-[11px] font-body"
            style={{ color: isFlagged ? '#d0a870' : '#b8a880', letterSpacing: '0.3px' }}
          >
            {dc.card.name}
          </span>
          <a
            href={tcgPlayerUrl(dc.card.name)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: '#5a7a5a', fontSize: 8, lineHeight: 1 }}
            title="View on TCGPlayer"
          >
            ↗
          </a>
        </span>

        {/* Price */}
        {isLoadingPrice && (
          <span className="flex-shrink-0 w-7 h-2 rounded-sm animate-pulse" style={{ background: 'rgba(80,70,50,0.4)' }} />
        )}
        {!isLoadingPrice && effectivePrice != null && (
          <span
            className="flex-shrink-0 text-[8px] font-body"
            style={{ color: priceDisplayColor(effectivePrice) }}
          >
            {formatPrice(effectivePrice)}
          </span>
        )}

        {/* Bracket flag badge */}
        {isFlagged && flag && (
          <span
            className="flex-shrink-0 text-[7px] font-cinzel font-bold px-1 py-px rounded-sm"
            style={{
              background: `rgba(${hexToRgb(flagColor)}, 0.18)`,
              border: `1px solid rgba(${hexToRgb(flagColor)}, 0.45)`,
              color: flagColor,
              letterSpacing: '0.5px',
            }}
            title={`${flag.category} — ${flag.tooltip} (B${flag.minBracket}+)`}
          >
            {flagAbbr}
          </span>
        )}

        {/* − + controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => decrementCard(dc.card.id)}
            className="w-4 h-4 flex items-center justify-center text-[12px] leading-none rounded-sm hover:bg-[rgba(180,50,50,0.2)] transition-colors"
            style={{ color: '#7a5040' }}
          >
            −
          </button>
          <button
            onClick={() => incrementCard(dc.card.id)}
            className="w-4 h-4 flex items-center justify-center text-[12px] leading-none rounded-sm hover:bg-[rgba(80,120,50,0.2)] transition-colors"
            style={{ color: '#4a7a4a' }}
          >
            +
          </button>
        </div>
      </div>
    </CardPreview>
  )
}

function hexToRgb(hex: string): string {
  // Handle rgb() pass-through strings already in that format
  if (!hex.startsWith('#')) return '180,120,60'
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
