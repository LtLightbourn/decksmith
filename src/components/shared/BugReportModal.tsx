import React, { useState } from 'react'

interface Props {
  errorContext?: string
  onClose: () => void
}

export default function BugReportModal({ errorContext, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit() {
    setStatus('sending')
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, errorContext }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-sm"
        style={{
          background: 'rgba(10,8,4,0.99)',
          border: '1px solid rgba(120,90,40,0.4)',
          boxShadow: '0 0 60px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6">
          {status === 'sent' ? (
            <div className="text-center py-4">
              <p className="text-[11px] font-cinzel uppercase tracking-widest mb-2 text-gold">
                Report Received
              </p>
              <p className="text-[11px] font-body italic" style={{ color: '#6a5e44' }}>
                Thanks — we'll look into it.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-[10px] font-cinzel uppercase tracking-widest rounded-sm"
                style={{ border: '1px solid rgba(80,65,40,0.4)', color: '#6a5e44' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-cinzel-deco text-sm mb-1" style={{ color: '#c9a060', letterSpacing: 2 }}>
                Report a Bug
              </h3>
              <p className="text-[10px] font-body italic mb-4 text-gold-faint">
                What were you trying to do when this happened?
              </p>

              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. I was trying to build a goblin deck and got an error..."
                rows={3}
                className="w-full text-[11px] font-body rounded-sm px-3 py-2 resize-none mb-3"
                style={{
                  background: 'rgba(20,14,6,0.8)',
                  border: '1px solid rgba(80,65,40,0.35)',
                  color: '#a09060',
                  outline: 'none',
                }}
              />

              {errorContext && (
                <div
                  className="mb-4 px-3 py-2 rounded-sm"
                  style={{ background: 'rgba(6,4,2,0.8)', border: '1px solid rgba(60,50,30,0.3)' }}
                >
                  <p className="text-[8px] font-cinzel uppercase tracking-widest mb-1 text-gold-dim">
                    Error attached automatically
                  </p>
                  <p className="text-[9px] font-body truncate" style={{ color: '#3a3020' }}>
                    {errorContext}
                  </p>
                </div>
              )}

              {status === 'error' && (
                <p className="text-[10px] font-body italic mb-3" style={{ color: '#c06060' }}>
                  Failed to send. Try again.
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 text-[10px] font-cinzel uppercase tracking-widest rounded-sm"
                  style={{ border: '1px solid rgba(60,50,30,0.4)', color: '#5a5040' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'sending'}
                  className="flex-1 py-2 text-[10px] font-cinzel uppercase tracking-widest rounded-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'rgba(80,55,14,0.9)',
                    border: '1px solid rgba(160,120,45,0.45)',
                    color: '#f0d080',
                  }}
                >
                  {status === 'sending' ? 'Sending…' : 'Send Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
