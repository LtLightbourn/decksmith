import React, { useState, useRef, useEffect } from 'react'
import { useDeckStore } from '../../store/deckStore'
import type { DeckVersion, DeckCard } from '../../types'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit',
  }) + ' ' + new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

interface DiffSummary {
  added: number
  removed: number
  priceDelta: number // positive = version is more expensive than current
}

function computeDiff(version: DeckVersion, currentCards: DeckCard[]): DiffSummary {
  const versionNames = new Set(version.cards.map(dc => dc.card.name))
  const currentNames = new Set(currentCards.map(dc => dc.card.name))

  const added   = version.cards.filter(dc => !currentNames.has(dc.card.name)).length
  const removed = currentCards.filter(dc => !versionNames.has(dc.card.name)).length
  const priceDelta = version.deckValue - currentCards.reduce((s, dc) => s + (dc.card.priceUsd ?? 0) * dc.qty, 0)

  return { added, removed, priceDelta }
}

interface VersionRowProps {
  version: DeckVersion
  isHovered: boolean
  onHover: (id: string | null) => void
  onRestore: (v: DeckVersion) => void
  onDelete: (id: string) => void
  diff: DiffSummary
}

function VersionRow({ version, isHovered, onHover, onRestore, onDelete, diff }: VersionRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="border-b"
      style={{ borderColor: 'rgba(40,32,20,0.35)' }}
      onMouseEnter={() => onHover(version.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-cinzel leading-tight" style={{ color: '#c0a060' }}>
            {version.label}
          </p>
          <p className="text-[8px] font-body mt-0.5" style={{ color: '#4a4030' }}>
            {formatDate(version.savedAt)} · {version.cardCount} cards
            {version.deckValue > 0 && ` · $${version.deckValue.toFixed(0)}`}
          </p>

          {/* Diff tooltip — shown on hover */}
          {isHovered && (diff.added > 0 || diff.removed > 0 || Math.abs(diff.priceDelta) > 0.5) && (
            <div
              className="mt-1 px-2 py-1 rounded-sm text-[8px] font-body"
              style={{
                background: 'rgba(30,22,10,0.8)',
                border: '1px solid rgba(100,80,35,0.3)',
                color: '#8a7a50',
              }}
            >
              vs. current:
              {diff.added > 0 && <span style={{ color: '#5a9a5a' }}> +{diff.added} cards</span>}
              {diff.removed > 0 && <span style={{ color: '#aa4444' }}> -{diff.removed} cards</span>}
              {Math.abs(diff.priceDelta) > 0.5 && (
                <span style={{ color: diff.priceDelta > 0 ? '#aa4444' : '#5a9a5a' }}>
                  {' '}{diff.priceDelta > 0 ? '+' : ''}{diff.priceDelta >= 0 ? '' : ''}
                  ${Math.abs(diff.priceDelta).toFixed(2)} {diff.priceDelta > 0 ? 'pricier' : 'cheaper'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          {confirmDelete ? (
            <>
              <button
                onClick={() => onDelete(version.id)}
                className="text-[8px] font-cinzel uppercase px-1.5 py-0.5 rounded-sm transition-all"
                style={{ background: 'rgba(120,30,20,0.5)', border: '1px solid rgba(180,50,40,0.5)', color: '#cc4444' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[8px] font-cinzel uppercase px-1.5 py-0.5 rounded-sm"
                style={{ background: 'rgba(20,16,10,0.5)', border: '1px solid rgba(60,50,30,0.4)', color: '#5a5040' }}
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onRestore(version)}
                className="text-[8px] font-cinzel uppercase px-1.5 py-0.5 rounded-sm transition-all"
                style={{ background: 'rgba(30,22,10,0.6)', border: '1px solid rgba(140,105,40,0.4)', color: '#a08040' }}
              >
                ↩ Restore
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[8px] font-cinzel uppercase px-1.5 py-0.5 rounded-sm transition-all"
                style={{ background: 'transparent', border: '1px solid rgba(50,40,30,0.3)', color: '#4a3a2a' }}
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  onClose: () => void
  onRestoreWithUndo: (version: DeckVersion) => void
}

export default function VersionPopover({ onClose, onRestoreWithUndo }: Props) {
  const {
    activeDeckId, deckVersions, cards, saveVersion, deleteVersion,
  } = useDeckStore()

  const key = activeDeckId ?? '__unsaved__'
  const versions = deckVersions[key] ?? []

  const [labelInput, setLabelInput] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleSave() {
    saveVersion(labelInput.trim() || undefined)
    setLabelInput('')
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1 z-30 rounded-sm overflow-hidden"
      style={{
        width: 320,
        background: 'rgba(16,11,6,0.99)',
        border: '1px solid rgba(120,95,55,0.5)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}
    >
      {/* Save current version */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(60,50,30,0.4)', background: 'rgba(8,6,4,0.5)' }}>
        <p className="text-[8px] font-cinzel uppercase tracking-widest mb-1.5" style={{ color: '#6a5e44' }}>
          Save Snapshot
        </p>
        <div className="flex gap-1.5">
          <input
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            placeholder="Label (optional)..."
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="flex-1 px-2 py-1 text-[10px] rounded-sm"
            style={{
              background: 'rgba(12,8,4,0.8)',
              border: '1px solid rgba(60,50,30,0.4)',
              color: '#b0a070',
              fontFamily: 'Georgia,serif',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            className="px-2.5 py-1 text-[9px] font-cinzel uppercase tracking-widest rounded-sm transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(60,44,14,0.8), rgba(40,28,6,0.9))',
              border: '1px solid rgba(160,120,40,0.4)',
              color: '#c9a060',
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Version list */}
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {versions.length === 0 ? (
          <p className="px-3 py-4 text-[9px] font-body italic text-center" style={{ color: '#3a3020' }}>
            No saved versions yet.
          </p>
        ) : (
          versions.map(v => (
            <VersionRow
              key={v.id}
              version={v}
              isHovered={hoveredId === v.id}
              onHover={setHoveredId}
              onRestore={onRestoreWithUndo}
              onDelete={(id) => {
                useDeckStore.getState().deleteVersion(id)
              }}
              diff={computeDiff(v, cards)}
            />
          ))
        )}
      </div>

      {versions.length > 0 && (
        <div className="px-3 py-1.5 border-t" style={{ borderColor: 'rgba(40,32,20,0.35)', background: 'rgba(6,4,2,0.6)' }}>
          <p className="text-[7px] font-cinzel uppercase tracking-widest text-center" style={{ color: '#3a3020' }}>
            {versions.length}/10 versions · Oldest auto-dropped at limit
          </p>
        </div>
      )}
    </div>
  )
}
