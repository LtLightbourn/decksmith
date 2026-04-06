import React, { useState, useMemo } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { generateProxyPDF, buildPrintCards } from '../../utils/proxyPdf'
import type { PrintOptions, PaperSize } from '../../utils/proxyPdf'

type Tab = 'print' | 'collection'

const TOGGLE_BTN = (active: boolean, onClick: () => void, children: React.ReactNode) => (
  <button
    onClick={onClick}
    className="px-2 py-1 text-micro font-cinzel uppercase tracking-wide rounded-sm transition-all"
    style={{
      background: active ? 'rgba(140,110,50,0.25)' : 'rgba(14,10,5,0.6)',
      border: active ? '1px solid rgba(180,140,50,0.4)' : '1px solid rgba(50,40,24,0.4)',
      color: active ? '#c9a060' : '#5a5040',
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
)

export default function ProxySheetModal() {
  const {
    proxySheetOpen, setProxySheetOpen,
    cards, commander, proxyCardIds,
    savedDecks, proxyPerDeck, activeDeckName,
  } = useDeckStore()

  const [tab, setTab] = useState<Tab>('print')
  const [options, setOptions] = useState<PrintOptions>({
    paper: 'letter',
    cardNames: false,
    cutLines: true,
    printMode: 'proxy',
  })
  const [progress, setProgress] = useState<{ fetched: number; total: number } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cards that will appear on the sheet
  const printCards = useMemo(
    () => buildPrintCards(cards, proxyCardIds, options.printMode),
    [cards, proxyCardIds, options.printMode],
  )

  const totalSheets = useMemo(() => {
    const total = printCards.reduce((s, c) => s + c.qty, 0)
    return Math.ceil(total / 9)
  }, [printCards])

  // My Collection: cards across all saved decks NOT in their proxy list
  const ownedCards = useMemo(() => {
    const map = new Map<string, { name: string; deckNames: string[] }>()
    for (const deck of savedDecks) {
      const proxied = new Set(proxyPerDeck[deck.id] ?? [])
      for (const dc of deck.cards) {
        if (!proxied.has(dc.card.id)) {
          const existing = map.get(dc.card.id)
          if (existing) {
            if (!existing.deckNames.includes(deck.name)) existing.deckNames.push(deck.name)
          } else {
            map.set(dc.card.id, { name: dc.card.name, deckNames: [deck.name] })
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [savedDecks, proxyPerDeck])

  async function handleGenerate() {
    if (printCards.length === 0) return
    setIsGenerating(true)
    setError(null)
    setProgress({ fetched: 0, total: 0 })

    try {
      await generateProxyPDF(
        printCards,
        options,
        activeDeckName,
        (fetched, total) => setProgress({ fetched, total }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  if (!proxySheetOpen) return null

  const SECTION_LABEL: React.CSSProperties = {
    fontFamily: 'Cinzel, serif',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6a5e44',
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) setProxySheetOpen(false) }}
    >
      <div
        className="stone-bg modal-sheet relative flex flex-col"
        style={{
          background: 'rgba(18,13,8,0.98)',
          border: '1px solid rgba(120,95,55,0.5)',
          borderRadius: 4,
          boxShadow: '0 0 60px rgba(0,0,0,0.95)',
          maxWidth: 520,
          width: '92vw',
          maxHeight: '88vh',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="rounded-full" style={{ width: 36, height: 4, background: 'rgba(120,95,55,0.4)' }} />
        </div>
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(80,65,40,0.4)', background: 'rgba(8,6,4,0.5)' }}
        >
          <div>
            <h2 className="font-cinzel-deco text-body tracking-widest text-gold">
              ⎙ Proxy Sheet Generator
            </h2>
            <p className="text-micro font-body italic mt-px" style={{ color: '#6a5e44' }}>
              {commander?.name ?? 'No commander'} · {activeDeckName}
            </p>
          </div>
          <button
            onClick={() => setProxySheetOpen(false)}
            className="text-heading"
            style={{ color: '#5a5040', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b" style={{ borderColor: 'rgba(60,50,30,0.5)' }}>
          {(['print', 'collection'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-label font-cinzel uppercase tracking-widest"
              style={{
                color: tab === t ? '#c9a060' : '#4a4030',
                borderBottom: tab === t ? '1px solid #c9a060' : '1px solid transparent',
                background: tab === t ? 'rgba(180,140,50,0.05)' : 'transparent',
              }}
            >
              {t === 'print' ? '⎙ Print Sheet' : '◈ My Collection'}
            </button>
          ))}
        </div>

        {/* ── PRINT TAB ── */}
        {tab === 'print' && (
          <div className="flex-1 overflow-y-auto">
            {/* Options */}
            <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(50,40,28,0.4)' }}>
              <p className="text-micro mb-3" style={SECTION_LABEL}>Print Options</p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {/* Paper size */}
                <div>
                  <p className="text-micro font-cinzel uppercase mb-1.5 text-gold-faint">Paper Size</p>
                  <div className="flex gap-1">
                    {(['letter', 'a4'] as PaperSize[]).map(p => TOGGLE_BTN(
                      options.paper === p,
                      () => setOptions(o => ({ ...o, paper: p })),
                      p === 'letter' ? 'Letter 8.5×11"' : 'A4 210×297mm',
                    ))}
                  </div>
                </div>

                {/* Print mode */}
                <div>
                  <p className="text-micro font-cinzel uppercase mb-1.5 text-gold-faint">Cards to Print</p>
                  <div className="flex gap-1">
                    {TOGGLE_BTN(
                      options.printMode === 'proxy',
                      () => setOptions(o => ({ ...o, printMode: 'proxy' })),
                      'Proxy only',
                    )}
                    {TOGGLE_BTN(
                      options.printMode === 'all',
                      () => setOptions(o => ({ ...o, printMode: 'all' })),
                      'All cards',
                    )}
                  </div>
                </div>

                {/* Card names */}
                <div>
                  <p className="text-micro font-cinzel uppercase mb-1.5 text-gold-faint">Card Name Below Image</p>
                  <div className="flex gap-1">
                    {TOGGLE_BTN(options.cardNames, () => setOptions(o => ({ ...o, cardNames: true })), 'Show')}
                    {TOGGLE_BTN(!options.cardNames, () => setOptions(o => ({ ...o, cardNames: false })), 'Hide')}
                  </div>
                </div>

                {/* Cut lines */}
                <div>
                  <p className="text-micro font-cinzel uppercase mb-1.5 text-gold-faint">Cut Lines</p>
                  <div className="flex gap-1">
                    {TOGGLE_BTN(options.cutLines, () => setOptions(o => ({ ...o, cutLines: true })), 'Show')}
                    {TOGGLE_BTN(!options.cutLines, () => setOptions(o => ({ ...o, cutLines: false })), 'Hide')}
                  </div>
                </div>
              </div>
            </div>

            {/* Card list preview */}
            <div className="px-5 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro" style={SECTION_LABEL}>
                  {printCards.reduce((s, c) => s + c.qty, 0)} cards · {totalSheets} page{totalSheets !== 1 ? 's' : ''} (3×3)
                </p>
                {printCards.length === 0 && options.printMode === 'proxy' && (
                  <span className="text-micro font-body italic" style={{ color: '#5a3a3a' }}>
                    No cards marked for proxy
                  </span>
                )}
              </div>

              <div
                className="space-y-px overflow-y-auto rounded-sm"
                style={{ maxHeight: 200, background: 'rgba(10,7,3,0.5)', border: '1px solid rgba(50,40,24,0.3)' }}
              >
                {printCards.length === 0 ? (
                  <p className="px-3 py-4 text-label font-body italic text-center" style={{ color: '#4a3a28' }}>
                    {options.printMode === 'proxy'
                      ? 'Enable Proxy Mode in the deck panel and check cards you need to print.'
                      : 'No cards in deck.'}
                  </p>
                ) : (
                  printCards.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1 border-b"
                      style={{ borderColor: 'rgba(40,32,20,0.3)' }}
                    >
                      <span className="text-micro font-cinzel w-4 text-right flex-shrink-0" style={{ color: '#6a5e44' }}>
                        {c.qty}×
                      </span>
                      <span className="flex-1 truncate text-label font-body" style={{ color: '#a89860' }}>
                        {c.name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Progress + Generate */}
            <div className="px-5 pb-5">
              {progress && (
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-micro font-cinzel" style={{ color: '#8a7a5a' }}>
                      Gathering card images…
                    </span>
                    <span className="text-micro font-cinzel" style={{ color: '#6a5a3a' }}>
                      {progress.fetched}/{progress.total}
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-sm overflow-hidden"
                    style={{ background: 'rgba(30,24,16,0.8)', border: '1px solid rgba(60,50,30,0.3)' }}
                  >
                    <div
                      className="h-full rounded-sm transition-all duration-300"
                      style={{
                        width: progress.total > 0 ? `${(progress.fetched / progress.total) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, rgba(140,110,50,0.6), rgba(180,140,60,0.9))',
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-micro font-body italic mb-3 text-center" style={{ color: '#8a3030' }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || printCards.length === 0}
                className="w-full py-2.5 font-cinzel uppercase tracking-widest text-label rounded-sm transition-all"
                style={{
                  background: isGenerating || printCards.length === 0
                    ? 'rgba(30,24,14,0.5)'
                    : 'linear-gradient(135deg, rgba(55,40,14,0.9), rgba(35,26,8,0.95))',
                  border: `1px solid ${printCards.length > 0 ? 'rgba(160,120,45,0.45)' : 'rgba(50,40,24,0.3)'}`,
                  color: printCards.length === 0 ? '#3a3020' : isGenerating ? '#7a6030' : '#c9a060',
                  cursor: isGenerating || printCards.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isGenerating
                  ? 'Generating PDF…'
                  : printCards.length === 0
                    ? 'No cards to print'
                    : `⎙ Generate PDF — ${activeDeckName}-proxies.pdf`}
              </button>
            </div>
          </div>
        )}

        {/* ── COLLECTION TAB ── */}
        {tab === 'collection' && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-micro font-body italic mb-3" style={{ color: '#6a5e44' }}>
              Cards marked as owned (not checked for proxy) across all saved decks.
            </p>

            {ownedCards.length === 0 ? (
              <p className="text-center text-label font-body italic py-8" style={{ color: '#4a3a28' }}>
                Enable Proxy Mode, save your decks, and uncheck the cards you own. They'll appear here.
              </p>
            ) : (
              <div
                className="rounded-sm overflow-hidden"
                style={{ border: '1px solid rgba(50,40,24,0.4)' }}
              >
                <div
                  className="px-3 py-1.5 border-b"
                  style={{ background: 'rgba(20,15,8,0.7)', borderColor: 'rgba(50,40,24,0.4)' }}
                >
                  <p className="text-micro" style={SECTION_LABEL}>{ownedCards.length} owned cards</p>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
                  {ownedCards.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-1.5 border-b"
                      style={{ borderColor: 'rgba(40,32,20,0.3)', background: i % 2 === 0 ? 'transparent' : 'rgba(15,10,5,0.3)' }}
                    >
                      <span className="flex-1 truncate text-label font-body" style={{ color: '#a89860' }}>
                        {c.name}
                      </span>
                      <span className="flex-shrink-0 text-micro font-body italic text-gold-faint">
                        {c.deckNames.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
