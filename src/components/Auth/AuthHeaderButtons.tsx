/**
 * AuthHeaderButtons — the sign-in / user-avatar area in the title bar.
 * Only rendered inside ClerkProvider (when AUTH_ENABLED).
 */
import React from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { useAuthStore } from '../../store/authStore'

const USER_BUTTON_APPEARANCE = {
  elements: {
    avatarBox: { width: 22, height: 22, borderRadius: 2 },
    userButtonPopoverCard: {
      background: '#18130e',
      border: '1px solid rgba(120,95,55,0.45)',
      boxShadow: '0 0 40px rgba(0,0,0,0.9)',
      fontFamily: 'Georgia, serif',
    },
    userButtonPopoverActionButton: { color: '#a09060' },
    userButtonPopoverActionButtonText: { color: '#a09060', fontFamily: 'Georgia, serif' },
    userPreviewTextContainer: { color: '#c9a060' },
    userPreviewSecondaryIdentifier: { color: '#6a5e44' },
  },
}

export default function AuthHeaderButtons() {
  const { usageRemaining, usageLimit, isPro } = useAuthStore()

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            className="flex items-center gap-1.5 px-2 py-[5px] rounded-sm transition-all hover:opacity-90 flex-shrink-0"
            style={{
              background: 'rgba(14,10,5,0.7)',
              border: '1px solid rgba(140,105,40,0.4)',
              color: '#c9a060',
            }}
          >
            <span className="text-label">⚔</span>
            <span className="text-micro font-cinzel uppercase tracking-wide">Sign In</span>
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        {/* Pro badge */}
        {isPro && (
          <span
            className="text-micro font-cinzel uppercase tracking-widest hidden md:inline px-1.5 py-[3px] rounded-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(80,50,10,0.6), rgba(60,38,6,0.75))',
              border: '1px solid rgba(180,130,50,0.6)',
              color: '#f0c040',
              boxShadow: '0 0 10px rgba(200,140,30,0.2)',
            }}
            title="Decksmith Arcane — unlimited builds"
          >
            ✦ Arcane
          </span>
        )}

        {/* Usage counter — free users only */}
        {!isPro && usageRemaining !== null && (
          <span
            className="text-micro font-cinzel hidden md:inline flex items-center gap-1"
            style={{
              color: usageRemaining === 0 ? '#c06060' : usageRemaining <= 1 ? '#c08040' : '#5a5040',
              paddingRight: 2,
            }}
            title={`${usageRemaining} of ${usageLimit} free Merlin builds remaining`}
          >
            {usageRemaining === 0 ? (
              <>
                <span
                  className="inline-block w-[6px] h-[6px] rounded-full animate-pulse mr-1"
                  style={{ background: '#c06060', verticalAlign: 'middle' }}
                />
                0 builds — upgrade to Pro
              </>
            ) : (
              `${usageRemaining} build${usageRemaining === 1 ? '' : 's'} remaining`
            )}
          </span>
        )}

        <UserButton appearance={USER_BUTTON_APPEARANCE} />
      </SignedIn>
    </div>
  )
}
