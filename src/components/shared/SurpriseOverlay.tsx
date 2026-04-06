import React, { useState, useEffect, useRef } from 'react'

const PHRASES = [
  'Rolling the dice on fate...',
  'Consulting the ancient tomes...',
  'Summoning something unexpected...',
  'The wheel spins...',
]

const SPIN_KEYFRAMES = `
@keyframes surpirse-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes surprise-pulse-border {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200,160,40,0), 0 0 40px rgba(0,0,0,0.9); }
  50%       { box-shadow: 0 0 0 3px rgba(200,160,40,0.3), 0 0 40px rgba(0,0,0,0.9); }
}
@keyframes surprise-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes surprise-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
`

interface Props {
  phase: 'confirm' | 'loading'
  onConfirm: () => void
  onCancel: () => void
}

export default function SurpriseOverlay({ phase, onConfirm, onCancel }: Props) {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [fading, setFading] = useState(false)
  const idxRef = useRef(0)

  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        idxRef.current = (idxRef.current + 1) % PHRASES.length
        setPhraseIdx(idxRef.current)
        setFading(false)
      }, 350)
    }, 2200)
    return () => clearInterval(interval)
  }, [phase])

  return (
    <>
      <style>{SPIN_KEYFRAMES}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(4,2,1,0.92)', backdropFilter: 'blur(4px)' }}
      >
        <div
          style={{
            background: 'rgba(16,11,6,0.98)',
            border: '1px solid rgba(180,140,30,0.35)',
            borderRadius: 6,
            padding: '36px 44px',
            maxWidth: 400,
            width: '88vw',
            textAlign: 'center',
            animation: 'surprise-pulse-border 2.4s ease-in-out infinite',
          }}
        >
          {phase === 'confirm' ? (
            <ConfirmContent onConfirm={onConfirm} onCancel={onCancel} />
          ) : (
            <LoadingContent phraseIdx={phraseIdx} fading={fading} />
          )}
        </div>
      </div>
    </>
  )
}

function LoadingContent({ phraseIdx, fading }: { phraseIdx: number; fading: boolean }) {
  return (
    <>
      {/* Spinning arcane symbol */}
      <div
        style={{
          fontSize: 42,
          marginBottom: 24,
          display: 'inline-block',
          animation: 'surpirse-spin 3s linear infinite',
          color: '#c9a060',
          filter: 'drop-shadow(0 0 10px rgba(200,160,40,0.5))',
          lineHeight: 1,
        }}
      >
        ✦
      </div>

      <h3
        className="font-cinzel-deco uppercase tracking-widest mb-3 text-body"
        style={{ color: '#c9a060', letterSpacing: 3 }}
      >
        Merlin at Work
      </h3>

      {/* Cycling phrase */}
      <p
        className="font-body italic text-label"
        style={{
          color: '#8a7a5a',
          minHeight: 20,
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(-4px)' : 'translateY(0)',
          transition: fading
            ? 'opacity 0.35s ease, transform 0.35s ease'
            : 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        {PHRASES[phraseIdx]}
      </p>

      {/* Subtle progress dots */}
      <div className="flex justify-center gap-1.5 mt-5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#c9a060',
              animation: `orbPulse 1.4s ease-in-out ${i * 0.28}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  )
}

function ConfirmContent({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div style={{ fontSize: 36, marginBottom: 16 }}>🎲</div>

      <h3
        className="font-cinzel-deco uppercase tracking-widest mb-3 text-body"
        style={{ color: '#c9a060', letterSpacing: 2 }}
      >
        Let Fate Decide?
      </h3>

      <p
        className="font-body italic mb-6 text-label"
        style={{ color: '#7a6a4a', lineHeight: 1.7 }}
      >
        Start a new random deck? Your current deck will be cleared.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-label font-cinzel uppercase tracking-widest transition-colors"
          style={{
            background: 'rgba(20,16,10,0.8)',
            border: '1px solid rgba(60,50,30,0.4)',
            color: '#5a5040',
            borderRadius: 2,
          }}
        >
          Keep My Deck
        </button>
        <button
          onClick={onConfirm}
          className="py-2 px-5 text-label font-cinzel uppercase tracking-widest transition-all"
          style={{
            flex: 2,
            background: 'linear-gradient(135deg, rgba(120,80,10,0.8), rgba(80,50,5,0.9))',
            border: '1px solid rgba(200,140,30,0.45)',
            color: '#f0c060',
            borderRadius: 2,
          }}
        >
          🎲 Surprise Me
        </button>
      </div>
    </>
  )
}
