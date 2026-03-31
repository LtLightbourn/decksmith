import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

const clerkAppearance = {
  variables: {
    colorPrimary: '#c9a060',
    colorBackground: '#18130e',
    colorText: '#c9a060',
    colorTextSecondary: '#6a5e44',
    colorInputBackground: '#0e0a06',
    colorInputText: '#b8a882',
    borderRadius: '2px',
    fontFamily: 'Georgia, serif',
  },
  elements: {
    card: {
      background: '#18130e',
      border: '1px solid rgba(120,95,55,0.45)',
      boxShadow: '0 0 60px rgba(0,0,0,0.9)',
    },
    headerTitle: { color: '#c9a060', fontFamily: '"Cinzel Decorative", serif' },
    headerSubtitle: { color: '#6a5e44' },
    socialButtonsBlockButton: {
      background: 'rgba(30,22,12,0.8)',
      border: '1px solid rgba(100,80,45,0.4)',
      color: '#b0a060',
    },
    formButtonPrimary: {
      background: 'linear-gradient(135deg, rgba(100,70,20,0.9), rgba(80,50,10,0.95))',
      color: '#f0d090',
    },
    footerActionLink: { color: '#c9a060' },
  },
}

async function render() {
  if (PUBLISHABLE_KEY) {
    const { ClerkProvider } = await import('@clerk/clerk-react')
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HelmetProvider>
          <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
            <App />
          </ClerkProvider>
        </HelmetProvider>
      </StrictMode>,
    )
  } else {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </StrictMode>,
    )
  }
}

render()
