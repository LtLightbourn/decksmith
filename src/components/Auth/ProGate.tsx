import React from 'react'
import { useAuthStore, AUTH_ENABLED } from '../../store/authStore'

interface ProGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProGate({ feature, children, fallback }: ProGateProps) {
  const { isPro } = useAuthStore()

  // When auth is disabled (local dev), treat everyone as Pro
  if (!AUTH_ENABLED || isPro) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div
      className="relative cursor-pointer group"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('decksmith:pro-required', { detail: { feature } }),
        )
      }
    >
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[9px] font-cinzel uppercase tracking-wide px-2 py-[3px] rounded-sm"
          style={{
            background: 'rgba(50,35,8,0.92)',
            border: '1px solid rgba(180,140,50,0.5)',
            color: '#f0c060',
            boxShadow: '0 0 8px rgba(0,0,0,0.6)',
          }}
        >
          ✦ Arcane
        </span>
      </div>
    </div>
  )
}
