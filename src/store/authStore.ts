import { create } from 'zustand'

interface AuthState {
  isSignedIn: boolean
  isLoaded: boolean
  isPro: boolean
  usageRemaining: number | null
  usageLimit: number
  setAuthState: (s: { isSignedIn: boolean; isLoaded: boolean }) => void
  setUsageRemaining: (n: number | null) => void
  setIsPro: (v: boolean) => void
}

export const useAuthStore = create<AuthState>(set => ({
  isSignedIn: false,
  isLoaded: false,
  isPro: false,
  usageRemaining: null,
  usageLimit: 3,
  setAuthState: s => set(s),
  setUsageRemaining: n => set({ usageRemaining: n }),
  setIsPro: v => set({ isPro: v }),
}))

// True only when the publishable key is configured
export const AUTH_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
