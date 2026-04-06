import React from 'react'
import { useDeckStore } from '../../store/deckStore'
import { useAuthStore, AUTH_ENABLED } from '../../store/authStore'
import { BRACKET_LABELS } from '../../utils/bracketData'
import type { Bracket } from '../../types'

const BRACKETS: Bracket[] = [1, 2, 3, 4]

export default function BracketSelector() {
  const { targetBracket, setTargetBracket } = useDeckStore()
  const { isPro } = useAuthStore()
  const locked = AUTH_ENABLED && !isPro

  function handleClick(b: Bracket) {
    if (locked) {
      window.dispatchEvent(
        new CustomEvent('decksmith:pro-required', { detail: { feature: 'bracket-control' } }),
      )
      return
    }
    setTargetBracket(b)
  }

  return (
    <div className="flex-shrink-0 px-2 py-2 border-b" style={{ borderColor: 'rgba(50,42,28,0.5)' }}>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-micro font-cinzel tracking-[2px] uppercase" style={{ color: '#6a5e44' }}>
          Bracket Target
        </span>
        {locked && (
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('decksmith:pro-required', { detail: { feature: 'bracket-control' } }),
              )
            }
            className="text-micro ml-1"
            style={{ color: '#5a4030', lineHeight: 1 }}
            title="Bracket control requires Pro"
          >
            🔒
          </button>
        )}
      </div>

      <div className="flex gap-1" role="radiogroup" aria-label="Bracket target">
        {BRACKETS.map(b => {
          const info = BRACKET_LABELS[b]
          const isSelected = b === targetBracket

          return (
            <button
              key={b}
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleClick(b)}
              title={locked ? 'Bracket control requires Pro' : `Bracket ${b} — ${info.name}: ${info.desc}`}
              className="flex-1 flex flex-col items-center py-1.5 rounded-sm transition-all"
              style={{
                background: isSelected
                  ? `rgba(${bracketRgb(b)}, 0.12)`
                  : 'rgba(12,9,5,0.5)',
                border: isSelected
                  ? `1px solid rgba(${bracketRgb(b)}, 0.55)`
                  : '1px solid rgba(50,42,28,0.35)',
                borderLeft: isSelected
                  ? `2px solid rgba(${bracketRgb(b)}, 0.9)`
                  : '2px solid transparent',
                cursor: locked ? 'pointer' : 'pointer',
                opacity: locked && !isSelected ? 0.5 : 1,
                minWidth: 0,
              }}
            >
              <span
                className="font-cinzel-deco font-bold leading-none text-body"
                style={{
                  color: isSelected ? info.color : '#4a4030',
                }}
              >
                {b}
              </span>
              <span
                className="font-cinzel text-micro tracking-wide uppercase mt-0.5 truncate w-full text-center px-0.5"
                style={{ color: isSelected ? info.color : '#3a3428', opacity: isSelected ? 0.85 : 0.7 }}
              >
                {info.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function bracketRgb(b: Bracket): string {
  switch (b) {
    case 1: return '80,160,80'
    case 2: return '120,170,70'
    case 3: return '200,130,50'
    case 4: return '200,65,65'
  }
}
