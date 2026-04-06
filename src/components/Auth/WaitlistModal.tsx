import React, { useState } from 'react'

interface Props {
  onClose: () => void
}

export default function WaitlistModal({ onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), tier: 'grandmaster' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Something went wrong. Try again.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Could not connect. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="modal-sheet w-full md:w-auto md:min-w-[340px] md:max-w-[420px] rounded-sm"
        style={{
          background: 'rgba(8,6,12,0.99)',
          border: '1px solid rgba(100,80,140,0.45)',
          boxShadow: '0 0 80px rgba(0,0,0,0.97), 0 0 40px rgba(100,70,160,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(100,80,140,0.35)' }} />
        </div>

        <div className="px-6 pt-5 pb-6">
          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3" style={{ filter: 'drop-shadow(0 0 12px rgba(160,120,220,0.4))' }}>✦</div>
              <p className="font-cinzel-deco text-[14px] tracking-wide mb-2" style={{ color: '#c0a0e0' }}>
                You're on the list.
              </p>
              <p className="text-label font-body italic" style={{ color: '#6a5a7a', lineHeight: 1.6 }}>
                We'll be in touch. ✦
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2 rounded-sm font-cinzel uppercase tracking-widest text-label"
                style={{ background: 'transparent', border: '1px solid rgba(80,60,100,0.4)', color: '#5a4a6a' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <div className="text-3xl mb-3" style={{ filter: 'drop-shadow(0 0 12px rgba(160,120,220,0.4))' }}>⊛</div>
                <h2
                  className="font-cinzel-deco uppercase mb-2"
                  style={{ fontSize: 14, letterSpacing: '1.5px', color: '#c0a0e0' }}
                >
                  Get Early Access to Grandmaster
                </h2>
                <p className="text-label font-body italic" style={{ color: '#6a5a7a', lineHeight: 1.6 }}>
                  Be the first to know when Grandmaster launches. We'll reach out before it goes public.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm text-label mb-3"
                  style={{
                    background: 'rgba(12,8,18,0.8)',
                    border: '1px solid rgba(80,60,110,0.45)',
                    color: '#b0a0c8',
                    outline: 'none',
                    fontFamily: 'Georgia, serif',
                  }}
                />

                {error && (
                  <p className="text-label font-cinzel text-center mb-3" style={{ color: '#c06060' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-[10px] rounded-sm font-cinzel uppercase tracking-widest text-label transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(60,40,90,0.9), rgba(45,28,75,0.95))',
                    border: '1px solid rgba(120,90,180,0.45)',
                    color: '#c0a0e0',
                  }}
                >
                  {loading ? 'Sending…' : 'Notify Me →'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full mt-2 py-2 rounded-sm font-cinzel uppercase tracking-widest text-label transition-opacity hover:opacity-70"
                  style={{ background: 'transparent', border: '1px solid rgba(50,40,70,0.35)', color: '#3a3048' }}
                >
                  Not now
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
