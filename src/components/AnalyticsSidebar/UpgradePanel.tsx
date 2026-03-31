import React, { useState } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { getUpgradeSuggestions } from '../../utils/claudeApi'
import { playstyleGuidance } from '../../utils/playstyleProfile'
import { fetchCardByName } from '../../hooks/useScryfall'

interface UpgradeSuggestion {
  cut: string
  add: string
  cutPrice: number | null
  addPrice: number | null
  impact: 'High' | 'Medium' | 'Low'
  reason: string
}

const IMPACT_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const IMPACT_COLOR: Record<string, string> = {
  High: '#c06030',
  Medium: '#a09040',
  Low: '#507050',
}

const BUDGETS: Array<{ label: string; value: number | null }> = [
  { label: '$5',        value: 5 },
  { label: '$15',       value: 15 },
  { label: '$30',       value: 30 },
  { label: '$50',       value: 50 },
  { label: '∞',         value: null },
]

function priceColor(price: number | null | undefined): string {
  if (price == null) return '#6a5e44'
  if (price < 1) return '#5a9a5a'
  if (price < 10) return '#a09040'
  return '#aa4040'
}

function tcgUrl(name: string): string {
  return `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(name).replace(/%20/g, '+')}&utm_campaign=decksmith`
}

function PriceTag({ price, name }: { price: number | null; name: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[9px] font-body" style={{ color: priceColor(price) }}>
        {price != null ? `$${price.toFixed(2)}` : '—'}
      </span>
      <a
        href={tcgUrl(name)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[8px] font-cinzel uppercase"
        style={{ color: '#5a7a5a', textDecoration: 'none', letterSpacing: '0.5px' }}
        title="Buy on TCGPlayer"
        onClick={e => e.stopPropagation()}
      >
        buy
      </a>
    </span>
  )
}

export default function UpgradePanel() {
  const { cards, commander, targetBracket, playstyle, playgroup, removeCard, saveVersion } = useDeckStore()
  const [budget, setBudget] = useState<number | null>(15)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<UpgradeSuggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [applying, setApplying] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)

  const styleGuidance = playstyleGuidance(playstyle)
  const podNames = playgroup.map(c => c.name)

  async function handleFind() {
    if (cards.length === 0) return
    setIsLoading(true)
    setError(null)
    setDismissed(new Set())
    setSuggestions([])
    setHasRun(true)

    try {
      const deckInput = cards.map(dc => ({
        name: dc.card.name,
        priceUsd: dc.card.priceUsd,
      }))

      const raw = await getUpgradeSuggestions(
        deckInput,
        commander?.name ?? null,
        budget,
        targetBracket,
        styleGuidance,
        podNames,
      )

      if (raw.length === 0) {
        setError('No suggestions returned. Try a different budget or rebuild the deck.')
        return
      }

      // Fetch actual add-card prices from Scryfall in parallel
      const resolved = await Promise.all(
        raw.map(async (s) => {
          const cutCard = cards.find(dc => dc.card.name.toLowerCase() === s.cut.toLowerCase())
          let addPrice: number | null = null
          try {
            const fetched = await fetchCardByName(s.add)
            addPrice = fetched?.priceUsd ?? null
          } catch { /* price stays null */ }

          return {
            cut: s.cut,
            add: s.add,
            cutPrice: cutCard?.card.priceUsd ?? null,
            addPrice,
            impact: s.impact,
            reason: s.reason,
          } satisfies UpgradeSuggestion
        })
      )

      // Sort: High → Medium → Low, then by add price ascending
      resolved.sort((a, b) =>
        (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1) ||
        (a.addPrice ?? 999) - (b.addPrice ?? 999)
      )

      setSuggestions(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApply(idx: number, suggestion: UpgradeSuggestion) {
    setApplying(prev => new Set(prev).add(idx))
    // Auto-version before applying so the user can undo
    saveVersion(`Before upgrade: cut ${suggestion.cut}`)
    try {
      const cutCard = cards.find(dc => dc.card.name.toLowerCase() === suggestion.cut.toLowerCase())
      if (cutCard) removeCard(cutCard.card.id)

      const newCard = await fetchCardByName(suggestion.add)
      if (newCard) useDeckStore.getState().addCard(newCard)
    } catch { /* ignore, deck state partially updated */ }
    finally {
      setApplying(prev => { const s = new Set(prev); s.delete(idx); return s })
      setDismissed(prev => new Set(prev).add(idx))
    }
  }

  function handleSkip(idx: number) {
    setDismissed(prev => new Set(prev).add(idx))
  }

  const visible = suggestions.filter((_, i) => !dismissed.has(i))
  const deckValueTotal = cards.reduce((s, dc) => s + (dc.card.priceUsd ?? 0) * dc.qty, 0) +
    (commander?.priceUsd ?? 0)

  return (
    <div className="flex flex-col h-full">
      {/* Budget selector */}
      <div className="px-3 pt-3 pb-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(50,42,28,0.4)' }}>
        <p className="text-[8px] font-cinzel uppercase tracking-[2px] mb-2" style={{ color: '#7a6a4a' }}>
          Max add price
        </p>
        <div className="flex gap-1 flex-wrap">
          {BUDGETS.map(b => (
            <button
              key={String(b.value)}
              onClick={() => setBudget(b.value)}
              className="px-2 py-[3px] text-[9px] font-cinzel uppercase rounded-sm transition-all"
              style={{
                background: budget === b.value ? 'rgba(140,110,50,0.25)' : 'rgba(14,10,5,0.6)',
                border: budget === b.value ? '1px solid rgba(180,140,50,0.4)' : '1px solid rgba(50,40,24,0.4)',
                color: budget === b.value ? '#c9a060' : '#5a5040',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {deckValueTotal > 0 && (
          <p className="text-[8px] font-body mt-2" style={{ color: '#6a5e44' }}>
            Deck value: <span style={{ color: priceColor(deckValueTotal / Math.max(cards.length, 1)) }}>${deckValueTotal.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* Find button */}
      <div className="px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: 'rgba(50,42,28,0.4)' }}>
        <button
          onClick={handleFind}
          disabled={isLoading || cards.length === 0}
          className="w-full py-2 text-[10px] font-cinzel uppercase tracking-widest rounded-sm transition-all"
          style={{
            background: isLoading || cards.length === 0
              ? 'rgba(30,24,14,0.5)'
              : 'linear-gradient(135deg, rgba(55,40,14,0.9), rgba(35,26,8,0.95))',
            border: `1px solid ${cards.length > 0 ? 'rgba(160,120,45,0.45)' : 'rgba(50,40,24,0.3)'}`,
            color: cards.length === 0 ? '#3a3020' : isLoading ? '#7a6030' : '#c9a060',
            cursor: isLoading || cards.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Consulting the archives…' : '✦ Find Upgrades'}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {error && (
          <p className="text-[9px] font-body italic text-center py-3" style={{ color: '#8a3030' }}>
            {error}
          </p>
        )}

        {!hasRun && !isLoading && (
          <p className="text-[9px] font-body italic text-center py-4" style={{ color: '#4a3a28' }}>
            Select a budget and find upgrades tailored to your deck, bracket, and pod.
          </p>
        )}

        {hasRun && !isLoading && visible.length === 0 && !error && (
          <p className="text-[9px] font-body italic text-center py-4" style={{ color: '#4a3a28' }}>
            All suggestions applied or skipped.
          </p>
        )}

        {suggestions.map((s, idx) => {
          if (dismissed.has(idx)) return null
          const isApplying = applying.has(idx)

          return (
            <div
              key={idx}
              className="rounded-sm overflow-hidden"
              style={{ border: '1px solid rgba(60,50,30,0.5)', background: 'rgba(14,10,5,0.7)' }}
            >
              {/* Impact badge row */}
              <div
                className="flex items-center justify-between px-2 py-1 border-b"
                style={{ borderColor: 'rgba(50,40,24,0.4)', background: 'rgba(8,6,3,0.5)' }}
              >
                <span
                  className="text-[8px] font-cinzel uppercase tracking-widest px-1.5 py-px rounded-sm"
                  style={{
                    color: IMPACT_COLOR[s.impact],
                    border: `1px solid ${IMPACT_COLOR[s.impact]}55`,
                    background: `${IMPACT_COLOR[s.impact]}18`,
                  }}
                >
                  {s.impact}
                </span>
                <span className="text-[7px] font-cinzel uppercase tracking-wide" style={{ color: '#4a4030' }}>
                  impact
                </span>
              </div>

              {/* Cut row */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b" style={{ borderColor: 'rgba(50,40,24,0.3)' }}>
                <span
                  className="text-[7px] font-cinzel uppercase px-1 py-px rounded-sm flex-shrink-0"
                  style={{ background: 'rgba(160,50,40,0.2)', border: '1px solid rgba(160,60,50,0.4)', color: '#c05040' }}
                >
                  CUT
                </span>
                <span className="flex-1 truncate text-[10px] font-body" style={{ color: '#c09070' }}>
                  {s.cut}
                </span>
                <PriceTag price={s.cutPrice} name={s.cut} />
              </div>

              {/* Add row */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b" style={{ borderColor: 'rgba(50,40,24,0.3)' }}>
                <span
                  className="text-[7px] font-cinzel uppercase px-1 py-px rounded-sm flex-shrink-0"
                  style={{ background: 'rgba(50,140,60,0.2)', border: '1px solid rgba(60,140,70,0.4)', color: '#50a060' }}
                >
                  ADD
                </span>
                <span className="flex-1 truncate text-[10px] font-body" style={{ color: '#80c080' }}>
                  {s.add}
                </span>
                <PriceTag price={s.addPrice} name={s.add} />
              </div>

              {/* Reason */}
              <div className="px-2 py-1.5 border-b" style={{ borderColor: 'rgba(50,40,24,0.3)' }}>
                <p className="text-[9px] font-body italic leading-snug" style={{ color: '#7a6a50' }}>
                  {s.reason}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 px-2 py-1.5">
                <button
                  onClick={() => handleApply(idx, s)}
                  disabled={isApplying}
                  className="flex-1 py-1 text-[9px] font-cinzel uppercase tracking-wide rounded-sm transition-all"
                  style={{
                    background: isApplying ? 'rgba(30,24,14,0.5)' : 'rgba(30,50,20,0.6)',
                    border: '1px solid rgba(70,110,50,0.4)',
                    color: isApplying ? '#5a6040' : '#80a860',
                    cursor: isApplying ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isApplying ? '…' : '✓ Apply'}
                </button>
                <button
                  onClick={() => handleSkip(idx)}
                  disabled={isApplying}
                  className="flex-1 py-1 text-[9px] font-cinzel uppercase tracking-wide rounded-sm transition-all"
                  style={{
                    background: 'rgba(30,22,10,0.4)',
                    border: '1px solid rgba(60,50,30,0.35)',
                    color: '#5a5040',
                    cursor: isApplying ? 'not-allowed' : 'pointer',
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
