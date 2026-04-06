import React, { useState } from 'react'
import type { SearchFilters } from '../../types'
import { useScryfallSearch } from '../../hooks/useScryfall'
import CardRow from './CardRow'
import Skeleton from '../shared/Skeleton'

const COLORS = ['W', 'U', 'B', 'R', 'G', 'C']
const COLOR_LABELS: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
}
const COLOR_BG: Record<string, string> = {
  W: '#c8c090', U: '#4a7fbb', B: '#6a4888', R: '#aa2222', G: '#2a6a2a', C: '#8a7a6a',
}
const CARD_TYPES = ['', 'creature', 'instant', 'sorcery', 'enchantment', 'artifact', 'planeswalker', 'land']

const DEFAULT_FILTERS: SearchFilters = {
  colors: [],
  cardType: '',
  cmcMin: 0,
  cmcMax: 16,
  keyword: '',
  commanderLegal: true,
  maxPrice: undefined,
}

export default function SearchPanel() {
  const [term, setTerm] = useState('')
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  const { data: rawResults, isFetching, isError } = useScryfallSearch(term, filters)

  // Client-side max price filter — cards with no price data always pass through
  const results = rawResults && filters.maxPrice != null
    ? rawResults.filter(c => c.priceUsd == null || c.priceUsd <= filters.maxPrice!)
    : rawResults

  function toggleColor(c: string) {
    setFilters(f => ({
      ...f,
      colors: f.colors.includes(c) ? f.colors.filter(x => x !== c) : [...f.colors, c],
    }))
  }

  return (
    <div className="flex flex-col h-full panel-inset" style={{ background: 'rgba(12,10,7,0.5)' }}>
      {/* Filter bar */}
      <div
        className="flex-shrink-0 px-2 py-2 border-b space-y-2"
        style={{ borderColor: 'rgba(50,42,28,0.6)', background: 'rgba(8,6,4,0.4)' }}
      >
        {/* Color toggles */}
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => toggleColor(c)}
              title={COLOR_LABELS[c]}
              className="text-label font-cinzel font-bold rounded-sm transition-all"
              style={{
                width: 22, height: 22,
                background: filters.colors.includes(c) ? COLOR_BG[c] : 'rgba(30,24,16,0.8)',
                color: filters.colors.includes(c) ? (c === 'W' ? '#2a1800' : '#fff') : '#6a6050',
                border: `1px solid ${filters.colors.includes(c) ? COLOR_BG[c] : 'rgba(60,50,30,0.4)'}`,
              }}
            >
              {c}
            </button>
          ))}

          <div className="flex-1" />

          {/* Type dropdown */}
          <select
            value={filters.cardType}
            onChange={e => setFilters(f => ({ ...f, cardType: e.target.value }))}
            className="text-label font-cinzel px-1 rounded-sm"
            style={{
              background: 'rgba(20,16,10,0.8)',
              border: '1px solid rgba(60,50,30,0.4)',
              color: '#8a7a5a',
              outline: 'none',
            }}
          >
            {CARD_TYPES.map(t => (
              <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All Types'}</option>
            ))}
          </select>
        </div>

        {/* Max price slider */}
        <div className="flex gap-2 items-center">
          <span className="text-micro font-cinzel tracking-widest" style={{ color: '#6a5e44' }}>Max $</span>
          <input
            type="range" min={0} max={100} step={5}
            value={filters.maxPrice ?? 100}
            onChange={e => {
              const v = Number(e.target.value)
              setFilters(f => ({ ...f, maxPrice: v >= 100 ? undefined : v }))
            }}
            className="flex-1"
            style={{ accentColor: '#8a7050' }}
          />
          <span className="text-micro font-cinzel w-8 text-right" style={{ color: filters.maxPrice != null ? '#c9a060' : '#4a4030' }}>
            {filters.maxPrice != null ? `$${filters.maxPrice}` : 'Any'}
          </span>
          {filters.maxPrice != null && (
            <button
              onClick={() => setFilters(f => ({ ...f, maxPrice: undefined }))}
              className="text-micro"
              style={{ color: '#6a4a4a' }}
              title="Clear price filter"
            >✕</button>
          )}
        </div>

        {/* CMC range + keyword */}
        <div className="flex gap-2 items-center">
          <span className="text-micro font-cinzel tracking-widest" style={{ color: '#6a5e44' }}>CMC</span>
          <input
            type="number" min={0} max={16} value={filters.cmcMin}
            onChange={e => setFilters(f => ({ ...f, cmcMin: Number(e.target.value) }))}
            className="w-8 text-label text-center rounded-sm"
            style={{ background: 'rgba(20,16,10,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#8a7a5a', outline: 'none' }}
          />
          <span className="text-label" style={{ color: '#5a5040' }}>–</span>
          <input
            type="number" min={0} max={16} value={filters.cmcMax}
            onChange={e => setFilters(f => ({ ...f, cmcMax: Number(e.target.value) }))}
            className="w-8 text-label text-center rounded-sm"
            style={{ background: 'rgba(20,16,10,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#8a7a5a', outline: 'none' }}
          />
          <div className="flex-1" />
          <input
            placeholder="keyword..."
            value={filters.keyword}
            onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
            className="text-label px-2 rounded-sm"
            style={{
              background: 'rgba(20,16,10,0.8)',
              border: '1px solid rgba(60,50,30,0.4)',
              color: '#8a7a5a', outline: 'none', width: 80,
              fontFamily: 'Georgia, serif',
            }}
          />
        </div>
      </div>

      {/* Results panel header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-[5px] border-b"
        style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(8,6,4,0.4)' }}
      >
        <span className="text-micro font-cinzel tracking-[3px] uppercase text-gold">
          ✦ Results
        </span>
        <span className="text-micro font-cinzel text-gold-faint">
          {isFetching ? 'searching...' : results ? `${results.length} cards` : ''}
        </span>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {isFetching && <Skeleton rows={8} />}
        {!isFetching && isError && (
          <p className="p-4 text-label font-body text-center" style={{ color: '#7a4a4a' }}>
            Search failed. Check your connection.
          </p>
        )}
        {!isFetching && !isError && results?.length === 0 && term.length >= 2 && (
          <p className="p-4 text-label font-body text-center" style={{ color: '#5a5040', fontStyle: 'italic' }}>
            No cards found. Try a different search.
          </p>
        )}
        {!isFetching && !isError && !results && (
          <p className="p-4 text-label font-body text-center" style={{ color: '#5a5040', fontStyle: 'italic' }}>
            Search the arcane archives above...
          </p>
        )}
        {!isFetching && results && results.map(card => (
          <CardRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
