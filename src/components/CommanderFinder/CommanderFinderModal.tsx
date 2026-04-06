import React, { useState } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { findCommanders, type CommanderSuggestion } from '../../utils/claudeApi'
import { fetchCardByName } from '../../hooks/useScryfall'
import { playstyleGuidance } from '../../utils/playstyleProfile'

type Phase = 'input' | 'loading' | 'results'

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: '#4a8a4a',
  Intermediate: '#8a7a20',
  Advanced: '#8a3a20',
}

const PRICE_COLOR: Record<string, string> = {
  Budget: '#4a8a4a',
  'Mid-Range': '#7a6a20',
  Expensive: '#8a3a20',
}

const MANA_COLOR: Record<string, string> = {
  W: '#d4c9a0',
  U: '#4a80cc',
  B: '#9060c0',
  R: '#cc4422',
  G: '#2a8040',
  C: '#8a8080',
}

const TEXTAREA_STYLE: React.CSSProperties = {
  background: 'rgba(12,8,4,0.8)',
  border: '1px solid rgba(80,65,40,0.5)',
  color: '#c0b090',
  borderRadius: 2,
  fontFamily: 'Georgia, serif',
  fontSize: 12,
  outline: 'none',
  padding: '8px 12px',
  width: '100%',
  resize: 'vertical',
  minHeight: 110,
  lineHeight: 1.7,
}

export default function CommanderFinderModal() {
  const {
    commanderFinderOpen, setCommanderFinderOpen,
    setCommander, setWizardOpen, setWizardPreFill,
    targetBracket, playstyle, addToast,
  } = useDeckStore()

  const [phase, setPhase] = useState<Phase>('input')
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<CommanderSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [buildingName, setBuildingName] = useState<string | null>(null)

  const styleGuidance = playstyleGuidance(playstyle)

  async function handleFind() {
    const trimmed = description.trim()
    if (!trimmed) return
    setPhase('loading')
    setError(null)
    try {
      const results = await findCommanders(trimmed, targetBracket, styleGuidance || null)
      setSuggestions(results)
      setPhase('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('input')
    }
  }

  async function handleBuildDeck(suggestion: CommanderSuggestion) {
    setBuildingName(suggestion.name)
    try {
      const card = await fetchCardByName(suggestion.name)
      if (!card) {
        addToast(`Could not find "${suggestion.name}" on Scryfall`, 'error')
        setBuildingName(null)
        return
      }
      setCommander(card)
      setWizardPreFill({ vibe: `${suggestion.strategy} — ${suggestion.why}` })
      setCommanderFinderOpen(false)
      setWizardOpen(true)
      setPhase('input')
      setDescription('')
      setSuggestions([])
    } catch {
      addToast('Failed to load commander card', 'error')
    } finally {
      setBuildingName(null)
    }
  }

  function handleReset() {
    setPhase('input')
    setSuggestions([])
    setError(null)
    setSelectedName(null)
  }

  function handleClose() {
    setCommanderFinderOpen(false)
    setTimeout(() => {
      setPhase('input')
      setSuggestions([])
      setError(null)
      setSelectedName(null)
    }, 200)
  }

  if (!commanderFinderOpen) return null

  const isWide = phase === 'results'

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="stone-bg modal-sheet relative flex flex-col"
        style={{
          background: 'rgba(18,12,6,0.98)',
          border: '1px solid rgba(120,95,55,0.5)',
          borderRadius: 4,
          boxShadow: '0 0 80px rgba(0,0,0,0.97), 0 0 24px rgba(180,120,20,0.08)',
          maxWidth: isWide ? 760 : 480,
          width: '93vw',
          maxHeight: '90vh',
          transition: 'max-width 0.25s ease',
        }}
      >
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* Drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="rounded-full" style={{ width: 36, height: 4, background: 'rgba(120,95,55,0.4)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center gap-3 pt-5 pb-4 px-6 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(80,65,40,0.4)' }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center text-lg"
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(60,35,10,0.8)',
              border: '1px solid rgba(160,100,20,0.4)',
              color: '#c9a060',
            }}
          >
            ⚔
          </div>
          <div className="flex-1">
            <h2
              className="font-cinzel-deco text-base tracking-widest"
              style={{ color: '#c9a060', letterSpacing: 3 }}
            >
              Find My Commander
            </h2>
            <p className="font-body text-[10px] italic" style={{ color: '#6a5e44' }}>
              {phase === 'results'
                ? `${suggestions.length} commanders match your vision`
                : 'Describe how you want to play — Merlin will suggest commanders'}
            </p>
          </div>
          {phase === 'results' && (
            <button
              onClick={handleReset}
              className="text-[9px] font-cinzel uppercase tracking-widest px-3 py-1.5 transition-colors"
              style={{
                background: 'rgba(20,16,10,0.8)',
                border: '1px solid rgba(60,50,30,0.4)',
                color: '#5a5040',
                borderRadius: 2,
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleClose}
            className="text-[16px] transition-colors ml-1"
            style={{ color: '#5a5040', lineHeight: 1 }}
            title="Close"
          >✕</button>
        </div>

        {/* ── INPUT PHASE ── */}
        {(phase === 'input' || phase === 'loading') && (
          <div className="p-6 flex flex-col gap-4">
            <div>
              <label
                className="text-[9px] font-cinzel tracking-[2px] uppercase block mb-2 text-gold-muted"
              >
                How do you want to play?
              </label>
              <textarea
                style={TEXTAREA_STYLE}
                placeholder={`Describe your playstyle or theme...\n\ne.g. "I want a spooky aristocrats deck that sacrifices creatures and drains life. Casual budget, no combos."`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={phase === 'loading'}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleFind()
                }}
              />
              <p className="mt-1 text-[9px] font-body text-gold-dim">
                Mention colors, themes, archetypes, budget, or playstyle — any detail helps.
              </p>
            </div>

            {error && (
              <p className="text-[10px] font-body text-center" style={{ color: '#cc4444' }}>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2 text-[10px] font-cinzel uppercase tracking-widest transition-colors"
                style={{
                  background: 'rgba(20,16,10,0.8)',
                  border: '1px solid rgba(60,50,30,0.4)',
                  color: '#5a5040',
                  borderRadius: 2,
                }}
              >
                Dismiss
              </button>
              <button
                onClick={handleFind}
                disabled={phase === 'loading' || !description.trim()}
                className="py-2 px-6 text-[10px] font-cinzel uppercase tracking-widest transition-all"
                style={{
                  flex: 2,
                  background: phase === 'loading'
                    ? 'rgba(60,40,10,0.5)'
                    : !description.trim()
                      ? 'rgba(40,28,10,0.5)'
                      : 'linear-gradient(135deg, rgba(120,80,10,0.8), rgba(80,50,5,0.9))',
                  border: `1px solid rgba(${phase === 'loading' || !description.trim() ? '80,60,20' : '200,140,30'},0.4)`,
                  color: phase === 'loading' || !description.trim() ? '#6a5030' : '#f0c060',
                  borderRadius: 2,
                  opacity: !description.trim() ? 0.5 : 1,
                  cursor: phase === 'loading' || !description.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {phase === 'loading' ? 'Consulting the archives...' : '⚔ Find My Commander'}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS PHASE ── */}
        {phase === 'results' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              }}
            >
              {suggestions.map((s, i) => (
                <CommanderCard
                  key={s.name}
                  suggestion={s}
                  featured={i === 0}
                  selected={selectedName === s.name}
                  building={buildingName === s.name}
                  onSelect={() => setSelectedName(selectedName === s.name ? null : s.name)}
                  onBuild={() => handleBuildDeck(s)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface CardProps {
  suggestion: CommanderSuggestion
  featured: boolean
  selected: boolean
  building: boolean
  onSelect: () => void
  onBuild: () => void
}

function CommanderCard({ suggestion: s, featured, selected, building, onSelect, onBuild }: CardProps) {
  const borderColor = featured
    ? 'rgba(200,160,40,0.6)'
    : selected
      ? 'rgba(140,100,200,0.5)'
      : 'rgba(60,50,30,0.5)'

  const bgColor = selected
    ? 'rgba(60,40,90,0.25)'
    : 'rgba(20,14,8,0.8)'

  return (
    <div
      className="flex gap-3 rounded cursor-pointer transition-all"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        padding: '12px 14px',
        boxShadow: featured ? '0 0 12px rgba(180,140,20,0.08)' : 'none',
      }}
      onClick={onSelect}
    >
      {/* Card art */}
      <div
        className="flex-shrink-0 rounded overflow-hidden"
        style={{ width: 64, height: 89 }}
      >
        {s.imageUri ? (
          <img
            src={s.imageUri}
            alt={s.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '0 8%' }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              background: 'rgba(30,22,12,0.9)',
              border: '1px solid rgba(60,50,30,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#4a3820',
            }}
          >
            ✦
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Name + featured badge */}
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className="font-cinzel text-[12px] font-bold leading-tight"
            style={{ color: featured ? '#e0b840' : '#c0a070' }}
          >
            {s.name}
          </span>
          {featured && (
            <span
              className="text-[8px] font-cinzel uppercase tracking-widest px-1.5 py-0.5 rounded-sm flex-shrink-0"
              style={{
                background: 'rgba(120,80,10,0.5)',
                border: '1px solid rgba(200,150,30,0.4)',
                color: '#d4a030',
              }}
            >
              Best Match
            </span>
          )}
        </div>

        {/* Color identity pips */}
        {s.colors.length > 0 && (
          <div className="flex gap-1">
            {s.colors.map(c => (
              <span
                key={c}
                className="text-[9px] font-cinzel font-bold rounded-sm w-4 h-4 flex items-center justify-center flex-shrink-0"
                style={{
                  background: MANA_COLOR[c] ? `${MANA_COLOR[c]}22` : 'rgba(60,50,30,0.4)',
                  border: `1px solid ${MANA_COLOR[c] ?? '#6a5040'}66`,
                  color: MANA_COLOR[c] ?? '#6a5040',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Strategy */}
        <p className="font-body text-[10px] leading-relaxed text-gold-muted">
          {s.strategy}
        </p>

        {/* Why */}
        {selected && (
          <p
            className="font-body text-[10px] italic leading-relaxed mt-0.5 rounded px-2 py-1.5"
            style={{
              color: '#b0a0d0',
              background: 'rgba(60,35,90,0.25)',
              border: '1px solid rgba(120,80,200,0.15)',
            }}
          >
            {s.why}
          </p>
        )}

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap mt-auto pt-1">
          <Badge label={s.difficulty} color={DIFFICULTY_COLOR[s.difficulty] ?? '#6a6040'} />
          <Badge label={s.priceRange} color={PRICE_COLOR[s.priceRange] ?? '#6a6040'} />
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onBuild}
            disabled={building}
            className="flex-1 py-1.5 text-[9px] font-cinzel uppercase tracking-widest transition-all rounded-sm"
            style={{
              background: building
                ? 'rgba(60,40,10,0.5)'
                : 'linear-gradient(135deg, rgba(100,65,8,0.8), rgba(70,45,5,0.9))',
              border: `1px solid rgba(${building ? '80,60,20' : '200,140,30'},0.45)`,
              color: building ? '#6a5030' : '#f0c060',
              cursor: building ? 'not-allowed' : 'pointer',
            }}
          >
            {building ? 'Loading...' : '✦ Build This Deck'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[8px] font-cinzel uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}44`,
        color,
      }}
    >
      {label}
    </span>
  )
}
