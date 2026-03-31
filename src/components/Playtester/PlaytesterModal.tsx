import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Card, DeckCard, BattlefieldCard, PlayPhase } from '../../types'
import { expandLibrary, dealOpeningHand, simulateOpeningHands, simulateManaByTurn } from '../../utils/deckSimulator'
import { assessOpeningHand, assessBoardState } from '../../utils/claudeApi'
import MerlinSprite from '../WizardModal/MerlinSprite'

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  cards: DeckCard[]
  commander: Card | null
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────

let uidCounter = 0
function nextUid() { return `bf-${++uidCounter}` }

function autoPosition(index: number): { x: number; y: number } {
  const cols = 6
  const col = index % cols
  const row = Math.floor(index / cols)
  return { x: 4 + col * 14, y: 8 + row * 36 }
}

const FELT_BG: React.CSSProperties = {
  background: 'radial-gradient(ellipse at 40% 40%, #1e4a20 0%, #153316 40%, #0e2310 100%)',
  backgroundImage: [
    'radial-gradient(ellipse at 40% 40%, #1e4a20 0%, #153316 40%, #0e2310 100%)',
    'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
    'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.02) 3px, rgba(0,0,0,0.02) 4px)',
  ].join(','),
}

// ── Context menu ──────────────────────────────────────────────────────────

interface ContextMenuState {
  uid: string
  x: number
  y: number
}

// ── Main component ────────────────────────────────────────────────────────

export default function PlaytesterModal({ cards, commander, onClose }: Props) {
  // ── Core game state ──
  const library = useMemo(() => expandLibrary(cards, commander), [cards, commander])

  const [phase, setPhase] = useState<PlayPhase>('opening')
  const [hand, setHand] = useState<Card[]>([])
  const [libraryPile, setLibraryPile] = useState<Card[]>([])
  const [battlefield, setBattlefield] = useState<BattlefieldCard[]>([])
  const [graveyard, setGraveyard] = useState<Card[]>([])
  const [exile, setExile] = useState<Card[]>([])
  const [turn, setTurn] = useState(1)
  const [landDropUsed, setLandDropUsed] = useState(false)
  const [lifeTotal, setLifeTotal] = useState(40)
  const [mulliganCount, setMulliganCount] = useState(0)

  // ── Merlin assessments ──
  const [handAssessment, setHandAssessment] = useState<string | null>(null)
  const [handAssessLoading, setHandAssessLoading] = useState(false)
  const [boardAssessment, setBoardAssessment] = useState<string | null>(null)
  const [boardAssessLoading, setBoardAssessLoading] = useState(false)

  // ── Stats panel ──
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsData, setStatsData] = useState<ReturnType<typeof simulateOpeningHands> | null>(null)
  const [manaData, setManaData] = useState<ReturnType<typeof simulateManaByTurn> | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // ── Context menu ──
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // ── Refs ──
  const battlefieldRef = useRef<HTMLDivElement>(null)

  // ── Init: deal opening hand ──────────────────────────────────────────────
  useEffect(() => {
    if (library.length === 0) return
    const { hand: h, rest } = dealOpeningHand(library, 7)
    setHand(h)
    setLibraryPile(rest)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch hand assessment whenever hand changes in opening phase ──────────
  useEffect(() => {
    if (phase !== 'opening' || hand.length === 0) return
    setHandAssessment(null)
    setHandAssessLoading(true)
    assessOpeningHand(hand.map(c => c.name), commander?.name ?? null)
      .then(text => setHandAssessment(text))
      .catch(() => setHandAssessment(null))
      .finally(() => setHandAssessLoading(false))
  }, [hand, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mulligan ──────────────────────────────────────────────────────────────
  function handleMulligan() {
    const newSize = Math.max(0, hand.length - 1)
    const combined = [...hand, ...libraryPile]
    const { hand: h, rest } = dealOpeningHand(combined, newSize)
    setHand(h)
    setLibraryPile(rest)
    setMulliganCount(c => c + 1)
  }

  // ── Keep hand — start game ────────────────────────────────────────────────
  function handleKeepHand() {
    setPhase('game')
    setTurn(1)
    setLandDropUsed(false)
    setBattlefield([])
    setGraveyard([])
    setExile([])
  }

  // ── Draw card ─────────────────────────────────────────────────────────────
  function handleDraw() {
    if (libraryPile.length === 0) return
    setHand(h => [...h, libraryPile[0]])
    setLibraryPile(l => l.slice(1))
  }

  // ── Next turn ─────────────────────────────────────────────────────────────
  function handleNextTurn() {
    setTurn(t => t + 1)
    setLandDropUsed(false)
    setBattlefield(bf => bf.map(bc => ({ ...bc, tapped: false })))
    setBoardAssessment(null)
    handleDraw()
  }

  // ── Untap all ─────────────────────────────────────────────────────────────
  function handleUntapAll() {
    setBattlefield(bf => bf.map(bc => ({ ...bc, tapped: false })))
  }

  // ── Play card from hand ───────────────────────────────────────────────────
  function playCard(card: Card, handIndex: number) {
    const isLand = card.typeLine.toLowerCase().includes('land')
    if (isLand && landDropUsed) return  // soft block, just don't play
    if (isLand) setLandDropUsed(true)

    setHand(h => h.filter((_, i) => i !== handIndex))
    setBattlefield(bf => [
      ...bf,
      { uid: nextUid(), card, tapped: false, ...autoPosition(bf.length) },
    ])
  }

  // ── Battlefield card updates ──────────────────────────────────────────────
  const updateBfPosition = useCallback((uid: string, pos: { x: number; y: number }) => {
    setBattlefield(bf => bf.map(bc => bc.uid === uid ? { ...bc, ...pos } : bc))
  }, [])

  function tapUntap(uid: string) {
    setBattlefield(bf => bf.map(bc => bc.uid === uid ? { ...bc, tapped: !bc.tapped } : bc))
  }

  function bfCardToGraveyard(uid: string) {
    const bc = battlefield.find(b => b.uid === uid)
    if (!bc) return
    setBattlefield(bf => bf.filter(b => b.uid !== uid))
    setGraveyard(g => [...g, bc.card])
    setContextMenu(null)
  }

  function bfCardToExile(uid: string) {
    const bc = battlefield.find(b => b.uid === uid)
    if (!bc) return
    setBattlefield(bf => bf.filter(b => b.uid !== uid))
    setExile(e => [...e, bc.card])
    setContextMenu(null)
  }

  function bfCardToHand(uid: string) {
    const bc = battlefield.find(b => b.uid === uid)
    if (!bc) return
    setBattlefield(bf => bf.filter(b => b.uid !== uid))
    setHand(h => [...h, bc.card])
    setContextMenu(null)
  }

  // ── Board assessment ──────────────────────────────────────────────────────
  function handleBoardAssessment() {
    setBoardAssessLoading(true)
    setBoardAssessment(null)
    assessBoardState(
      commander?.name ?? null,
      turn,
      lifeTotal,
      hand.map(c => c.name),
      battlefield.map(bc => bc.card.name),
    )
      .then(text => setBoardAssessment(text))
      .catch(() => setBoardAssessment('Merlin peers at the board... (could not reach the arcane proxy)'))
      .finally(() => setBoardAssessLoading(false))
  }

  // ── Stats simulation ──────────────────────────────────────────────────────
  function handleRunStats() {
    setStatsLoading(true)
    // Defer to next tick so loading spinner renders
    setTimeout(() => {
      setStatsData(simulateOpeningHands(cards, 200))
      setManaData(simulateManaByTurn(cards, 8, 200))
      setStatsLoading(false)
    }, 10)
  }

  // ── Dismiss context menu on outside click ─────────────────────────────────
  useEffect(() => {
    if (!contextMenu) return
    const dismiss = () => setContextMenu(null)
    window.addEventListener('click', dismiss)
    return () => window.removeEventListener('click', dismiss)
  }, [contextMenu])

  // ── Keyboard: Escape closes ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0a0806' }}
    >
      {/* ── Opening hand phase ─────────────────────────────────────── */}
      {phase === 'opening' && (
        <OpeningHandView
          hand={hand}
          commander={commander}
          mulliganCount={mulliganCount}
          assessment={handAssessment}
          assessLoading={handAssessLoading}
          onMulligan={handleMulligan}
          onKeepHand={handleKeepHand}
          onClose={onClose}
        />
      )}

      {/* ── Game phase ─────────────────────────────────────────────── */}
      {phase === 'game' && (
        <>
          {/* Top bar */}
          <div
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b flex-wrap"
            style={{ borderColor: 'rgba(50,42,28,0.6)', background: 'rgba(8,6,4,0.7)' }}
          >
            <span className="text-[10px] font-cinzel" style={{ color: '#c9a060' }}>
              Turn {turn}
            </span>

            {/* Life total */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLifeTotal(l => l - 1)}
                className="w-5 h-5 flex items-center justify-center text-xs rounded-sm"
                style={{ background: 'rgba(120,40,40,0.3)', color: '#c06060' }}
              >−</button>
              <span className="text-[10px] font-cinzel min-w-[36px] text-center" style={{ color: '#8a9a60' }}>
                ❤ {lifeTotal}
              </span>
              <button
                onClick={() => setLifeTotal(l => l + 1)}
                className="w-5 h-5 flex items-center justify-center text-xs rounded-sm"
                style={{ background: 'rgba(40,120,40,0.3)', color: '#60c060' }}
              >+</button>
            </div>

            <div className="gold-line" style={{ width: 1, height: 16, background: 'rgba(120,95,55,0.3)', flexShrink: 0 }} />

            {/* Zone counts */}
            <ZonePill label="Library" count={libraryPile.length} color="#6a8a6a" />
            <ZonePill label="GY" count={graveyard.length} color="#8a6a5a" />
            <ZonePill label="Exile" count={exile.length} color="#6a6a8a" />
            {!landDropUsed && (
              <span className="text-[8px] font-cinzel px-1.5 py-px rounded-sm" style={{ background: 'rgba(60,100,40,0.25)', border: '1px solid rgba(80,130,50,0.35)', color: '#80a060' }}>
                land drop available
              </span>
            )}

            <div className="flex-1" />

            {/* Actions */}
            <ActionBtn onClick={handleDraw} disabled={libraryPile.length === 0}>Draw</ActionBtn>
            <ActionBtn onClick={handleUntapAll}>Untap All</ActionBtn>
            <ActionBtn onClick={handleNextTurn} highlight>Next Turn →</ActionBtn>

            <div className="gold-line" style={{ width: 1, height: 16, background: 'rgba(120,95,55,0.3)', flexShrink: 0 }} />

            <button
              onClick={() => setStatsOpen(s => !s)}
              className="text-[9px] font-cinzel px-2 py-1 rounded-sm transition-all"
              style={{
                background: statsOpen ? 'rgba(100,80,140,0.25)' : 'rgba(14,10,5,0.5)',
                border: statsOpen ? '1px solid rgba(140,100,200,0.4)' : '1px solid rgba(50,40,24,0.4)',
                color: statsOpen ? '#b090e0' : '#5a5040',
              }}
            >◈ Stats</button>

            <button
              onClick={onClose}
              className="text-[10px] font-cinzel px-2 py-1 rounded-sm"
              style={{ color: '#6a4a4a', border: '1px solid rgba(80,50,50,0.3)' }}
            >✕ Close</button>
          </div>

          {/* Main area */}
          <div className="flex flex-1 min-h-0">
            {/* Battlefield */}
            <div
              className="flex-1 relative overflow-hidden"
              ref={battlefieldRef}
              style={FELT_BG}
              onClick={() => setContextMenu(null)}
            >
              {/* Commander zone — top-right */}
              {commander && (
                <div
                  className="absolute top-2 right-2 z-10 flex flex-col items-center gap-1"
                  style={{ width: 72 }}
                >
                  <span className="text-[7px] font-cinzel uppercase tracking-widest" style={{ color: 'rgba(200,160,60,0.5)' }}>Commander</span>
                  <img
                    src={commander.imageUri}
                    alt={commander.name}
                    style={{ width: 68, borderRadius: 4, boxShadow: '0 0 12px rgba(200,160,60,0.3), 0 2px 8px rgba(0,0,0,0.7)', border: '1px solid rgba(200,160,60,0.25)' }}
                  />
                </div>
              )}

              {/* Empty state */}
              {battlefield.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-[11px] font-body italic" style={{ color: 'rgba(80,110,60,0.4)' }}>
                    Click cards in hand to play them onto the battlefield
                  </p>
                </div>
              )}

              {/* Battlefield cards */}
              {battlefield.map(bc => (
                <BattlefieldCardView
                  key={bc.uid}
                  bc={bc}
                  battlefieldRef={battlefieldRef}
                  onUpdatePosition={updateBfPosition}
                  onContextMenu={(uid, x, y) => {
                    setContextMenu({ uid, x, y })
                  }}
                />
              ))}

              {/* Context menu */}
              {contextMenu && (
                <BfContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  uid={contextMenu.uid}
                  onTapUntap={() => { tapUntap(contextMenu.uid); setContextMenu(null) }}
                  onToGraveyard={() => bfCardToGraveyard(contextMenu.uid)}
                  onToExile={() => bfCardToExile(contextMenu.uid)}
                  onToHand={() => bfCardToHand(contextMenu.uid)}
                />
              )}

              {/* Board assessment banner */}
              {(boardAssessment || boardAssessLoading) && (
                <div
                  className="absolute bottom-2 left-2 right-20 px-3 py-2 rounded-sm"
                  style={{ background: 'rgba(20,16,30,0.92)', border: '1px solid rgba(140,100,220,0.3)', backdropFilter: 'blur(4px)' }}
                >
                  <div className="flex items-start gap-2">
                    <MerlinSprite orbState={boardAssessLoading ? 'loading' : 'success'} size={0.5} />
                    {boardAssessLoading
                      ? <span className="text-[9px] font-body italic" style={{ color: '#8060b0' }}>Merlin peers at the board…</span>
                      : <span className="text-[9px] font-body" style={{ color: '#c0a8e8', lineHeight: 1.4 }}>{boardAssessment}</span>
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Stats sidebar */}
            {statsOpen && (
              <StatsPanel
                cards={cards}
                statsData={statsData}
                manaData={manaData}
                loading={statsLoading}
                onRunStats={handleRunStats}
              />
            )}
          </div>

          {/* Hand row */}
          <div
            className="flex-shrink-0 border-t"
            style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(6,5,3,0.9)', minHeight: 148 }}
          >
            <div className="flex items-center gap-1 px-2 py-1 border-b" style={{ borderColor: 'rgba(40,32,20,0.4)' }}>
              <span className="text-[8px] font-cinzel uppercase tracking-widest" style={{ color: '#5a5040' }}>
                Hand ({hand.length})
              </span>
              {turn >= 5 && (
                <button
                  onClick={handleBoardAssessment}
                  disabled={boardAssessLoading}
                  className="ml-auto flex items-center gap-1.5 px-2 py-[3px] rounded-sm"
                  style={{
                    background: 'rgba(40,20,60,0.7)',
                    border: '1px solid rgba(140,90,220,0.35)',
                    color: boardAssessLoading ? '#4a3060' : '#b090e0',
                    cursor: boardAssessLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <MerlinSprite orbState={boardAssessLoading ? 'loading' : 'idle'} size={0.4} />
                  <span className="text-[8px] font-cinzel">How am I doing?</span>
                </button>
              )}
            </div>

            <div className="flex gap-2 px-2 py-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {hand.length === 0 && (
                <p className="text-[10px] font-body italic py-4 px-2" style={{ color: '#3a3028' }}>Empty hand</p>
              )}
              {hand.map((card, i) => (
                <HandCardView
                  key={`${card.id}-${i}`}
                  card={card}
                  isLand={card.typeLine.toLowerCase().includes('land')}
                  landDropUsed={landDropUsed}
                  onClick={() => playCard(card, i)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Opening Hand View ─────────────────────────────────────────────────────

function OpeningHandView({
  hand, commander, mulliganCount, assessment, assessLoading,
  onMulligan, onKeepHand, onClose,
}: {
  hand: Card[]
  commander: Card | null
  mulliganCount: number
  assessment: string | null
  assessLoading: boolean
  onMulligan: () => void
  onKeepHand: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: 'rgba(8,6,4,0.97)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: 'rgba(80,65,40,0.4)', background: 'rgba(6,4,2,0.7)' }}
      >
        <div>
          <h2 className="font-cinzel-deco text-base tracking-widest" style={{ color: '#c9a060' }}>
            Opening Hand
          </h2>
          {mulliganCount > 0 && (
            <p className="text-[9px] font-cinzel" style={{ color: '#6a5040' }}>
              Mulligan {mulliganCount} — drawing {hand.length} cards
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-[11px] font-cinzel" style={{ color: '#5a4030' }}>✕ Close</button>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-6 overflow-auto">
        <div className="flex gap-3 flex-wrap justify-center">
          {hand.map((card, i) => (
            <div key={`${card.id}-${i}`} className="flex flex-col items-center gap-1">
              {card.imageUri
                ? <img src={card.imageUri} alt={card.name} style={{ height: 160, borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.7)' }} />
                : <div className="flex items-center justify-center rounded-md text-[10px] font-cinzel text-center px-2"
                    style={{ height: 160, width: 115, background: 'rgba(30,24,16,0.8)', border: '1px solid rgba(80,65,40,0.4)', color: '#8a7a5a' }}>
                    {card.name}
                  </div>
              }
              <span className="text-[8px] font-cinzel text-center max-w-[100px] truncate" style={{ color: '#6a5e44' }}>{card.name}</span>
            </div>
          ))}
        </div>

        {/* Merlin assessment */}
        <div
          className="max-w-xl w-full px-4 py-3 rounded-sm flex items-start gap-3"
          style={{ background: 'rgba(20,15,30,0.6)', border: '1px solid rgba(120,90,200,0.25)' }}
        >
          <MerlinSprite orbState={assessLoading ? 'loading' : assessment ? 'success' : 'idle'} size={0.7} />
          <div className="flex-1">
            <p className="text-[9px] font-cinzel uppercase tracking-widest mb-1" style={{ color: '#6a5e7a' }}>Merlin's Assessment</p>
            {assessLoading && (
              <p className="text-[10px] font-body italic" style={{ color: '#6050a0' }}>Reading the arcane currents…</p>
            )}
            {!assessLoading && assessment && (
              <p className="text-[11px] font-body leading-relaxed" style={{ color: '#c0a8e8' }}>{assessment}</p>
            )}
            {!assessLoading && !assessment && (
              <p className="text-[10px] font-body italic" style={{ color: '#4a4050' }}>Assessment unavailable</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onMulligan}
            disabled={hand.length === 0}
            className="px-6 py-2 font-cinzel uppercase tracking-widest rounded-sm transition-all"
            style={{
              background: 'rgba(60,20,20,0.5)',
              border: '1px solid rgba(120,50,50,0.4)',
              color: hand.length === 0 ? '#3a2a2a' : '#c06060',
              cursor: hand.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Mulligan ({hand.length > 0 ? hand.length - 1 : 0})
          </button>
          <button
            onClick={onKeepHand}
            className="px-6 py-2 font-cinzel uppercase tracking-widest rounded-sm transition-all"
            style={{
              background: 'rgba(20,50,20,0.6)',
              border: '1px solid rgba(50,120,50,0.4)',
              color: '#60c060',
            }}
          >
            Keep Hand ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hand card view ────────────────────────────────────────────────────────

function HandCardView({ card, isLand, landDropUsed, onClick }: {
  card: Card
  isLand: boolean
  landDropUsed: boolean
  onClick: () => void
}) {
  const blocked = isLand && landDropUsed
  return (
    <button
      onClick={blocked ? undefined : onClick}
      className="flex-shrink-0 relative group transition-transform"
      style={{
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.5 : 1,
        transform: 'translateY(0)',
      }}
      onMouseEnter={e => { if (!blocked) (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
      title={blocked ? 'Land drop already used this turn' : `Play ${card.name}`}
    >
      {card.imageUri
        ? <img src={card.imageUri} alt={card.name} style={{ height: 115, borderRadius: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.6)' }} />
        : <div className="flex items-center justify-center text-[9px] font-cinzel text-center px-2"
            style={{ height: 115, width: 82, background: 'rgba(30,24,16,0.8)', border: '1px solid rgba(80,65,40,0.4)', borderRadius: 4, color: '#8a7a5a' }}>
            {card.name}
          </div>
      }
      {/* Play hint overlay */}
      {!blocked && (
        <div className="absolute inset-0 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <span className="text-[8px] font-cinzel uppercase tracking-wide" style={{ color: '#c9a060' }}>Play</span>
        </div>
      )}
    </button>
  )
}

// ── Battlefield card view (pointer-capture drag) ───────────────────────────

function BattlefieldCardView({
  bc, battlefieldRef, onUpdatePosition, onContextMenu,
}: {
  bc: BattlefieldCard
  battlefieldRef: React.RefObject<HTMLDivElement | null>
  onUpdatePosition: (uid: string, pos: { x: number; y: number }) => void
  onContextMenu: (uid: string, x: number, y: number) => void
}) {
  const isDragging = useRef(false)
  const dragStart = useRef({ clientX: 0, clientY: 0, origX: 0, origY: 0 })
  const didMove = useRef(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    didMove.current = false
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, origX: bc.x, origY: bc.y }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const rect = battlefieldRef.current?.getBoundingClientRect()
    if (!rect) return
    const dx = ((e.clientX - dragStart.current.clientX) / rect.width) * 100
    const dy = ((e.clientY - dragStart.current.clientY) / rect.height) * 100
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) didMove.current = true
    onUpdatePosition(bc.uid, {
      x: Math.max(0, Math.min(88, dragStart.current.origX + dx)),
      y: Math.max(0, Math.min(86, dragStart.current.origY + dy)),
    })
  }

  function handlePointerUp() {
    isDragging.current = false
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(bc.uid, e.clientX, e.clientY)
  }

  // On touch: long-press for context menu
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleTouchStart(e: React.TouchEvent) {
    longPressTimer.current = setTimeout(() => {
      const t = e.touches[0]
      onContextMenu(bc.uid, t.clientX, t.clientY)
    }, 600)
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  return (
    <div
      className="absolute select-none"
      style={{
        left: `${bc.x}%`,
        top: `${bc.y}%`,
        transform: bc.tapped ? 'rotate(90deg)' : 'none',
        transformOrigin: '50% 60%',
        transition: isDragging.current ? 'none' : 'transform 0.2s ease',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        zIndex: isDragging.current ? 20 : 1,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {bc.card.imageUri
        ? <img
            src={bc.card.imageUri}
            alt={bc.card.name}
            style={{
              width: 68,
              borderRadius: 4,
              boxShadow: bc.tapped
                ? '0 2px 8px rgba(0,0,0,0.5)'
                : '0 3px 12px rgba(0,0,0,0.7)',
              border: bc.tapped ? '1px solid rgba(200,140,40,0.3)' : 'none',
              pointerEvents: 'none',
            }}
            draggable={false}
          />
        : <div
            style={{
              width: 68, height: 96, borderRadius: 4,
              background: 'rgba(30,24,16,0.9)',
              border: '1px solid rgba(80,65,40,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 8, color: '#8a7a5a', textAlign: 'center', padding: 4, fontFamily: 'Georgia, serif' }}>
              {bc.card.name}
            </span>
          </div>
      }
    </div>
  )
}

// ── Battlefield context menu ──────────────────────────────────────────────

function BfContextMenu({ x, y, uid, onTapUntap, onToGraveyard, onToExile, onToHand }: {
  x: number; y: number; uid: string
  onTapUntap: () => void
  onToGraveyard: () => void
  onToExile: () => void
  onToHand: () => void
}) {
  // Clamp to viewport
  const menuW = 160
  const menuH = 140
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const items = [
    { label: '⟳ Tap / Untap', onClick: onTapUntap },
    { label: '💀 Move to Graveyard', onClick: onToGraveyard },
    { label: '◈ Move to Exile', onClick: onToExile },
    { label: '↩ Return to Hand', onClick: onToHand },
  ]

  return (
    <div
      className="fixed z-50 rounded-sm overflow-hidden"
      style={{
        left, top, width: menuW,
        background: 'rgba(14,10,6,0.98)',
        border: '1px solid rgba(100,80,45,0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {items.map(item => (
        <button
          key={item.label}
          onClick={item.onClick}
          className="w-full text-left px-3 py-[7px] text-[10px] font-cinzel hover:bg-[rgba(180,140,60,0.08)] transition-colors"
          style={{ color: '#a09060', borderBottom: '1px solid rgba(60,50,30,0.3)' }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ── Stats panel ───────────────────────────────────────────────────────────

function StatsPanel({ cards, statsData, manaData, loading, onRunStats }: {
  cards: DeckCard[]
  statsData: ReturnType<typeof simulateOpeningHands> | null
  manaData: ReturnType<typeof simulateManaByTurn> | null
  loading: boolean
  onRunStats: () => void
}) {
  return (
    <div
      className="flex-shrink-0 flex flex-col border-l overflow-y-auto"
      style={{ width: 240, borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(8,6,4,0.9)' }}
    >
      <div className="flex-shrink-0 px-3 py-2 border-b" style={{ borderColor: 'rgba(50,42,28,0.4)' }}>
        <p className="text-[9px] font-cinzel uppercase tracking-[3px]" style={{ color: '#c9a060' }}>◈ Simulation Stats</p>
        <p className="text-[8px] font-body italic mt-0.5" style={{ color: '#4a4030' }}>200 simulated opening hands</p>
      </div>

      <div className="flex-1 px-3 py-3 space-y-4">
        {!statsData && (
          <button
            onClick={onRunStats}
            disabled={loading}
            className="w-full py-2 font-cinzel uppercase tracking-widest text-[9px] rounded-sm transition-all"
            style={{
              background: loading ? 'rgba(20,15,8,0.5)' : 'rgba(30,22,10,0.6)',
              border: '1px solid rgba(100,80,40,0.4)',
              color: loading ? '#4a4030' : '#c9a060',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Simulating…' : '⟳ Run Simulation'}
          </button>
        )}

        {statsData && (
          <>
            {/* Opening hand section */}
            <div>
              <p className="text-[8px] font-cinzel uppercase tracking-widest mb-2" style={{ color: '#6a5e44' }}>Opening Hand Lands</p>
              <StatRow label="Avg lands" value={statsData.avgLands.toFixed(2)} />
              <StatRow label="2+ lands" value={pct(statsData.prob2Lands)} />
              <StatRow label="3+ lands" value={pct(statsData.prob3Lands)} highlight={statsData.prob3Lands > 0.7} />
              <StatRow label="4+ lands" value={pct(statsData.prob4Lands)} />
            </div>

            <div className="gold-line" />

            {/* Mana by turn */}
            {manaData && (
              <div>
                <p className="text-[8px] font-cinzel uppercase tracking-widest mb-2" style={{ color: '#6a5e44' }}>Avg Mana by Turn</p>
                {manaData.map(({ turn, avgMana }) => (
                  <div key={turn} className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-cinzel w-8 flex-shrink-0" style={{ color: '#5a5040' }}>T{turn}</span>
                    <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ background: 'rgba(30,24,16,0.6)' }}>
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${Math.min(100, (avgMana / 8) * 100)}%`,
                          background: `rgba(${80 + turn * 10}, ${130 - turn * 5}, 60, 0.7)`,
                        }}
                      />
                    </div>
                    <span className="text-[8px] font-cinzel w-6 text-right flex-shrink-0" style={{ color: '#8a7a5a' }}>
                      {avgMana.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="gold-line" />

            {/* Most common opening hand cards */}
            <div>
              <p className="text-[8px] font-cinzel uppercase tracking-widest mb-2" style={{ color: '#6a5e44' }}>Most Common in Hand</p>
              {statsData.cardFrequency.slice(0, 8).map(({ name, frequency }) => (
                <div key={name} className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-body flex-1 truncate" style={{ color: '#7a7060' }}>{name}</span>
                  <span className="text-[8px] font-cinzel flex-shrink-0" style={{ color: frequency > 0.5 ? '#c9a060' : '#5a5040' }}>
                    {pct(frequency)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onRunStats}
              className="w-full py-1 text-[8px] font-cinzel uppercase tracking-widest rounded-sm"
              style={{ color: '#4a4030', border: '1px solid rgba(50,40,24,0.3)' }}
            >
              ⟳ Re-run
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Small shared components ───────────────────────────────────────────────

function ZonePill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className="text-[8px] font-cinzel px-1.5 py-px rounded-sm flex-shrink-0"
      style={{ background: 'rgba(20,16,10,0.6)', border: `1px solid ${color}33`, color }}>
      {label}: {count}
    </span>
  )
}

function ActionBtn({ onClick, disabled, highlight, children }: {
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[9px] font-cinzel uppercase tracking-wide px-2 py-1 rounded-sm transition-all flex-shrink-0"
      style={{
        background: highlight ? 'rgba(40,60,20,0.6)' : 'rgba(20,16,10,0.6)',
        border: highlight ? '1px solid rgba(80,120,40,0.5)' : '1px solid rgba(60,50,30,0.4)',
        color: disabled ? '#3a3028' : highlight ? '#90c060' : '#8a7a5a',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center mb-1">
      <span className="text-[8px] font-body" style={{ color: '#5a5040' }}>{label}</span>
      <span className="text-[9px] font-cinzel" style={{ color: highlight ? '#c9a060' : '#8a7a5a' }}>{value}</span>
    </div>
  )
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}
