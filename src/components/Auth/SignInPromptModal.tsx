import React from 'react'
import { SignInButton } from '@clerk/clerk-react'

interface Props {
  onClose: () => void
}

export default function SignInPromptModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="modal-sheet w-full md:w-auto md:min-w-[340px] md:max-w-md rounded-sm"
        style={{
          background: 'rgba(14,11,7,0.98)',
          border: '1px solid rgba(140,105,40,0.45)',
          boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 30px rgba(140,80,20,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile */}
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(140,105,40,0.35)' }} />
        </div>

        <div className="px-6 pt-4 pb-6 text-center">
          {/* Merlin icon */}
          <div className="text-4xl mb-3" style={{ filter: 'drop-shadow(0 0 12px rgba(150,100,230,0.6))' }}>
            🔮
          </div>

          <h2
            className="font-cinzel-deco uppercase mb-1"
            style={{ fontSize: 16, letterSpacing: '2px', color: '#c9a060' }}
          >
            Merlin Awaits
          </h2>
          <p className="text-[11px] font-body italic mb-4" style={{ color: '#6a5e44', lineHeight: 1.5 }}>
            Sign in to consult Merlin's wisdom.
            <br />
            Free accounts receive <span className="text-gold">10 builds</span> at no cost.
          </p>

          <div className="flex flex-col gap-2">
            <SignInButton mode="modal">
              <button
                className="w-full py-2 rounded-sm font-cinzel uppercase tracking-widest text-[11px] transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, rgba(60,35,90,0.9), rgba(40,20,60,0.95))',
                  border: '1px solid rgba(150,100,230,0.5)',
                  color: '#c8a8f0',
                  boxShadow: '0 0 16px rgba(140,80,220,0.2)',
                }}
              >
                ⚔ Sign In
              </button>
            </SignInButton>

            <button
              onClick={onClose}
              className="w-full py-2 rounded-sm font-cinzel uppercase tracking-widest text-[10px] transition-opacity hover:opacity-70"
              style={{
                background: 'transparent',
                border: '1px solid rgba(70,60,40,0.4)',
                color: '#4a4030',
              }}
            >
              Browse freely
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
