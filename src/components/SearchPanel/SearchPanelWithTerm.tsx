import React, { useState } from 'react'
import type { SearchFilters } from '../../types'
import { useScryfallSearch } from '../../hooks/useScryfall'
import { useDeckStore } from '../../store/deckStore'
import { ProGate } from '../Auth/ProGate'
import CardRow from './CardRow'
import Skeleton from '../shared/Skeleton'

interface Props { term: string }

const COLORS = ['W', 'U', 'B', 'R', 'G', 'C']
const COLOR_LABELS: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
}
const COLOR_BG: Record<string, string> = {
  W: '#c8c090', U: '#4a7fbb', B: '#6a4888', R: '#aa2222', G: '#2a6a2a', C: '#8a7a6a',
}
const CARD_TYPES = ['', 'creature', 'instant', 'sorcery', 'enchantment', 'artifact', 'planeswalker', 'land']

const DEFAULT_FILTERS: SearchFilters = {
  colors: [], cardType: '', cmcMin: 0, cmcMax: 16, keyword: '', commanderLegal: true,
}

export default function SearchPanelWithTerm({ term }: Props) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const { data: results, isFetching, isError } = useScryfallSearch(term, filters)
  const { setCommanderFinderOpen } = useDeckStore()

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
        {/* Color toggles — horizontal scroll on mobile */}
        <div className="flex gap-1 items-center overflow-x-auto pb-[1px]" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => toggleColor(c)}
              title={COLOR_LABELS[c]}
              className="text-[10px] font-cinzel font-bold rounded-sm transition-all flex-shrink-0"
              style={{
                width: 26, height: 26,
                background: filters.colors.includes(c) ? COLOR_BG[c] : 'rgba(30,24,16,0.8)',
                color: filters.colors.includes(c) ? (c === 'W' ? '#2a1800' : '#fff') : '#6a6050',
                border: `1px solid ${filters.colors.includes(c) ? COLOR_BG[c] : 'rgba(60,50,30,0.4)'}`,
              }}
            >{c}</button>
          ))}
          <div className="flex-1 min-w-[8px]" />
          <select
            value={filters.cardType}
            onChange={e => setFilters(f => ({ ...f, cardType: e.target.value }))}
            className="text-[10px] font-cinzel px-1 rounded-sm flex-shrink-0"
            style={{ background: 'rgba(20,16,10,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#8a7a5a', outline: 'none' }}
          >
            {CARD_TYPES.map(t => (
              <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All Types'}</option>
            ))}
          </select>
        </div>

        {/* CMC + keyword */}
        <div className="flex gap-2 items-center">
          <span className="text-[9px] font-cinzel tracking-widest" style={{ color: '#6a5e44' }}>CMC</span>
          <input type="number" min={0} max={16} value={filters.cmcMin}
            onChange={e => setFilters(f => ({ ...f, cmcMin: Number(e.target.value) }))}
            className="w-8 text-[10px] text-center rounded-sm"
            style={{ background: 'rgba(20,16,10,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#8a7a5a', outline: 'none' }} />
          <span style={{ color: '#5a5040', fontSize: 10 }}>–</span>
          <input type="number" min={0} max={16} value={filters.cmcMax}
            onChange={e => setFilters(f => ({ ...f, cmcMax: Number(e.target.value) }))}
            className="w-8 text-[10px] text-center rounded-sm"
            style={{ background: 'rgba(20,16,10,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#8a7a5a', outline: 'none' }} />
          <div className="flex-1" />
          <input
            placeholder="keyword..."
            value={filters.keyword}
            onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
            className="text-[10px] px-2 rounded-sm"
            style={{ background: 'rgba(20,16,10,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#8a7a5a', outline: 'none', width: 80, fontFamily: 'Georgia,serif' }}
          />
        </div>
      </div>

      {/* Find My Commander button */}
      <div
        className="flex-shrink-0 px-2 py-2 border-b"
        style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(6,4,2,0.5)' }}
      >
        <ProGate feature="commander-finder">
          <button
            onClick={() => setCommanderFinderOpen(true)}
            className="w-full py-2 text-[10px] font-cinzel uppercase tracking-widest transition-all rounded-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(60,40,8,0.7), rgba(40,25,5,0.8))',
              border: '1px solid rgba(160,110,20,0.35)',
              color: '#c0900a',
            }}
          >
            ⚔ Find My Commander
          </button>
        </ProGate>
      </div>

      {/* Panel header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-[5px] border-b"
        style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(8,6,4,0.4)' }}
      >
        <span className="text-[9px] font-cinzel tracking-[3px] uppercase" style={{ color: '#c9a060' }}>✦ Results</span>
        <span className="text-[9px] font-cinzel" style={{ color: '#5a5040' }}>
          {isFetching ? 'searching...' : results ? `${results.length} cards` : ''}
        </span>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isFetching && <Skeleton rows={8} />}
        {!isFetching && isError && (
          <p className="p-4 text-[11px] font-body text-center" style={{ color: '#7a4a4a' }}>Search failed.</p>
        )}
        {!isFetching && !isError && results?.length === 0 && term.length >= 2 && (
          <p className="p-4 text-[11px] font-body text-center italic" style={{ color: '#5a5040' }}>No cards found.</p>
        )}
        {!isFetching && !isError && !results && (
          <p className="p-4 text-[11px] font-body text-center italic" style={{ color: '#5a5040' }}>
            Search the arcane archives above...
          </p>
        )}
        {!isFetching && results?.map(card => (
          <CardRow key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
