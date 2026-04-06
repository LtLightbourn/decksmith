import React, { useState, useEffect } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { fetchCardByName } from '../../hooks/useScryfall'
import { validateAndCleanDecklist } from '../../utils/deckValidation'
import type { SharedDeckWire } from '../../utils/deckParser'
import type { Card, DeckCard } from '../../types'
import { BRACKET_LABELS } from '../../utils/bracketData'

interface Props {
  deck: SharedDeckWire
  onClose: () => void
}

type Phase = 'preview' | 'loading' | 'done'

const BRACKET_COLORS: Record<number, string> = {
  1: '#5a9a5a', 2: '#7aaa4a', 3: '#c09030', 4: '#cc4444',
}

export default function SharedDeckModal({ deck, onClose }: Props) {
  const { loadDeckCards, addToast } = useDeckStore()

  const [phase, setPhase] = useState<Phase>('preview')
  const [commanderCard, setCommanderCard] = useState<Card | null>(null)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })

  // Fetch commander image for preview
  useEffect(() => {
    if (!deck.c) return
    fetchCardByName(deck.c).then(c => setCommanderCard(c ?? null))
  }, [deck.c])

  const totalCards = deck.cards.reduce((s, c) => s + c.q, 0)
  const bracketInfo = BRACKET_LABELS[deck.b as 1 | 2 | 3 | 4] ?? { name: 'Unknown', color: '#888' }
  const bracketColor = BRACKET_COLORS[deck.b] ?? '#888'

  async function handleImport() {
    setPhase('loading')
    const allNames = deck.cards.map(c => c.n)
    setProgress({ loaded: 0, total: allNames.length })

    // Fetch in chunks of 10 with rate-limit spacing — mirrors fetchCardsByNames
    const found: Card[] = []
    const notFound: string[] = []
    const chunks: string[][] = []
    for (let i = 0; i < allNames.length; i += 10) {
      chunks.push(allNames.slice(i, i + 10))
    }

    let loadedCount = 0
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (name) => {
          const card = await fetchCardByName(name)
          loadedCount++
          setProgress({ loaded: loadedCount, total: allNames.length })
          if (card) found.push(card as Card)
          else notFound.push(name)
        })
      )
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 120))
      }
    }

    // Fetch commander
    let cmdCard: Card | null = commanderCard
    if (!cmdCard && deck.c) {
      cmdCard = await fetchCardByName(deck.c)
    }

    const rawDeckCards: DeckCard[] = found
      .filter((c): c is Card => c !== null)
      .map(c => ({ card: c, qty: 1 }))

    const { cards: cleanCards, hadDuplicates } = validateAndCleanDecklist(rawDeckCards, cmdCard)

    loadDeckCards(cmdCard, cleanCards)

    if (hadDuplicates) addToast('Duplicate cards merged automatically', 'warning')
    if (notFound.length > 0) {
      addToast(`${notFound.length} card${notFound.length > 1 ? 's' : ''} not found — skipped`, 'warning')
    }
    addToast(`Loaded "${deck.n}" — ${cleanCards.length} cards`, 'success')
    setPhase('done')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="stone-bg relative flex flex-col"
        style={{
          maxWidth: 420,
          width: '90vw',
          background: 'rgba(18,12,6,0.99)',
          border: '1px solid rgba(120,95,55,0.5)',
          borderRadius: 4,
          boxShadow: '0 0 80px rgba(0,0,0,0.97)',
        }}
      >
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* Commander art banner */}
        <div
          className="relative overflow-hidden rounded-t"
          style={{ height: 140, background: 'rgba(8,6,3,0.9)' }}
        >
          {commanderCard?.imageUri ? (
            <img
              src={commanderCard.imageUri}
              alt={commanderCard.name}
              style={{
                position: 'absolute',
                width: '100%',
                top: '-18%',
                objectFit: 'cover',
                filter: 'brightness(0.7)',
              }}
              draggable={false}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ fontSize: 40, color: 'rgba(120,95,55,0.3)' }}
            >
              ♛
            </div>
          )}

          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(18,12,6,1) 0%, rgba(18,12,6,0.4) 60%, transparent 100%)' }}
          />

          {/* Deck info over gradient */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
            <p className="font-cinzel-deco text-[13px] leading-tight" style={{ color: '#e0c070', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              {deck.n}
            </p>
            {deck.c && (
              <p className="font-cinzel text-[10px] mt-0.5" style={{ color: '#a08050' }}>
                ♛ {deck.c}
              </p>
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'rgba(60,50,30,0.4)' }}>
          <div
            className="px-2 py-0.5 rounded-sm text-[9px] font-cinzel uppercase tracking-widest"
            style={{
              background: `${bracketColor}18`,
              border: `1px solid ${bracketColor}44`,
              color: bracketColor,
            }}
          >
            B{deck.b} · {bracketInfo.name}
          </div>
          <span className="text-[9px] font-cinzel text-gold-faint">
            {totalCards} cards
          </span>
          <span className="text-[8px] font-body italic ml-auto" style={{ color: '#3a3020' }}>
            Shared deck
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {phase === 'preview' && (
            <>
              <p className="font-body text-[11px] italic mb-4" style={{ color: '#6a5e44' }}>
                Someone shared this Commander deck with you. Load it into Decksmith to explore and edit it.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 text-[10px] font-cinzel uppercase tracking-widest rounded-sm transition-colors"
                  style={{
                    background: 'rgba(20,16,10,0.8)',
                    border: '1px solid rgba(60,50,30,0.4)',
                    color: '#5a5040',
                  }}
                >
                  Dismiss
                </button>
                <button
                  onClick={handleImport}
                  className="py-2 px-6 text-[10px] font-cinzel uppercase tracking-widest rounded-sm transition-all"
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, rgba(60,44,14,0.8), rgba(40,28,6,0.9))',
                    border: '1px solid rgba(180,140,40,0.45)',
                    color: '#f0c060',
                  }}
                >
                  ✦ Import This Deck
                </button>
              </div>
            </>
          )}

          {phase === 'loading' && (
            <div className="text-center py-2">
              <p className="font-cinzel text-[11px] mb-1 text-gold">
                Loading deck...
              </p>
              <p className="font-body text-[10px] italic mb-3" style={{ color: '#6a5e44' }}>
                Fetching cards from Scryfall ({progress.loaded}/{progress.total})
              </p>
              {/* Progress bar */}
              <div
                className="h-1 rounded-sm overflow-hidden"
                style={{ background: 'rgba(30,24,16,0.8)', border: '1px solid rgba(60,50,30,0.3)' }}
              >
                <div
                  className="h-full rounded-sm transition-all duration-200"
                  style={{
                    width: `${progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, rgba(180,140,50,0.6), rgba(200,160,60,0.9))',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
