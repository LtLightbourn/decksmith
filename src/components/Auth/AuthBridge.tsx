/**
 * AuthBridge — rendered only inside ClerkProvider.
 * Syncs Clerk's auth state → Zustand authStore, registers the token getter
 * with claudeApi so all API calls include the Bearer token automatically,
 * and fetches the initial usage + Pro status when the user signs in.
 */
import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useAuthStore } from '../../store/authStore'
import { registerTokenGetter, fetchStripeStatus } from '../../utils/claudeApi'

export default function AuthBridge() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { setAuthState, setUsageRemaining, setIsPro } = useAuthStore()

  useEffect(() => {
    setAuthState({ isSignedIn: isSignedIn ?? false, isLoaded })

    if (getToken) {
      registerTokenGetter(getToken)
    }

    // Fetch status when user signs in
    if (isSignedIn && isLoaded) {
      fetchStripeStatus().then(data => {
        if (data) {
          setIsPro(data.isPro)
          const remaining = data.isPro ? null : Math.max(0, data.limit - data.usageCount)
          setUsageRemaining(remaining)
        }
      })
    }

    // Clear state when signed out
    if (!isSignedIn && isLoaded) {
      setUsageRemaining(null)
      setIsPro(false)
    }
  }, [isSignedIn, isLoaded, getToken]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
