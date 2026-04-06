import React, { useMemo, useState, useCallback } from 'react'
import { ProGate } from '../Auth/ProGate'
import { useDeckStore } from '../../store/deckStore'
import { generateDeckSummary } from '../../utils/claudeApi'
import { usePriceSync } from '../../hooks/usePriceSync'
import { getDeckTotal } from '../../utils/priceUtils'

import DeckSection from './DeckSection'
import BracketSelector from './BracketSelector'
import CardPreview from '../CardPreview/CardPreview'
import PlaytesterModal from '../Playtester/PlaytesterModal'
import VersionPopover from './VersionPopover'
import ExportDropdown from './ExportDropdown'
import { encodeDeck } from '../../utils/deckParser'
import { getFlagForCard, BRACKET_LABELS } from '../../utils/bracketData'
import type { DeckCard, DeckVersion } from '../../types'

const SECTION_DEFS: { name: string; test: (tl: string) => boolean }[] = [
  { name: 'Creatures',     test: tl => tl.includes('creature') },
  { name: 'Instants',      test: tl => tl.includes('instant') },
  { name: 'Sorceries',     test: tl => tl.includes('sorcery') },
  { name: 'Enchantments',  test: tl => tl.includes('enchantment') },
  { name: 'Artifacts',     test: tl => tl.includes('artifact') },
  { name: 'Planeswalkers', test: tl => tl.includes('planeswalker') },
  { name: 'Lands',         test: tl => tl.includes('land') },
]

function bucketCards(cards: DeckCard[]): Record<string, DeckCard[]> {
  const buckets: Record<string, DeckCard[]> = {}
  for (const def of SECTION_DEFS) buckets[def.name] = []
  buckets.Other = []

  for (const dc of cards) {
    const tl = dc.card.typeLine.toLowerCase()
    let placed = false
    for (const def of SECTION_DEFS) {
      if (def.test(tl)) { buckets[def.name].push(dc); placed = true; break }
    }
    if (!placed) buckets.Other.push(dc)
  }
  return buckets
}

interface DeckPanelProps {
  onSurprise?: () => void
  onRestoreVersion?: (v: DeckVersion) => void
}

export default function DeckPanel({ onSurprise, onRestoreVersion }: DeckPanelProps) {
  const {
    commander, cards, setCommander, targetBracket,
    proxyMode, proxyCardIds, toggleProxyMode, setAllProxy, setProxySheetOpen,
    activeDeckName, activeDeckId, saveToHistory, addToast,
    prices, lastPriceFetch, pricesFetching,
    deckVersions, restoreVersion,
  } = useDeckStore()
  const { syncPrices } = usePriceSync()
  const [isLoggingDeck, setIsLoggingDeck] = useState(false)
  const [playtesterOpen, setPlaytesterOpen] = useState(false)
  const [versionPopoverOpen, setVersionPopoverOpen] = useState(false)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  async function handleShare() {
    const compressed = encodeDeck(activeDeckName, commander, cards, targetBracket)
    const url = `${window.location.origin}/?deck=${compressed}`
    await navigator.clipboard.writeText(url)
    addToast('Deck link copied! Anyone with this link can view it.', 'success')
  }

  const versionKey = activeDeckId ?? '__unsaved__'
  const versions = deckVersions[versionKey] ?? []

  const handleRestoreWithUndo = useCallback((version: DeckVersion) => {
    setVersionPopoverOpen(false)
    onRestoreVersion?.(version)
  }, [onRestoreVersion])
  const total = cards.reduce((s, dc) => s + dc.qty, 0)
  const buckets = bucketCards(cards)
  const isOver = total > 99
  const isComplete = total === 99

  // Compute mismatch count: cards that exceed the target bracket
  async function handleLogDeck() {
    if (cards.length === 0 || isLoggingDeck) return
    setIsLoggingDeck(true)
    try {
      const cardNames = cards.map(dc => dc.card.name)
      const { summary, themes } = await generateDeckSummary(commander?.name ?? null, cardNames)
      saveToHistory({
        id: `history-${Date.now()}`,
        name: activeDeckName,
        commander: commander ?? null,
        cards,
        bracket: targetBracket,
        savedAt: Date.now(),
        summary,
        themes,
      })
      addToast('Deck saved to your grimoire', 'success')
    } catch {
      addToast('Could not generate summary — try again', 'warning')
    } finally {
      setIsLoggingDeck(false)
    }
  }

  const deckTotals = useMemo(() => getDeckTotal(cards, prices, commander), [cards, prices, commander])
  const deckValue = deckTotals.total

  const landCount = useMemo(
    () => cards.filter(dc => dc.card.typeLine.toLowerCase().includes('land')).reduce((s, dc) => s + dc.qty, 0),
    [cards],
  )

  const avgCmc = useMemo(() => {
    const nonLands = cards.filter(dc => !dc.card.typeLine.toLowerCase().includes('land'))
    const totalCmc = nonLands.reduce((s, dc) => s + dc.card.cmc * dc.qty, 0)
    const totalNonLand = nonLands.reduce((s, dc) => s + dc.qty, 0)
    return totalNonLand > 0 ? totalCmc / totalNonLand : 0
  }, [cards])

  const avgCardPrice = deckValue > 0 && total > 0 ? deckValue / (total + (commander ? 1 : 0)) : 0

  const priceAgeMinutes = lastPriceFetch ? Math.floor((Date.now() - lastPriceFetch) / 60000) : null

  const flaggedAboveTarget = useMemo(() => {
    return cards.filter(dc => {
      const flag = getFlagForCard(dc.card.name, dc.card.oracleText)
      return flag !== null && flag.minBracket > targetBracket
    })
  }, [cards, targetBracket])

  const mismatchCount = flaggedAboveTarget.length
  const bracketInfo = BRACKET_LABELS[targetBracket]

  return (
    <div className="flex flex-col h-full panel-inset" style={{ background: 'rgba(10,8,5,0.5)' }}>
      {/* Surprise Me — mobile only */}
      {onSurprise && (
        <div
          className="md:hidden flex-shrink-0 px-2 pt-2 pb-1"
          style={{ background: 'rgba(8,6,4,0.4)' }}
        >
          <ProGate feature="surprise-me">
            <button
              onClick={onSurprise}
              className="w-full py-2 text-[10px] font-cinzel uppercase tracking-widest transition-all rounded-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(80,55,8,0.75), rgba(55,35,4,0.85))',
                border: '1px solid rgba(180,130,25,0.4)',
                color: '#d4a030',
              }}
            >
              🎲 Surprise Me
            </button>
          </ProGate>
        </div>
      )}

      {/* Panel header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-[5px] border-b relative"
        style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(8,6,4,0.4)' }}
      >
        <span className="text-[9px] font-cinzel tracking-[3px] uppercase text-gold">
          ✦ Deck
        </span>
        <div className="flex items-center gap-2">
          {/* Version control */}
          <ProGate feature="deck-versioning">
            <div className="relative">
              <button
                onClick={() => setVersionPopoverOpen(v => !v)}
                className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
                style={{
                  background: versions.length > 0 ? 'rgba(30,22,60,0.6)' : 'rgba(14,10,5,0.5)',
                  border: versions.length > 0 ? '1px solid rgba(80,60,160,0.45)' : '1px solid rgba(40,32,20,0.35)',
                  color: versions.length > 0 ? '#9080d0' : '#3a3020',
                }}
                title="Version history"
              >
                {versions.length > 0 ? `v${versions.length} ▾` : '⊞ Versions'}
              </button>
              {versionPopoverOpen && (
                <VersionPopover
                  onClose={() => setVersionPopoverOpen(false)}
                  onRestoreWithUndo={handleRestoreWithUndo}
                />
              )}
            </div>
          </ProGate>
          {/* Playtest */}
          {cards.length > 0 && (
            <ProGate feature="playtester">
              <button
                onClick={() => setPlaytesterOpen(true)}
                className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
                style={{
                  background: 'rgba(14,28,42,0.6)',
                  border: '1px solid rgba(40,80,120,0.4)',
                  color: '#6090b0',
                }}
                title="Goldfish your deck"
              >
                ⟳ Playtest
              </button>
            </ProGate>
          )}
          {/* Log to history */}
          {cards.length > 0 && (
            <ProGate feature="deck-history">
              <button
                onClick={handleLogDeck}
                disabled={isLoggingDeck}
                className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
                style={{
                  background: isLoggingDeck ? 'rgba(20,15,8,0.5)' : 'rgba(20,30,14,0.6)',
                  border: '1px solid rgba(70,100,45,0.4)',
                  color: isLoggingDeck ? '#4a5030' : '#7a9a50',
                  cursor: isLoggingDeck ? 'not-allowed' : 'pointer',
                }}
                title="Save this deck to your grimoire"
              >
                {isLoggingDeck ? '…' : '◆ Log'}
              </button>
            </ProGate>
          )}
          {/* Share */}
          {cards.length > 0 && (
            <ProGate feature="deck-sharing">
            <button
              onClick={handleShare}
              className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
              style={{
                background: 'rgba(14,22,32,0.6)',
                border: '1px solid rgba(40,70,110,0.4)',
                color: '#5080a0',
              }}
              title="Copy share link"
            >
              ⛓ Share
            </button>
            </ProGate>
          )}
          {/* Export dropdown */}
          {cards.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(v => !v)}
                className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
                style={{
                  background: exportDropdownOpen ? 'rgba(40,30,10,0.8)' : 'rgba(14,10,5,0.5)',
                  border: '1px solid rgba(80,65,35,0.4)',
                  color: '#7a6a4a',
                }}
                title="Export deck"
              >
                ↧ Export ▾
              </button>
              {exportDropdownOpen && (
                <ExportDropdown
                  commander={commander}
                  cards={cards}
                  onClose={() => setExportDropdownOpen(false)}
                  onToast={(msg) => addToast(msg, 'success')}
                />
              )}
            </div>
          )}
          {/* Proxy mode toggle */}
          <ProGate feature="proxy-sheet">
            <button
              onClick={() => {
                if (!proxyMode && proxyCardIds.length === 0) {
                  // Auto-select all non-basic cards on first enable
                  setAllProxy(cards.map(dc => dc.card.id))
                }
                toggleProxyMode()
              }}
              className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
              style={{
                background: proxyMode ? 'rgba(140,110,50,0.2)' : 'rgba(20,15,8,0.5)',
                border: proxyMode ? '1px solid rgba(180,140,50,0.45)' : '1px solid rgba(50,40,24,0.4)',
                color: proxyMode ? '#c9a060' : '#5a5040',
              }}
            >
              {proxyMode ? `⎙ ${proxyCardIds.length} to proxy` : '⎙ Proxy'}
            </button>
          </ProGate>
          {/* Print proxies button — only when proxy mode is on */}
          {proxyMode && (
            <button
              onClick={() => setProxySheetOpen(true)}
              className="text-[8px] font-cinzel uppercase tracking-wide px-1.5 py-[2px] rounded-sm transition-all"
              style={{
                background: 'rgba(30,22,10,0.7)',
                border: '1px solid rgba(140,105,40,0.4)',
                color: '#a08040',
              }}
            >
              Print Sheet
            </button>
          )}
          {deckValue > 0 && (
            <span className="text-[8px] font-cinzel" style={{ color: '#6a7a5a' }}>
              ${deckValue.toFixed(0)}
            </span>
          )}
          <span
            className="text-[9px] font-cinzel"
            style={{ color: isOver ? '#cc4444' : isComplete ? '#6a9a4a' : '#5a5040' }}
          >
            {total} / 99
          </span>
        </div>
      </div>

      {/* Stats strip */}
      {total > 0 && (
        <div
          className="flex-shrink-0 flex items-center gap-3 px-3 py-[4px] border-b"
          style={{ borderColor: 'rgba(40,32,20,0.4)', background: 'rgba(8,6,4,0.3)' }}
        >
          <StatChip label="Cards" value={`${total}`} />
          <StatChip label="Lands" value={`${landCount}`} />
          <StatChip label="Avg CMC" value={avgCmc.toFixed(1)} />
          {deckValue > 0 && <StatChip label="Value" value={`$${deckValue.toFixed(0)}`} />}
          {avgCardPrice > 0 && <StatChip label="Avg $" value={`$${avgCardPrice.toFixed(2)}`} />}
        </div>
      )}

      {/* Bracket selector */}
      <BracketSelector />

      {/* Mismatch warning banner */}
      {mismatchCount > 0 && (
        <div
          className="flex-shrink-0 mx-2 mt-1.5 px-3 py-2 rounded-sm"
          style={{
            background: 'rgba(160,70,20,0.12)',
            border: '1px solid rgba(180,90,30,0.4)',
          }}
        >
          <p className="text-[9px] font-cinzel leading-relaxed" style={{ color: '#c07840' }}>
            ⚠ {mismatchCount} card{mismatchCount > 1 ? 's' : ''} exceed Bracket {targetBracket} ({bracketInfo.name})
          </p>
          <p className="text-[8px] font-body italic mt-0.5" style={{ color: '#7a5830' }}>
            Review flagged cards or raise your bracket target.
          </p>
        </div>
      )}

      {/* Commander zone */}
      <div
        className="flex-shrink-0 mx-2 my-2 px-3 py-2 rounded-sm flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, rgba(40,30,10,0.6), rgba(30,22,8,0.8))',
          border: `1px solid ${commander ? 'rgba(200,160,60,0.4)' : 'rgba(120,95,55,0.25)'}`,
          boxShadow: commander ? 'inset 0 0 10px rgba(180,140,50,0.1), 0 0 8px rgba(180,140,50,0.08)' : 'none',
        }}
      >
        <span style={{ color: '#c9a060', fontSize: 14 }}>♛</span>
        {commander ? (
          <CardPreview card={commander}>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[11px] font-cinzel" style={{ color: '#c9a060', letterSpacing: '0.5px' }}>
                {commander.name}
              </span>
              <button
                onClick={() => setCommander(null)}
                className="text-[9px]"
                style={{ color: '#6a5040' }}
                title="Remove commander"
                aria-label="Remove commander"
              >
                ✕
              </button>
            </div>
          </CardPreview>
        ) : (
          <span className="text-[10px] font-cinzel" style={{ color: '#6a5e44', letterSpacing: '1px' }}>
            Commander — drag or ♛ a legendary
          </span>
        )}
      </div>

      {/* Card sections */}
      <div className="flex-1 overflow-y-auto">
        {total === 0 && (
          <p className="p-6 text-center text-[11px] font-body" style={{ color: '#4a4030', fontStyle: 'italic' }}>
            Your deck awaits. Search and add cards to begin forging your legacy.
          </p>
        )}
        {SECTION_DEFS.map(def => (
          <DeckSection key={def.name} name={def.name} cards={buckets[def.name]} />
        ))}
        {buckets.Other.length > 0 && (
          <DeckSection name="Other" cards={buckets.Other} />
        )}
      </div>

      {/* Price footer */}
      {total > 0 && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-[4px] border-t"
          style={{ borderColor: 'rgba(40,32,20,0.4)', background: 'rgba(6,4,2,0.4)' }}
        >
          <span className="text-[8px] font-body flex-1 text-gold-dim">
            {pricesFetching
              ? 'Fetching prices…'
              : priceAgeMinutes === null
              ? 'Prices not loaded'
              : priceAgeMinutes === 0
              ? 'Prices updated just now'
              : `Prices updated ${priceAgeMinutes}m ago`}
          </span>
          <button
            onClick={() => syncPrices(true)}
            disabled={pricesFetching}
            className="text-[8px] font-cinzel uppercase tracking-wide"
            style={{ color: pricesFetching ? '#4a4030' : '#7a6a4a', cursor: pricesFetching ? 'not-allowed' : 'pointer' }}
            title="Force-refresh all prices from Scryfall"
          >
            ↺ Refresh
          </button>
        </div>
      )}

      {/* Playtester modal */}
      {playtesterOpen && (
        <PlaytesterModal
          cards={cards}
          commander={commander}
          onClose={() => setPlaytesterOpen(false)}
        />
      )}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[7px] font-cinzel uppercase tracking-widest text-gold-dim">{label}</span>
      <span className="text-[9px] font-cinzel" style={{ color: '#8a7a5a' }}>{value}</span>
    </div>
  )
}
