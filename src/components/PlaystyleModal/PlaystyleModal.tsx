import React, { useState } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { generateProfileLabel } from '../../utils/playstyleProfile'
import type { PlaystyleAnswers, WinCondition, InteractionStyle, GameLength, NeverDo } from '../../types'

// ── Question definitions ──────────────────────────────────────────────────

interface Option<T> {
  value: T
  icon: string
  label: string
  sub: string
}

const Q1_OPTIONS: Option<WinCondition>[] = [
  { value: 'creatures',  icon: '⚔',  label: 'Overwhelm with creatures',         sub: 'Fill the board. Swing wide or tall.' },
  { value: 'combo',      icon: '✦',  label: 'Combo finish out of nowhere',       sub: 'Assemble the pieces. Win clean.' },
  { value: 'control',    icon: '♜',  label: 'Control the board until I dominate', sub: 'Answer everything. Win on your terms.' },
  { value: 'fun',        icon: '♞',  label: 'Whatever is most fun in the moment', sub: 'Different every game. That\'s the point.' },
]

const Q2_OPTIONS: Option<InteractionStyle>[] = [
  { value: 'reactive',   icon: '🛡',  label: 'React to threats as they appear',   sub: 'Hold up answers. Stay flexible.' },
  { value: 'proactive',  icon: '👁',  label: 'Proactively shut down danger',       sub: 'Identify threats early. Handle them.' },
  { value: 'focused',    icon: '🎯',  label: 'Ignore others, focus on my plan',    sub: 'Tunnel vision on the gameplan.' },
  { value: 'political',  icon: '⚖',  label: 'Political deals and negotiation',    sub: 'Form alliances. Exploit them.' },
]

const Q3_OPTIONS: Option<GameLength>[] = [
  { value: 'fast',       icon: '⚡',  label: 'Fast — turns 6-8',                  sub: 'End it early. No time to waste.' },
  { value: 'medium',     icon: '⏳',  label: 'Medium — turns 10-13',              sub: 'Enough time for the deck to develop.' },
  { value: 'long',       icon: '📜',  label: 'Long grindy games — 15+',            sub: 'The longer it goes, the better.' },
  { value: 'decisions',  icon: '∞',   label: 'I just want interesting decisions',  sub: 'Length doesn\'t matter. Depth does.' },
]

const Q4_OPTIONS: Option<NeverDo>[] = [
  { value: 'combo',      icon: '🚫',  label: 'Win out of nowhere with a combo',   sub: 'No infinite combos in my decks.' },
  { value: 'stax',       icon: '🔒',  label: 'Lock other players out',            sub: 'No hard stax. Let people play.' },
  { value: 'extraturns', icon: '⏩',  label: 'Take extra turns',                  sub: 'One turn at a time.' },
  { value: 'oppressive', icon: '😤',  label: 'Make someone feel they can\'t play', sub: 'Fun for the table, always.' },
]

const QUESTIONS = [
  { step: 0, headline: 'How do you want to win?',       sub: 'When you picture the perfect game, what does victory look like?', options: Q1_OPTIONS },
  { step: 1, headline: 'How do you like to interact?',  sub: 'Threats are everywhere. How do you handle them?',                  options: Q2_OPTIONS },
  { step: 2, headline: "What's your ideal game length?", sub: 'Some like it fast. Some like to grind. Where do you fall?',        options: Q3_OPTIONS },
  { step: 3, headline: 'What do you never want to do?',  sub: 'One thing is off the table — always. What is it?',                options: Q4_OPTIONS },
]

// ── Component ─────────────────────────────────────────────────────────────

export default function PlaystyleModal() {
  const { playstyleModalOpen, setPlaystyleModalOpen, setPlaystyle, playstyle } = useDeckStore()

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Partial<PlaystyleAnswers>>(playstyle ?? {})

  if (!playstyleModalOpen) return null

  const q = QUESTIONS[step]
  const stepKey = (['winCondition', 'interaction', 'gameLength', 'neverDo'] as const)[step]
  const selectedValue = draft[stepKey]
  const isLast = step === 3
  const canProceed = selectedValue !== undefined

  function select(value: string) {
    setDraft(prev => ({ ...prev, [stepKey]: value }))
  }

  function handleNext() {
    if (!canProceed) return
    if (isLast) {
      setPlaystyle(draft as PlaystyleAnswers)
    } else {
      setStep(s => s + 1)
    }
  }

  function handleBack() {
    if (step === 0) {
      setPlaystyleModalOpen(false)
    } else {
      setStep(s => s - 1)
    }
  }

  // Show preview label on final step when answer selected
  const previewLabel = isLast && canProceed
    ? generateProfileLabel({ ...(draft as PlaystyleAnswers), neverDo: selectedValue as NeverDo })
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="stone-bg modal-sheet relative flex flex-col"
        style={{
          background: 'rgba(18,13,8,0.98)',
          border: '1px solid rgba(120,95,55,0.5)',
          borderRadius: 4,
          boxShadow: '0 0 80px rgba(0,0,0,0.97), 0 0 30px rgba(140,80,220,0.08)',
          maxWidth: 560,
          width: '94vw',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="rounded-full" style={{ width: 36, height: 4, background: 'rgba(120,95,55,0.4)' }} />
        </div>
        {/* Iron corners */}
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(80,65,40,0.4)', background: 'rgba(8,6,4,0.5)' }}
        >
          <div>
            <h2
              className="font-cinzel-deco tracking-widest uppercase"
              style={{ fontSize: 14, color: '#c9a060', letterSpacing: 4 }}
            >
              ✦ Your Arcane Profile
            </h2>
            <p className="text-label font-body italic mt-px" style={{ color: '#6a5e44' }}>
              {playstyle ? 'Update your playstyle preferences' : 'Tell Merlin how you like to play'}
            </p>
          </div>
          <button
            onClick={() => setPlaystyleModalOpen(false)}
            className="text-heading transition-colors"
            style={{ color: '#5a5040', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Progress dots */}
        <div className="flex-shrink-0 flex justify-center gap-2 pt-5 pb-1">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i < step
                  ? 'rgba(180,140,60,0.6)'
                  : i === step
                    ? '#c9a060'
                    : 'rgba(60,50,30,0.4)',
              }}
            />
          ))}
        </div>

        {/* Question */}
        <div className="flex-shrink-0 px-6 pt-3 pb-4">
          <p className="text-micro font-cinzel tracking-[2px] uppercase mb-1 text-gold-faint">
            Question {step + 1} of 4
          </p>
          <h3 className="font-cinzel text-lg leading-snug" style={{ color: '#d4b870' }}>
            {q.headline}
          </h3>
          <p className="text-label font-body italic mt-1" style={{ color: '#6a5e44' }}>
            {q.sub}
          </p>
        </div>

        {/* Options grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <div className="grid grid-cols-2 gap-3">
            {q.options.map(opt => {
              const isSelected = selectedValue === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className="flex flex-col items-start text-left p-4 rounded transition-all duration-200"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(60,42,16,0.8), rgba(40,28,10,0.9))'
                      : 'rgba(16,12,6,0.7)',
                    border: isSelected
                      ? '1px solid rgba(200,160,60,0.6)'
                      : '1px solid rgba(60,50,30,0.35)',
                    boxShadow: isSelected
                      ? '0 0 16px rgba(180,140,50,0.15), inset 0 0 12px rgba(180,140,50,0.06)'
                      : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.border = '1px solid rgba(120,95,55,0.5)'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(22,16,8,0.8)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.border = '1px solid rgba(60,50,30,0.35)'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(16,12,6,0.7)'
                    }
                  }}
                >
                  {/* Icon */}
                  <span
                    className="mb-2 leading-none"
                    style={{ fontSize: 22, filter: isSelected ? 'drop-shadow(0 0 6px rgba(200,160,60,0.5))' : undefined }}
                  >
                    {opt.icon}
                  </span>

                  {/* Label */}
                  <span
                    className="font-cinzel text-label leading-snug mb-1"
                    style={{ color: isSelected ? '#d4b870' : '#8a7a5a' }}
                  >
                    {opt.label}
                  </span>

                  {/* Subtext */}
                  <span
                    className="font-body italic text-micro leading-snug"
                    style={{ color: isSelected ? '#7a6a40' : '#4a4030' }}
                  >
                    {opt.sub}
                  </span>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-label font-cinzel text-gold">
                      ✦
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Profile preview on last step */}
          {previewLabel && (
            <div
              className="mt-4 mx-1 px-4 py-3 rounded-sm text-center"
              style={{
                background: 'rgba(40,28,10,0.6)',
                border: '1px solid rgba(180,140,50,0.3)',
              }}
            >
              <p className="text-micro font-cinzel tracking-[2px] uppercase mb-1" style={{ color: '#6a5e44' }}>
                Your playstyle profile
              </p>
              <p className="font-cinzel-deco text-base" style={{ color: '#c9a060', letterSpacing: 3 }}>
                {previewLabel}
              </p>
              <p className="text-micro font-body italic mt-1 text-gold-faint">
                Merlin will remember this across all deck building sessions.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t"
          style={{ borderColor: 'rgba(60,50,30,0.4)', background: 'rgba(8,6,4,0.4)' }}
        >
          <button
            onClick={handleBack}
            className="text-label font-cinzel uppercase tracking-widest px-3 py-2 rounded-sm transition-colors"
            style={{
              background: 'rgba(16,12,6,0.8)',
              border: '1px solid rgba(50,42,28,0.4)',
              color: '#5a5040',
            }}
          >
            {step === 0 ? 'Skip' : '← Back'}
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="text-label font-cinzel uppercase tracking-widest px-6 py-2 rounded-sm transition-all"
            style={{
              background: canProceed
                ? 'linear-gradient(135deg, rgba(80,58,18,0.9), rgba(55,38,10,0.95))'
                : 'rgba(30,24,12,0.5)',
              border: canProceed
                ? '1px solid rgba(180,140,50,0.45)'
                : '1px solid rgba(50,42,28,0.3)',
              color: canProceed ? '#c9a060' : '#3a3428',
              cursor: canProceed ? 'pointer' : 'not-allowed',
            }}
          >
            {isLast ? '✦ Forge Profile' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
