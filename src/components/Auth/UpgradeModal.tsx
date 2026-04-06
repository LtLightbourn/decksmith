import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { createCheckoutSession } from '../../utils/claudeApi'
import WaitlistModal from './WaitlistModal'

interface Props {
  onClose: () => void
  feature?: string
}

const ARCANE_FEATURES = [
  'Unlimited Merlin builds + chat refinement',
  'Playgroup mode and pod threat analysis',
  'Playstyle profile and hard constraints',
  'Proxy sheet PDF generator',
  'Goldfish playtester',
  'Upgrade path tool',
  'Deck history and versioning',
  'Commander finder and Surprise Me',
  'Full analytics sidebar',
]

function getTitle(feature?: string): string {
  if (feature === 'merlin_chat') return 'Refining Decks is an Arcane Feature'
  if (feature === 'proxy-sheet' || feature === 'playtester' || feature === 'deck-versioning') {
    return 'This Feature is Arcane-Only'
  }
  return "You've Used Your 3 Free Builds"
}

function getBody(feature?: string, usageLimit?: number): string {
  if (feature === 'merlin_chat') {
    return 'Your first deck build is free. Chatting with Merlin to refine, adjust, and tune your deck requires Decksmith Arcane.'
  }
  if (feature === 'proxy-sheet' || feature === 'playtester' || feature === 'deck-versioning') {
    return 'Upgrade to Decksmith Arcane to unlock the proxy generator, playtester, deck versioning, and everything else.'
  }
  return `You've used all ${usageLimit ?? 3} of your free Merlin builds. Upgrade to unlock unlimited builds plus the full Decksmith Arcane feature set.`
}

export default function UpgradeModal({ onClose, feature }: Props) {
  const { usageLimit } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const result = await createCheckoutSession()
      if (result?.url) {
        window.location.href = result.url
      } else {
        setError('Could not start checkout. Try again.')
      }
    } catch {
      setError('Could not start checkout. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      >
        <div
          className="modal-sheet w-full md:w-auto md:min-w-[360px] md:max-w-[440px] rounded-sm"
          style={{
            background: 'rgba(10,8,4,0.99)',
            border: '1px solid rgba(140,105,40,0.5)',
            boxShadow: '0 0 80px rgba(0,0,0,0.95), 0 0 40px rgba(180,130,40,0.08)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle — mobile */}
          <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(140,105,40,0.35)' }} />
          </div>

          <div className="px-6 pt-5 pb-6">
            {/* Header */}
            <div className="text-center mb-5">
              <div
                className="text-4xl mb-3"
                style={{ filter: 'drop-shadow(0 0 16px rgba(200,160,60,0.5))' }}
              >
                ✦
              </div>
              <h2
                className="font-cinzel-deco uppercase mb-2"
                style={{ fontSize: 15, letterSpacing: '2px', color: '#c9a060' }}
              >
                {getTitle(feature)}
              </h2>
              <p className="text-label font-body italic" style={{ color: '#6a5e44', lineHeight: 1.6 }}>
                {getBody(feature, usageLimit)}
              </p>
            </div>

            {/* Feature list */}
            <ul
              className="mb-5 space-y-2 px-1"
              style={{ borderTop: '1px solid rgba(80,65,40,0.3)', paddingTop: 16 }}
            >
              {ARCANE_FEATURES.map(feat => (
                <li key={feat} className="flex items-start gap-2">
                  <span className="text-label" style={{ color: '#c9a060', marginTop: 3 }}>✦</span>
                  <span className="text-label font-cinzel" style={{ color: '#a09060' }}>
                    {feat}
                  </span>
                </li>
              ))}
            </ul>

            {/* Price block */}
            <div
              className="text-center mb-4 py-3 rounded-sm"
              style={{ background: 'rgba(30,22,10,0.6)', border: '1px solid rgba(120,95,40,0.25)' }}
            >
              <span
                className="font-cinzel-deco"
                style={{ fontSize: 26, color: '#f0d080', letterSpacing: '1px' }}
              >
                $5
              </span>
              <span className="text-label font-cinzel ml-1" style={{ color: '#6a5e44' }}>
                / month
              </span>
              <p className="text-micro font-cinzel mt-1 tracking-widest uppercase text-gold-muted">
                Cancel anytime
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-label font-cinzel text-center mb-3" style={{ color: '#c06060' }}>
                {error}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-[10px] rounded-sm font-cinzel uppercase tracking-widest text-label transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(100,72,18,0.9), rgba(80,55,10,0.95))',
                border: '1px solid rgba(180,140,55,0.5)',
                color: '#f0d080',
                boxShadow: '0 0 20px rgba(180,130,40,0.15)',
              }}
            >
              {loading ? 'Summoning checkout…' : 'Upgrade to Arcane →'}
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 py-2 rounded-sm font-cinzel uppercase tracking-widest text-label transition-opacity hover:opacity-70"
              style={{
                background: 'transparent',
                border: '1px solid rgba(80,65,40,0.5)',
                color: '#7a6a4a',
              }}
            >
              Not now
            </button>

            {/* Grandmaster teaser */}
            <div
              className="mt-4 pt-3 text-center"
              style={{ borderTop: '1px solid rgba(60,50,30,0.25)' }}
            >
              <span className="text-micro font-cinzel" style={{ color: '#6a5e44' }}>
                Looking for more? Grandmaster is coming soon —{' '}
              </span>
              <button
                onClick={() => setWaitlistOpen(true)}
                className="text-micro font-cinzel transition-opacity hover:opacity-80"
                style={{ color: '#7a6070', textDecoration: 'underline', textDecorationColor: 'rgba(120,90,110,0.4)' }}
              >
                Join the waitlist →
              </button>
            </div>
          </div>
        </div>
      </div>

      {waitlistOpen && <WaitlistModal onClose={() => setWaitlistOpen(false)} />}
    </>
  )
}
