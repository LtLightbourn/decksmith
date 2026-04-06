import React, { useState, useMemo } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { buildPlayerMemory, formatRelativeDate } from '../../utils/playerMemory'
import { ProGate } from '../Auth/ProGate'
import type { DeckHistoryEntry } from '../../types'

const COLOR_HEX: Record<string, string> = {
  W: '#d8d0a0', U: '#4a7fbb', B: '#8a60b0', R: '#cc3333', G: '#3a8a3a', C: '#8a7a6a',
}
const COLOR_NAME: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
}

function ColorPip({ color }: { color: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-micro font-cinzel uppercase"
      style={{
        background: `${COLOR_HEX[color] ?? '#888'}22`,
        border: `1px solid ${COLOR_HEX[color] ?? '#888'}55`,
        color: COLOR_HEX[color] ?? '#888',
      }}
    >
      {color} · {COLOR_NAME[color] ?? color}
    </span>
  )
}

function ThemeChip({ label }: { label: string }) {
  return (
    <span
      className="px-1.5 py-0.5 text-micro font-cinzel uppercase tracking-wide rounded-sm"
      style={{ background: 'rgba(140,100,40,0.15)', border: '1px solid rgba(140,100,40,0.3)', color: '#9a8050' }}
    >
      {label}
    </span>
  )
}

function HistoryEntry({
  entry,
  onLoad,
}: {
  entry: DeckHistoryEntry
  onLoad: (e: DeckHistoryEntry) => void
}) {
  return (
    <div
      className="px-3 py-2 border-b flex items-start gap-2"
      style={{ borderColor: 'rgba(40,32,20,0.3)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-label font-cinzel text-gold">
            {entry.commander?.name ?? 'No Commander'}
          </span>
          <span className="text-micro font-body italic text-gold-faint">
            {entry.name}
          </span>
          {entry.tag && (
            <span
              className="text-micro font-cinzel uppercase tracking-wide px-1.5 py-0.5 rounded-sm flex-shrink-0"
              style={{
                background: 'rgba(80,55,8,0.4)',
                border: '1px solid rgba(160,120,30,0.35)',
                color: '#c09030',
              }}
            >
              {entry.tag}
            </span>
          )}
        </div>
        {entry.summary && (
          <p className="text-micro font-body italic mt-0.5 leading-snug" style={{ color: '#7a6a50' }}>
            {entry.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-micro font-cinzel text-gold-dim">
            B{entry.bracket} · {formatRelativeDate(entry.savedAt)}
          </span>
          {entry.themes.slice(0, 3).map(t => (
            <span key={t} className="text-micro font-cinzel uppercase" style={{ color: '#6a5e44' }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => onLoad(entry)}
        className="flex-shrink-0 text-micro font-cinzel uppercase tracking-wide px-2 py-1 rounded-sm transition-all"
        style={{
          background: 'rgba(30,22,10,0.6)',
          border: '1px solid rgba(120,95,50,0.35)',
          color: '#a08040',
        }}
        title="Load this deck"
      >
        ↩ Load
      </button>
    </div>
  )
}

export default function ProfileModal() {
  const {
    profileModalOpen, setProfileModalOpen,
    playerName, setPlayerName,
    neverSuggestCards, addToNeverSuggest, removeFromNeverSuggest,
    deckHistory, loadFromHistory,
  } = useDeckStore()

  const [nameInput, setNameInput] = useState(playerName)
  const [blockInput, setBlockInput] = useState('')

  const memory = useMemo(
    () => buildPlayerMemory(deckHistory, neverSuggestCards),
    [deckHistory, neverSuggestCards],
  )

  function handleNameBlur() {
    setPlayerName(nameInput.trim())
  }

  function handleAddBlock() {
    const name = blockInput.trim()
    if (!name) return
    addToNeverSuggest(name)
    setBlockInput('')
  }

  function handleLoad(entry: DeckHistoryEntry) {
    loadFromHistory(entry)
    setProfileModalOpen(false)
  }

  if (!profileModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) setProfileModalOpen(false) }}
    >
      <div
        className="stone-bg modal-sheet relative flex flex-col"
        style={{
          background: 'rgba(14,10,5,0.99)',
          border: '1px solid rgba(120,95,55,0.5)',
          borderRadius: 4,
          boxShadow: '0 0 80px rgba(0,0,0,0.97)',
          maxWidth: 480,
          width: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="rounded-full" style={{ width: 36, height: 4, background: 'rgba(120,95,55,0.4)' }} />
        </div>
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* ── Header ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(80,65,40,0.4)', background: 'rgba(8,5,2,0.5)' }}
        >
          <div>
            <h2 className="font-cinzel-deco text-body tracking-widest text-gold">
              ✦ Grimoire
            </h2>
            <p className="text-micro font-body italic mt-px text-gold-faint">
              {memory.totalDecks} deck{memory.totalDecks !== 1 ? 's' : ''} forged · your arcane journal
            </p>
          </div>
          <button
            onClick={() => setProfileModalOpen(false)}
            className="text-heading"
            style={{ color: '#5a5040', lineHeight: 1 }}
          >✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Identity ── */}
          <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(50,40,24,0.4)' }}>
            <p className="text-micro font-cinzel uppercase tracking-[2px] mb-2" style={{ color: '#6a5e44' }}>
              Arcane Name
            </p>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={e => e.key === 'Enter' && handleNameBlur()}
              placeholder="Enter your name..."
              className="w-full px-3 py-2 text-body font-cinzel rounded-sm"
              style={{
                background: 'rgba(10,7,3,0.7)',
                border: '1px solid rgba(80,65,40,0.4)',
                color: '#c9a060',
                outline: 'none',
                letterSpacing: '1px',
              }}
            />
            {memory.totalDecks > 0 && (
              <div
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-sm"
                style={{ background: 'rgba(140,100,30,0.08)', border: '1px solid rgba(140,100,30,0.2)' }}
              >
                <span className="font-cinzel-deco text-2xl" style={{ color: '#c9a060', lineHeight: 1 }}>
                  {memory.totalDecks}
                </span>
                <div>
                  <p className="text-label font-cinzel" style={{ color: '#a08040' }}>
                    Decks Forged
                  </p>
                  <p className="text-micro font-body italic text-gold-faint">
                    your legacy grows
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Arcane Profile (auto-detected) ── */}
          <ProGate
            feature="playstyle"
            fallback={
              <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(50,40,24,0.4)' }}>
                <p className="text-micro font-cinzel uppercase tracking-[2px] mb-1 text-gold-dim">Arcane Profile</p>
                <p className="text-micro font-body italic" style={{ color: '#3a3020' }}>Upgrade to Arcane to unlock your playstyle profile.</p>
              </div>
            }
          >
          {memory.totalDecks > 0 && (
            <div className="px-5 pt-3 pb-3 border-b" style={{ borderColor: 'rgba(50,40,24,0.4)' }}>
              <p className="text-micro font-cinzel uppercase tracking-[2px] mb-2" style={{ color: '#6a5e44' }}>
                Arcane Profile
              </p>

              {memory.favoriteColors.length > 0 && (
                <div className="mb-2">
                  <p className="text-micro font-cinzel uppercase mb-1 text-gold-dim">Favorite Colors</p>
                  <div className="flex flex-wrap gap-1">
                    {memory.favoriteColors.map(c => <ColorPip key={c} color={c} />)}
                  </div>
                </div>
              )}

              {memory.preferredStrategies.length > 0 && (
                <div className="mb-2">
                  <p className="text-micro font-cinzel uppercase mb-1 text-gold-dim">Preferred Themes</p>
                  <div className="flex flex-wrap gap-1">
                    {memory.preferredStrategies.map(t => <ThemeChip key={t} label={t} />)}
                  </div>
                </div>
              )}

              {memory.commonCards.length > 0 && (
                <div>
                  <p className="text-micro font-cinzel uppercase mb-1 text-gold-dim">
                    Cards You Always Include
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {memory.commonCards.map(name => (
                      <span
                        key={name}
                        className="text-micro font-body px-1.5 py-0.5 rounded-sm"
                        style={{ background: 'rgba(30,24,10,0.7)', border: '1px solid rgba(80,65,30,0.35)', color: '#8a7a55' }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </ProGate>

          {/* ── Never-Suggest Blocklist ── */}
          <ProGate
            feature="playstyle"
            fallback={
              <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(50,40,24,0.4)' }}>
                <p className="text-micro font-cinzel uppercase tracking-[2px] mb-1 text-gold-dim">✕ Cards I Never Want</p>
                <p className="text-micro font-body italic" style={{ color: '#3a3020' }}>Arcane members can block cards from all Merlin suggestions.</p>
              </div>
            }
          >
          <div className="px-5 pt-3 pb-3 border-b" style={{ borderColor: 'rgba(50,40,24,0.4)' }}>
            <p className="text-micro font-cinzel uppercase tracking-[2px] mb-2" style={{ color: '#6a5e44' }}>
              ✕ Cards I Never Want
            </p>
            <p className="text-micro font-body italic mb-2 text-gold-dim">
              Merlin will never suggest these cards, in any deck, ever.
            </p>
            <div className="flex gap-1 mb-2">
              <input
                value={blockInput}
                onChange={e => setBlockInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBlock()}
                placeholder="Card name..."
                className="flex-1 px-2 py-1 text-label rounded-sm"
                style={{
                  background: 'rgba(10,7,3,0.7)',
                  border: '1px solid rgba(70,55,35,0.4)',
                  color: '#b0a070',
                  outline: 'none',
                  fontFamily: 'Georgia, serif',
                }}
              />
              <button
                onClick={handleAddBlock}
                className="px-2 py-1 text-micro font-cinzel uppercase rounded-sm"
                style={{
                  background: 'rgba(80,40,40,0.4)',
                  border: '1px solid rgba(120,60,60,0.4)',
                  color: '#c06060',
                }}
              >
                Block
              </button>
            </div>
            {neverSuggestCards.length === 0 ? (
              <p className="text-micro font-body italic" style={{ color: '#3a3020' }}>No cards blocked yet.</p>
            ) : (
              <div
                className="rounded-sm overflow-hidden"
                style={{ border: '1px solid rgba(60,45,28,0.35)', maxHeight: 120, overflowY: 'auto' }}
              >
                {neverSuggestCards.map(name => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-2 py-1 border-b"
                    style={{ borderColor: 'rgba(40,30,18,0.3)' }}
                  >
                    <span className="text-micro font-body" style={{ color: '#9a8060' }}>{name}</span>
                    <button
                      onClick={() => removeFromNeverSuggest(name)}
                      className="text-label px-1"
                      style={{ color: '#6a4040' }}
                      title="Remove from blocklist"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </ProGate>

          {/* ── Deck History ── */}
          <ProGate
            feature="deck-history"
            fallback={
              <div className="px-5 py-4 text-center">
                <p className="text-micro font-cinzel uppercase tracking-[2px] mb-1 text-gold-dim">Deck History</p>
                <p className="text-micro font-body italic" style={{ color: '#3a3020' }}>Arcane members can save and reload up to 20 decks from their grimoire.</p>
              </div>
            }
          >
          <div className="px-5 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-micro font-cinzel uppercase tracking-[2px]" style={{ color: '#6a5e44' }}>
                Deck History
              </p>
              <span className="text-micro font-body italic text-gold-dim">
                {deckHistory.length} / 20
              </span>
            </div>

            {deckHistory.length === 0 ? (
              <p className="text-micro font-body italic py-4 text-center" style={{ color: '#3a3020' }}>
                No decks logged yet. Use "◆ Log" in the deck panel to save a deck to your grimoire.
              </p>
            ) : (
              <div
                className="rounded-sm overflow-hidden"
                style={{ border: '1px solid rgba(60,48,28,0.4)', maxHeight: 280, overflowY: 'auto' }}
              >
                {deckHistory.map(entry => (
                  <HistoryEntry key={entry.id} entry={entry} onLoad={handleLoad} />
                ))}
              </div>
            )}
          </div>
          </ProGate>
        </div>
      </div>
    </div>
  )
}
