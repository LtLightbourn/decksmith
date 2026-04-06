import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AUTH_ENABLED, useAuthStore } from '../store/authStore'
import { createCheckoutSession } from '../utils/claudeApi'
import { SignInButton } from '@clerk/clerk-react'
import { SEO } from '../components/SEO/SEO'
import WaitlistModal from '../components/Auth/WaitlistModal'

interface Props {
  onEnterApp: () => void
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '✦',
    title: 'Meet Merlin, Your Deck Advisor',
    desc: 'Describe how you want to play. Merlin asks the right questions and builds a complete deck around your answers — your colors, your style, your pod.',
  },
  {
    icon: '⚔',
    title: 'Playgroup-Aware',
    desc: 'Tell Merlin who you play against. Every deck is built for your specific pod — not a random meta you\'ll never face.',
  },
  {
    icon: '◈',
    title: 'Bracket Enforcement',
    desc: 'Set your power level and never feel like the villain at your table again. Decksmith keeps your list honest to your bracket.',
  },
  {
    icon: '⟳',
    title: 'Goldfish Playtester',
    desc: 'Know if your opening hand is keepable before you sleeve up. Simulate hundreds of hands and see your mana curve in action.',
  },
  {
    icon: '⚗',
    title: 'Real-Time Pricing',
    desc: 'Know exactly what your deck costs before you buy a single card. Live Scryfall prices on every card, with instant swap suggestions.',
  },
  {
    icon: '⎙',
    title: 'Proxy Generator',
    desc: 'Test it before you buy it. Print a full proxy sheet in one click — card images laid out print-ready at standard size.',
  },
]

const STEPS = [
  {
    n: '1',
    icon: '♟',
    title: 'Tell Merlin Your Style',
    desc: 'Answer a few questions about how you like to play. Competitive or casual? Political or aggressive? Merlin remembers your answers.',
  },
  {
    n: '2',
    icon: '🔮',
    title: 'Describe Your Deck',
    desc: 'Name a commander or just describe a vibe. Merlin handles the research — 99 cards that actually work together.',
  },
  {
    n: '3',
    icon: '⚔',
    title: 'Tune and Play',
    desc: 'Adjust, proxy, playtest, and upgrade. Decksmith grows with your deck as your pod evolves.',
  },
]

const FREE_FEATURES = [
  '3 Merlin deck builds',
  'Full card search & deck builder',
  'Real-time card pricing',
  'Plain text deck export',
]

const PRO_FEATURES = [
  'Unlimited Merlin builds & chat',
  'Playgroup-aware tuning',
  'Playstyle profile',
  'Proxy sheet generator',
  'Goldfish playtester',
  'Upgrade path tool',
  'Commander finder & Surprise Me',
  'Deck history & versioning',
  'Full analytics',
]

// ── CSS ───────────────────────────────────────────────────────────────────────

const LANDING_CSS = `
  @keyframes lp-gold-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }

  .lp-headline {
    background: linear-gradient(90deg, #9a7222, #f0d080, #c9a060, #f8e090, #9a7222);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: lp-gold-shimmer 6s linear infinite;
  }

  @keyframes lp-scroll-bounce {
    0%, 100% { transform: translateX(-50%) translateY(0);   opacity: 0.4; }
    50%       { transform: translateX(-50%) translateY(9px); opacity: 0.8; }
  }
  .lp-scroll-arrow {
    position: absolute;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    animation: lp-scroll-bounce 2.2s ease-in-out infinite;
    color: #4a4030;
    font-size: 20px;
    cursor: pointer;
    user-select: none;
    line-height: 1;
  }

  .lp-feature-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: default;
  }
  .lp-feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 14px 44px rgba(0,0,0,0.75), 0 0 22px rgba(140,105,40,0.1);
  }

  .lp-pro-card {
    transition: box-shadow 0.25s ease;
  }
  .lp-pro-card:hover {
    box-shadow: 0 0 60px rgba(200,160,60,0.14), 0 16px 44px rgba(0,0,0,0.8);
  }

  .lp-link {
    transition: color 0.15s;
  }
  .lp-link:hover { color: #8a7040 !important; }

  .lp-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 11px 26px;
    font-family: "Cinzel", serif; font-size: 11px;
    text-transform: uppercase; letter-spacing: 2px;
    background: linear-gradient(135deg, rgba(90,65,14,0.95), rgba(62,44,7,0.98));
    border: 1px solid rgba(180,140,55,0.55);
    color: #f0d080;
    border-radius: 2px;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(180,130,40,0.18);
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .lp-btn-primary:hover  { opacity: 0.88; }
  .lp-btn-primary:disabled { opacity: 0.5; cursor: default; }

  .lp-btn-ghost {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 11px 26px;
    font-family: "Cinzel", serif; font-size: 11px;
    text-transform: uppercase; letter-spacing: 2px;
    background: transparent;
    border: 1px solid rgba(100,85,55,0.42);
    color: #6a5e44;
    border-radius: 2px;
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .lp-btn-ghost:hover { opacity: 0.75; }
`

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage({ onEnterApp }: Props) {
  const { isSignedIn } = useAuthStore()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  // Enable scrolling for the landing page; restore on unmount
  useEffect(() => {
    const root = document.getElementById('root')
    const els = [document.documentElement, document.body, root].filter(Boolean) as HTMLElement[]

    els.forEach(el => {
      el.style.overflow = 'auto'
      el.style.height = 'auto'
    })

    return () => {
      els.forEach(el => {
        el.style.overflow = 'hidden'
        el.style.height = '100%'
      })
      if (root) root.style.height = '100%'
    }
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleUpgrade() {
    setCheckoutLoading(true)
    try {
      const result = await createCheckoutSession()
      if (result?.url) window.location.href = result.url
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Primary CTA — sign-in modal when logged out, enter app when signed in
  function PrimaryCTA({ className, style }: { className?: string; style?: React.CSSProperties }) {
    const label = isSignedIn ? 'Open the Builder →' : 'Start Building Free →'
    if (AUTH_ENABLED && !isSignedIn) {
      return (
        <SignInButton mode="modal">
          <button className={className ?? 'lp-btn-primary'} style={style}>{label}</button>
        </SignInButton>
      )
    }
    return (
      <button className={className ?? 'lp-btn-primary'} style={style} onClick={onEnterApp}>
        {label}
      </button>
    )
  }

  // Upgrade CTA — sign in first if logged out, else call Stripe checkout
  function UpgradeCTA({ className, style }: { className?: string; style?: React.CSSProperties }) {
    if (AUTH_ENABLED && !isSignedIn) {
      return (
        <SignInButton mode="modal">
          <button className={className ?? 'lp-btn-primary'} style={style}>Upgrade to Arcane →</button>
        </SignInButton>
      )
    }
    if (isSignedIn) {
      return (
        <button
          className={className ?? 'lp-btn-primary'}
          style={style}
          onClick={handleUpgrade}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? 'Summoning checkout…' : 'Upgrade to Arcane →'}
        </button>
      )
    }
    // No-auth fallback (local dev)
    return (
      <button className={className ?? 'lp-btn-primary'} style={style} onClick={onEnterApp}>
        Upgrade to Arcane →
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Decksmith',
    description: 'AI-powered Magic: The Gathering Commander deck builder',
    url: 'https://decksmith.gg',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier with 10 AI deck builds',
    },
    featureList: [
      'AI deck building with Merlin',
      'Commander bracket enforcement',
      'Playgroup-aware suggestions',
      'Real-time card pricing',
      'Proxy sheet generator',
      'Goldfish playtester',
    ],
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#b8a882', overflowX: 'hidden' }}>
      <SEO
        title="Commander Deck Builder for the Way You Play"
        description="Build Magic: The Gathering Commander decks tailored to your playstyle, pod, and power level. Meet Merlin — your personal deck advisor. Free to start."
        canonical="https://decksmith.gg"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <style>{LANDING_CSS}</style>

      <main>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HERO */}
      <section
        aria-label="Hero"
        style={{
          minHeight: '100dvh',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(80px, 12vw, 120px) clamp(1.5rem, 6vw, 5rem) 80px',
          textAlign: 'center',
        }}
      >
        {/* Gradient overlay — stone texture bleeds through */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(5,3,1,0.78) 0%, rgba(10,8,4,0.52) 50%, rgba(5,3,1,0.88) 100%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            marginBottom: 30,
            padding: '5px 14px',
            background: 'rgba(140,105,40,0.09)',
            border: '1px solid rgba(140,105,40,0.26)',
            borderRadius: 2,
          }}>
            <span className="text-micro" style={{ color: '#c9a060' }}>✦</span>
            <span className="text-micro" style={{ fontFamily: '"Cinzel", serif', textTransform: 'uppercase', letterSpacing: '3px', color: '#7a6838' }}>
              Powered by Claude AI
            </span>
          </div>

          {/* Headline */}
          <h1
            className="lp-headline"
            style={{
              fontFamily: '"Cinzel Decorative", serif',
              fontSize: 'clamp(1.75rem, 5.5vw, 3.4rem)',
              fontWeight: 900,
              lineHeight: 1.2,
              marginBottom: 22,
              letterSpacing: '1px',
            }}
          >
            Your Next Commander Deck.<br />Built Around You.
          </h1>

          {/* Subheadline */}
          <p style={{
            fontFamily: '"Crimson Pro", Georgia, serif',
            fontSize: 'clamp(1rem, 2.4vw, 1.15rem)',
            fontStyle: 'italic',
            color: '#7a6e54',
            lineHeight: 1.8,
            marginBottom: 38,
            maxWidth: 530,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Decksmith learns your playstyle, respects your pod, and builds complete
            100-card Commander decks tailored to how you actually want to play — not
            the global meta.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
            <PrimaryCTA />
            <button className="lp-btn-ghost" onClick={() => scrollTo('features')}>
              See How It Works ↓
            </button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            gap: 'clamp(24px, 6vw, 56px)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {[
              { n: '3', label: 'Free Builds' },
              { n: '99', label: 'Cards Per Deck' },
              { n: '4', label: 'Bracket Levels' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: '"Cinzel Decorative", serif',
                  fontSize: 'clamp(20px, 4vw, 28px)',
                  color: '#c9a060',
                  lineHeight: 1,
                }}>{s.n}</div>
                <div className="text-micro" style={{
                  marginTop: 5,
                  fontFamily: '"Cinzel", serif',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: '#3a3020',
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-scroll-arrow" onClick={() => scrollTo('features')}>↓</div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ FEATURES */}
      <section
        id="features"
        aria-label="Features"
        style={{
          padding: 'clamp(3.5rem, 9vw, 6.5rem) clamp(1.5rem, 6vw, 5rem)',
          background: 'rgba(5,3,1,0.68)',
          borderTop: '1px solid rgba(55,44,26,0.5)',
          borderBottom: '1px solid rgba(55,44,26,0.4)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader title="What Merlin Can Do" />

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 18 }}
          >
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="lp-feature-card"
                style={{
                  padding: '22px 20px',
                  background: 'rgba(14,11,6,0.88)',
                  border: '1px solid rgba(65,52,30,0.42)',
                  borderRadius: 3,
                }}
              >
                <div style={{ fontSize: 17, color: '#c9a060', marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: '#c9a060',
                  marginBottom: 10,
                }}>{f.title}</h3>
                <p style={{
                  fontFamily: '"Crimson Pro", Georgia, serif',
                  fontSize: 13.5,
                  color: '#6a5e44',
                  lineHeight: 1.72,
                  margin: 0,
                }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Tech attribution footnote */}
          <p className="text-label" style={{
            textAlign: 'center',
            marginTop: 36,
            fontFamily: '"Crimson Pro", Georgia, serif',
            fontStyle: 'italic',
            color: '#3a3020',
          }}>
            Merlin is powered by{' '}
            <a
              href="https://anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4a4030', textDecoration: 'underline', textDecorationColor: 'rgba(120,95,55,0.35)' }}
            >
              Claude AI
            </a>
            {' '}— built to understand Magic, not just generate text.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HOW IT WORKS */}
      <section
        id="how-it-works"
        aria-label="How it works"
        style={{
          padding: 'clamp(3.5rem, 9vw, 6.5rem) clamp(1.5rem, 6vw, 5rem)',
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <SectionHeader title="Forge Your Deck in Three Steps" />

          <div style={{ position: 'relative' }}>
            {/* Connecting line between step circles — desktop only */}
            <div
              className="hidden md:block"
              style={{
                position: 'absolute',
                top: 23,
                left: '22%',
                right: '22%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(140,105,40,0.28) 30%, rgba(140,105,40,0.28) 70%, transparent)',
                pointerEvents: 'none',
              }}
            />

            <div
              className="grid grid-cols-1 md:grid-cols-3"
              style={{ gap: 'clamp(28px, 4vw, 40px)' }}
            >
              {STEPS.map(step => (
                <div key={step.n} style={{ textAlign: 'center', padding: '0 8px' }}>
                  <div className="text-body" style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'rgba(14,11,6,0.92)',
                    border: '1px solid rgba(140,105,40,0.38)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    fontFamily: '"Cinzel Decorative", serif',
                    color: '#c9a060',
                    position: 'relative',
                    zIndex: 1,
                  }}>{step.n}</div>
                  <div style={{ fontSize: 22, marginBottom: 12 }}>{step.icon}</div>
                  <h3 className="text-label" style={{
                    fontFamily: '"Cinzel", serif',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: '#c9a060',
                    marginBottom: 12,
                  }}>{step.title}</h3>
                  <p style={{
                    fontFamily: '"Crimson Pro", Georgia, serif',
                    fontSize: 13.5,
                    color: '#6a5e44',
                    lineHeight: 1.75,
                    margin: 0,
                  }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA under steps */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <PrimaryCTA />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PRICING */}
      <section
        id="pricing"
        aria-label="Pricing"
        style={{
          padding: 'clamp(3.5rem, 9vw, 6.5rem) clamp(1.5rem, 6vw, 5rem)',
          background: 'rgba(5,3,1,0.68)',
          borderTop: '1px solid rgba(55,44,26,0.5)',
          borderBottom: '1px solid rgba(55,44,26,0.4)',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <SectionHeader
            title="Join the Guild"
            subtitle="Start free. Upgrade when Merlin earns it."
          />

          <div
            className="grid grid-cols-1 md:grid-cols-3"
            style={{ gap: 20, marginTop: 36 }}
          >
            {/* ── Free card */}
            <div style={{
              padding: '28px 24px',
              background: 'rgba(12,9,5,0.92)',
              border: '1px solid rgba(60,48,28,0.48)',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ marginBottom: 18 }}>
                <div className="text-label" style={{
                  fontFamily: '"Cinzel Decorative", serif',
                  color: '#7a6a4a',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: 8,
                }}>Free</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: '"Cinzel Decorative", serif', fontSize: 30, color: '#c9a060' }}>$0</span>
                  <span className="text-label" style={{ fontFamily: '"Cinzel", serif', color: '#3a3428' }}>forever</span>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(55,44,26,0.42)', marginBottom: 18 }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span className="text-micro" style={{ color: '#c9a060', marginTop: 3, flexShrink: 0 }}>✦</span>
                    <span style={{ fontFamily: '"Cinzel", serif', fontSize: 10.5, color: '#7a6a4a', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <PrimaryCTA className="lp-btn-ghost" style={{ width: '100%' }} />
            </div>

            {/* ── Arcane card */}
            <div
              className="lp-pro-card"
              style={{
                padding: '28px 24px',
                background: 'rgba(14,11,5,0.96)',
                border: '1px solid rgba(180,140,55,0.38)',
                borderRadius: 3,
                position: 'relative',
                boxShadow: '0 0 44px rgba(180,130,40,0.07)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Most Popular badge */}
              <div style={{
                position: 'absolute',
                top: -1,
                right: 20,
                padding: '3px 11px',
                background: 'rgba(90,65,12,0.95)',
                border: '1px solid rgba(180,140,55,0.45)',
                borderTop: 'none',
                borderRadius: '0 0 3px 3px',
                fontFamily: '"Cinzel", serif',
                fontSize: 7.5,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#f0d080',
              }}>Most Popular</div>

              <div style={{ marginBottom: 18 }}>
                <div className="text-label" style={{
                  fontFamily: '"Cinzel Decorative", serif',
                  color: '#c9a060',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: 8,
                }}>Arcane</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: '"Cinzel Decorative", serif', fontSize: 30, color: '#f0d080' }}>$5</span>
                  <span className="text-label" style={{ fontFamily: '"Cinzel", serif', color: '#5a5040' }}>/ month</span>
                </div>
                <p style={{ margin: '4px 0 0', fontFamily: '"Cinzel", serif', fontSize: 8.5, color: '#2a2418', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Cancel anytime
                </p>
              </div>

              <div style={{ height: 1, background: 'rgba(140,105,40,0.28)', marginBottom: 18 }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span className="text-micro" style={{ color: '#f0d080', marginTop: 3, flexShrink: 0 }}>✦</span>
                    <span style={{ fontFamily: '"Cinzel", serif', fontSize: 10.5, color: '#9a8a5a', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <UpgradeCTA style={{ width: '100%' }} />
            </div>

            {/* ── Grandmaster card */}
            <div style={{
              padding: '28px 24px',
              background: 'rgba(8,6,14,0.95)',
              border: '1px solid rgba(90,70,120,0.35)',
              borderRadius: 3,
              position: 'relative',
              boxShadow: '0 0 44px rgba(80,50,120,0.05)',
              display: 'flex',
              flexDirection: 'column',
              opacity: 0.9,
            }}>
              {/* Coming Soon badge */}
              <div style={{
                position: 'absolute',
                top: -1,
                right: 20,
                padding: '3px 11px',
                background: 'rgba(40,28,60,0.95)',
                border: '1px solid rgba(100,80,150,0.4)',
                borderTop: 'none',
                borderRadius: '0 0 3px 3px',
                fontFamily: '"Cinzel", serif',
                fontSize: 7.5,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#9a80c0',
              }}>Coming Soon</div>

              <div style={{ marginBottom: 18 }}>
                <div className="text-label" style={{
                  fontFamily: '"Cinzel Decorative", serif',
                  color: '#8a70aa',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: 8,
                }}>Grandmaster</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="text-heading" style={{ fontFamily: '"Cinzel", serif', color: '#5a4870', letterSpacing: '1px' }}>
                    Coming Soon
                  </span>
                </div>
                <p className="text-micro" style={{ margin: '6px 0 0', fontFamily: '"Cinzel", serif', color: '#3a3050', lineHeight: 1.5 }}>
                  For dedicated brewers, content creators, and LGS staff
                </p>
              </div>

              <div style={{ height: 1, background: 'rgba(80,60,100,0.2)', marginBottom: 18 }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Everything in Arcane',
                  'Unlimited deck history',
                  'Public deck sharing and profile page',
                  'Priority Merlin responses',
                  'Bulk deck import (up to 10 at once)',
                  'White-label export for content creators',
                  'Early access to new features',
                  'Private Discord and direct feedback line',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span className="text-label" style={{ color: '#4a3860', marginTop: 3, flexShrink: 0 }}>⊘</span>
                    <span style={{ fontFamily: '"Cinzel", serif', fontSize: 10.5, color: '#4a3a60', lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setWaitlistOpen(true)}
                className="w-full py-[10px] rounded-sm font-cinzel uppercase tracking-widest text-label transition-opacity hover:opacity-80"
                style={{
                  background: 'rgba(30,20,50,0.7)',
                  border: '1px solid rgba(90,70,130,0.4)',
                  color: '#7a60a0',
                  cursor: 'pointer',
                }}
              >
                Join the Waitlist →
              </button>
            </div>
          </div>
        </div>
      </section>

      </main>

      {waitlistOpen && <WaitlistModal onClose={() => setWaitlistOpen(false)} />}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ FOOTER */}
      <footer style={{
        padding: 'clamp(2rem, 5vw, 3rem) clamp(1.5rem, 6vw, 5rem)',
        borderTop: '1px solid rgba(44,35,20,0.5)',
        background: 'rgba(3,2,1,0.82)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div
            className="flex flex-col md:flex-row items-center md:items-start justify-between"
            style={{ gap: 28 }}
          >
            {/* Logo + tagline */}
            <div style={{ textAlign: 'center' }} className="md:text-left">
              <div className="text-body" style={{
                fontFamily: '"Cinzel Decorative", serif',
                color: '#c9a060',
                letterSpacing: '2px',
                marginBottom: 5,
              }}>⚔ Decksmith</div>
              <p className="text-label" style={{
                fontFamily: '"Crimson Pro", Georgia, serif',
                fontStyle: 'italic',
                color: '#2a2418',
                margin: 0,
              }}>Forge your legacy · card by card</p>
            </div>

            {/* Community links */}
            <div style={{ display: 'flex', gap: 'clamp(18px, 4vw, 32px)', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              {[
                { label: 'r/EDH',    href: 'https://reddit.com/r/EDH' },
                { label: 'Scryfall', href: 'https://scryfall.com' },
                { label: 'EDHREC',   href: 'https://edhrec.com' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-link"
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 9.5,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: '#3a3020',
                    textDecoration: 'none',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Attribution + copyright */}
            <div style={{ textAlign: 'center' }} className="md:text-right">
              <p style={{ fontFamily: '"Cinzel", serif', fontSize: 8.5, color: '#222018', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 3px' }}>
                Built with Claude
              </p>
              <p style={{ fontFamily: '"Cinzel", serif', fontSize: 8.5, color: '#1a1810', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                © {new Date().getFullYear()} Decksmith
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Shared section header ─────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 44 }}>
      <h2 style={{
        fontFamily: '"Cinzel Decorative", serif',
        fontSize: 'clamp(1.15rem, 3.2vw, 1.75rem)',
        color: '#c9a060',
        letterSpacing: '2px',
        marginBottom: subtitle ? 10 : 16,
        lineHeight: 1.3,
      }}>{title}</h2>
      {subtitle && (
        <p className="text-body" style={{
          fontFamily: '"Crimson Pro", Georgia, serif',
          fontStyle: 'italic',
          color: '#4a4030',
          margin: '0 0 14px',
        }}>{subtitle}</p>
      )}
      <div style={{
        width: 52,
        height: 1,
        background: 'rgba(140,105,40,0.32)',
        margin: '0 auto',
      }} />
    </div>
  )
}
