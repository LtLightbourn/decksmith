import React, { useState, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDeckStore } from './store/deckStore'
import SearchPanelWithTerm from './components/SearchPanel/SearchPanelWithTerm'
import DeckPanel from './components/DeckPanel/DeckPanel'
import AnalyticsSidebar from './components/AnalyticsSidebar/AnalyticsSidebar'
import WizardModal from './components/WizardModal/WizardModal'
import CommanderFinderModal from './components/CommanderFinder/CommanderFinderModal'
import PlaystyleModal from './components/PlaystyleModal/PlaystyleModal'
import MerlinSprite from './components/WizardModal/MerlinSprite'
import ToastStack from './components/shared/Toast'
import ImportExportModal from './components/shared/ImportExportModal'
import ProxySheetModal from './components/ProxySheet/ProxySheetModal'
import ProfileModal from './components/ProfileModal/ProfileModal'
import { generateProfileLabel } from './utils/playstyleProfile'
import { AUTH_ENABLED, useAuthStore } from './store/authStore'
import AuthBridge from './components/Auth/AuthBridge'
import AuthHeaderButtons from './components/Auth/AuthHeaderButtons'
import SignInPromptModal from './components/Auth/SignInPromptModal'
import UpgradeModal from './components/Auth/UpgradeModal'
import { ProGate } from './components/Auth/ProGate'
import { fetchStripeStatus, generateSurpriseDeck } from './utils/claudeApi'
import SurpriseOverlay from './components/shared/SurpriseOverlay'
import ErrorBoundary from './components/shared/ErrorBoundary'
import SharedDeckModal from './components/shared/SharedDeckModal'
import LandingPage from './pages/LandingPage'
import { SEO } from './components/SEO/SEO'
import { decodeDeck } from './utils/deckParser'
import type { SharedDeckWire } from './utils/deckParser'
import { fetchCardByName, fetchCardsByNames } from './hooks/useScryfall'
import { validateAndCleanDecklist } from './utils/deckValidation'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
})

type MobileTab = 'search' | 'deck' | 'stats'

function AppShell() {
  const {
    commander, cards, savedDecks, activeDeckName,
    setWizardOpen, saveDeck, loadDeck, deleteSavedDeck,
    clearDeck, analyticsOpen, addToast,
    playstyle, playstyleOnboardingShown, setPlaystyleModalOpen,
    playerName, deckHistory, setProfileModalOpen,
    loadDeckCards, setCommander, saveToHistory, targetBracket,
    setWizardInitialChat,
    activeDeckId, deckVersions, restoreVersion,
  } = useDeckStore()

  // Auto-show playstyle questionnaire on first visit
  useEffect(() => {
    if (!playstyleOnboardingShown) {
      const timer = setTimeout(() => setPlaystyleModalOpen(true), 600)
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const profileLabel = playstyle ? generateProfileLabel(playstyle) : null

  const { isSignedIn, setUsageRemaining, setIsPro } = useAuthStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [deckMenuOpen, setDeckMenuOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('search')
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false)
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [surprisePhase, setSurprisePhase] = useState<'confirm' | 'loading' | null>(null)
  const [sharedDeck, setSharedDeck] = useState<SharedDeckWire | null>(null)
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined)

  // Undo-restore snapshot (in memory only — not persisted)
  const undoSnapshotRef = useRef<{ cards: typeof cards; commander: typeof commander } | null>(null)

  // Listen for usage updates and limit events from claudeApi
  useEffect(() => {
    const onUsage = (e: Event) => {
      const { remaining } = (e as CustomEvent<{ remaining: number }>).detail
      // 9999 is the sentinel value for pro users — don't show a number
      if (remaining < 9999) setUsageRemaining(remaining)
    }
    const onLimit = () => {
      setUpgradeFeature(undefined)
      setUpgradeModalOpen(true)
    }
    const onProRequired = (e: Event) => {
      const feature = (e as CustomEvent<{ feature?: string }>).detail?.feature
      setUpgradeFeature(feature)
      setUpgradeModalOpen(true)
    }
    window.addEventListener('decksmith:usage', onUsage)
    window.addEventListener('decksmith:limit-reached', onLimit)
    window.addEventListener('decksmith:pro-required', onProRequired)
    return () => {
      window.removeEventListener('decksmith:usage', onUsage)
      window.removeEventListener('decksmith:limit-reached', onLimit)
      window.removeEventListener('decksmith:pro-required', onProRequired)
    }
  }, [setUsageRemaining])

  // Handle return from Stripe Checkout: ?session_id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (!sessionId) return

    // Clear the URL immediately
    window.history.replaceState({}, '', '/')

    // Show success toast and refresh Pro status
    addToast('Welcome to Decksmith Arcane! ✦', 'success')
    fetchStripeStatus().then(data => {
      if (data) {
        setIsPro(data.isPro)
        if (data.isPro) setUsageRemaining(null)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle incoming shared deck: ?deck=<compressed>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const compressed = params.get('deck')
    if (!compressed) return
    window.history.replaceState({}, '', '/')
    const wire = decodeDeck(compressed)
    if (wire) setSharedDeck(wire)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openMerlin() {
    if (AUTH_ENABLED && !isSignedIn) {
      setSignInPromptOpen(true)
    } else {
      setWizardOpen(true)
    }
  }

  function handleRestoreVersion(version: import('./types').DeckVersion) {
    // Snapshot current deck state before restoring
    undoSnapshotRef.current = {
      cards: JSON.parse(JSON.stringify(cards)) as typeof cards,
      commander: commander ? { ...commander } : null,
    }
    restoreVersion(version.id)
    addToast(
      `Restored to: ${version.label}`,
      'success',
      {
        label: 'Undo',
        onClick: () => {
          const snap = undoSnapshotRef.current
          if (snap) {
            loadDeckCards(snap.commander, snap.cards)
            undoSnapshotRef.current = null
          }
        },
      },
    )
  }

  // Ctrl+Z / Cmd+Z — restore last version
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrlZ = (e.ctrlKey || e.metaKey) && e.key === 'z'
      if (!isCtrlZ) return
      // Don't intercept if inside a text field
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      e.preventDefault()
      const key = activeDeckId ?? '__unsaved__'
      const versions = deckVersions[key] ?? []
      if (versions.length === 0) return
      handleRestoreVersion(versions[0])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeDeckId, deckVersions, cards, commander]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSurpriseRequest() {
    if (AUTH_ENABLED && !isSignedIn) {
      setSignInPromptOpen(true)
      return
    }
    const deckInProgress = cards.length > 0 || commander !== null
    if (deckInProgress) {
      setSurprisePhase('confirm')
    } else {
      runSurprise()
    }
  }

  async function runSurprise() {
    setSurprisePhase('loading')
    clearDeck()
    try {
      const recentCmds = deckHistory
        .slice(0, 8)
        .map(e => e.commander?.name)
        .filter(Boolean) as string[]

      const result = await generateSurpriseDeck(targetBracket, playstyle, recentCmds)

      if (!result.commander) {
        throw new Error('Merlin lost the thread — no commander returned')
      }

      const [commanderCard, { found, notFound }] = await Promise.all([
        fetchCardByName(result.commander),
        fetchCardsByNames(result.cards.slice(0, 99)),
      ])

      if (!commanderCard) {
        throw new Error(`Could not find commander "${result.commander}" on Scryfall`)
      }

      const { cards: cleanCards, hadDuplicates } = validateAndCleanDecklist(
        found.map(c => ({ card: c, qty: 1 })),
        commanderCard,
      )

      loadDeckCards(commanderCard, cleanCards)

      if (hadDuplicates) addToast('Duplicate cards merged automatically', 'warning')
      if (notFound.length > 0) {
        addToast(`${notFound.length} card${notFound.length > 1 ? 's' : ''} not found — skipped`, 'warning')
      }

      // Auto-log to grimoire with surprise tag
      saveToHistory({
        id: `history-${Date.now()}`,
        name: `Surprise: ${result.commander}`,
        commander: commanderCard,
        cards: cleanCards,
        bracket: targetBracket,
        savedAt: Date.now(),
        summary: result.description,
        themes: [],
        tag: '🎲 Surprise',
      })

      // Open Wizard in chat phase with Merlin's intro
      const intro = `I've built you something a little unexpected...\n\n${result.description}\n\nYour commander is **${result.commander}**. I've loaded ${found.length} cards into your deck. Ask me anything about it, or let fate guide you further.`
      setWizardInitialChat(intro)
      setSurprisePhase(null)
      setWizardOpen(true)

      addToast(`✦ Surprise! Merlin built a deck led by ${result.commander}!`, 'success')
    } catch (err) {
      setSurprisePhase(null)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addToast(`Surprise failed: ${msg}`, 'error')
    }
  }

  const totalCards = cards.reduce((s, dc) => s + dc.qty, 0)
  const isOver = totalCards > 99

  function handleSave() {
    const name = saveName.trim() || activeDeckName || 'My Deck'
    saveDeck(name)
    setSaveName('')
    setDeckMenuOpen(false)
  }

  return (
    <div className="vine-wrap flex flex-col h-full" style={{ position: 'relative' }}>
      <SEO noIndex />
      {/* App frame — stone bg + crumble clip */}
      <div
        className="stone-bg torch-glow crumble-clip flex flex-col flex-1 min-h-0"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Iron brackets */}
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* ── Title bar ─────────────────────────── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-3 md:px-6 py-2 border-b relative"
          style={{ borderColor: 'rgba(80,65,40,0.5)', background: 'rgba(8,6,4,0.5)' }}
        >
          {/* Left torch — desktop only */}
          <span className="hidden md:inline animate-flicker text-xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,150,50,0.8))' }}>🔥</span>

          {/* Title */}
          <div className="text-center flex-1 md:mx-4">
            <h1
              className="font-cinzel-deco uppercase leading-none"
              style={{ fontSize: 18, letterSpacing: '3px', color: '#c9a060', textShadow: '0 0 20px rgba(200,150,60,0.4), 0 1px 3px rgba(0,0,0,0.9)' }}
            >
              ⚔ Decksmith ⚔
            </h1>
            <p className="hidden md:block text-[9px] font-body italic mt-[2px]" style={{ color: 'rgba(160,120,50,0.4)', letterSpacing: 4 }}>
              forge your legacy · card by card
            </p>
          </div>

          {/* Right: torch + import (mobile) + profile + auth */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline animate-flicker text-xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,150,50,0.8))' }}>🔥</span>
            {/* Import/export — mobile only shortcut */}
            <button
              className="md:hidden text-[14px] text-gold-faint"
              onClick={() => setImportExportOpen(true)}
              title="Import / Export"
              aria-label="Import / Export"
            >⇅</button>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-sm transition-all"
              style={{
                background: deckHistory.length > 0 ? 'rgba(30,22,10,0.7)' : 'rgba(14,10,5,0.5)',
                border: deckHistory.length > 0 ? '1px solid rgba(140,105,40,0.35)' : '1px solid rgba(50,40,24,0.3)',
                color: deckHistory.length > 0 ? '#c9a060' : '#4a4030',
              }}
              title={playerName ? `${playerName}'s Grimoire` : 'Open Grimoire'}
            >
              <span style={{ fontSize: 11 }}>📖</span>
              {playerName && (
                <span className="hidden md:inline text-[8px] font-cinzel tracking-wide" style={{ color: '#a08040' }}>
                  {playerName}
                </span>
              )}
              {deckHistory.length > 0 && (
                <span
                  className="text-[7px] font-cinzel rounded-sm px-1"
                  style={{ background: 'rgba(140,100,30,0.3)', color: '#8a6a30' }}
                >
                  {deckHistory.length}
                </span>
              )}
            </button>
            {AUTH_ENABLED && <AuthHeaderButtons />}
          </div>
        </div>

        {/* ── Search bar row ─────────────────────── */}
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: 'rgba(50,42,28,0.6)', background: 'rgba(10,8,5,0.4)' }}
        >
          <input
            type="text"
            placeholder="Search the arcane archives..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-[6px] text-[12px] rounded-sm"
            style={{
              background: 'rgba(12,10,6,0.7)',
              border: '1px solid rgba(70,58,36,0.5)',
              color: '#b8a882',
              fontFamily: 'Georgia, serif',
              outline: 'none',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
            }}
            onKeyDown={e => e.key === 'Escape' && setSearchTerm('')}
            onFocus={() => setMobileTab('search')}
          />

          {/* Playstyle badge */}
          <ProGate feature="playstyle">
            <button
              onClick={() => setPlaystyleModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-[5px] rounded-sm transition-all hover:opacity-90 flex-shrink-0"
              style={{
                background: profileLabel ? 'rgba(30,22,10,0.7)' : 'rgba(18,14,8,0.6)',
                border: profileLabel ? '1px solid rgba(150,110,40,0.4)' : '1px solid rgba(60,50,30,0.35)',
                color: profileLabel ? '#b08840' : '#4a4030',
              }}
              title={profileLabel ? `Playstyle: ${profileLabel}` : 'Set your playstyle profile'}
            >
              <span style={{ fontSize: 11 }}>♟</span>
              <span className="hidden sm:inline text-[9px] font-cinzel uppercase tracking-wide">
                {profileLabel ?? 'Playstyle'}
              </span>
            </button>
          </ProGate>

          {/* Surprise Me — desktop only */}
          <div className="hidden md:block flex-shrink-0">
            <ProGate feature="surprise-me">
              <button
                onClick={handleSurpriseRequest}
                className="flex items-center gap-1.5 px-3 py-[5px] rounded-sm transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, rgba(80,55,8,0.75), rgba(55,35,4,0.85))',
                  border: '1px solid rgba(180,130,25,0.4)',
                  color: '#d4a030',
                }}
                title="Let Merlin build you a surprise deck"
              >
                <span style={{ fontSize: 13 }}>🎲</span>
                <span className="text-[10px] font-cinzel uppercase tracking-[1px]">Surprise Me</span>
              </button>
            </ProGate>
          </div>

          {/* Ask Merlin — tablet/desktop only; FAB handles mobile */}
          <button
            onClick={openMerlin}
            className="hidden md:flex items-center gap-2 px-3 py-[5px] rounded-sm transition-all hover:opacity-90 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(60,35,90,0.8), rgba(40,20,60,0.9))',
              border: '1px solid rgba(150,100,230,0.4)',
              color: '#c8a8f0',
              boxShadow: '0 0 12px rgba(140,80,220,0.15)',
            }}
          >
            <MerlinSprite orbState="idle" size={0.55} />
            <span className="text-[10px] font-cinzel uppercase tracking-[1px]">Ask Merlin</span>
          </button>
        </div>

        {/* ── Three-column layout ────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* Search col — full on mobile when active, 45% tablet, 38% desktop */}
          <div
            className={`flex-col border-r min-h-0 ${mobileTab === 'search' ? 'flex flex-1' : 'hidden'} md:flex md:flex-[0_0_45%] lg:flex-[0_0_38%]`}
            style={{ borderColor: 'rgba(50,42,28,0.6)' }}
          >
            <SearchPanelWithTerm term={searchTerm} />
          </div>

          {/* Deck col — full on mobile when active, fills remaining on tablet/desktop */}
          <div
            className={`flex-col flex-1 min-h-0 ${mobileTab === 'deck' ? 'flex' : 'hidden'} md:flex lg:border-r`}
            style={{ borderColor: 'rgba(50,42,28,0.6)' }}
          >
            <ErrorBoundary>
              <DeckPanel onSurprise={handleSurpriseRequest} onRestoreVersion={handleRestoreVersion} />
            </ErrorBoundary>
          </div>

          {/* Stats tab — mobile only, drawer handles tablet, column handles desktop */}
          {mobileTab === 'stats' && (
            <div className="flex flex-col flex-1 min-h-0 md:hidden overflow-y-auto">
              <AnalyticsSidebar />
            </div>
          )}

          {/* Desktop analytics sidebar */}
          {analyticsOpen ? (
            <div className="hidden lg:flex flex-col" style={{ flex: '0 0 22%' }}>
              <ErrorBoundary>
                <AnalyticsSidebar />
              </ErrorBoundary>
            </div>
          ) : (
            <div
              className="hidden lg:flex flex-col items-center border-l"
              style={{ width: 28, borderColor: 'rgba(50,42,28,0.6)', background: 'rgba(8,6,4,0.5)' }}
            >
              <ErrorBoundary>
                <AnalyticsSidebar />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* ── Status bar — tablet/desktop only ──── */}
        <div
          className="hidden md:flex flex-shrink-0 items-center gap-3 px-4 py-[5px] border-t"
          style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(6,4,2,0.6)' }}
        >
          <span className="text-[9px] font-cinzel tracking-widest uppercase text-gold-dim">
            The Undying Archives
          </span>
          <div className="flex-1 gold-line" />

          {commander && (
            <span className="text-[9px] font-cinzel" style={{ color: '#8a7040' }}>
              ♛ {commander.name}
            </span>
          )}

          <span className="text-[9px] font-cinzel" style={{ color: isOver ? '#cc4444' : '#5a5040' }}>
            {totalCards} / 99 cards
          </span>

          {/* Saved decks menu */}
          <div className="relative">
            <button
              onClick={() => setDeckMenuOpen(d => !d)}
              className="text-[9px] font-cinzel uppercase tracking-widest px-2 py-[3px] rounded-sm"
              style={{ color: '#c9a060', border: '1px solid rgba(120,95,55,0.3)', background: 'rgba(30,22,12,0.6)' }}
            >
              ◆ {activeDeckName}
            </button>
            {deckMenuOpen && (
              <div
                className="absolute bottom-8 right-0 rounded-sm overflow-hidden z-30"
                style={{ minWidth: 200, background: 'rgba(18,14,8,0.98)', border: '1px solid rgba(100,80,45,0.5)', boxShadow: '0 0 30px rgba(0,0,0,0.9)' }}
              >
                <div className="flex gap-1 p-2 border-b" style={{ borderColor: 'rgba(60,50,30,0.4)' }}>
                  <input
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="Deck name..."
                    className="flex-1 px-2 py-1 text-[10px] rounded-sm"
                    style={{ background: 'rgba(10,8,4,0.8)', border: '1px solid rgba(60,50,30,0.4)', color: '#b0a070', fontFamily: 'Georgia,serif', outline: 'none' }}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    className="px-2 py-1 text-[10px] font-cinzel rounded-sm"
                    style={{ background: 'rgba(30,44,18,0.8)', border: '1px solid rgba(70,110,40,0.4)', color: '#80b060' }}
                  >Save</button>
                </div>
                {savedDecks.length === 0 && (
                  <p className="px-3 py-2 text-[10px] font-body italic text-gold-dim">No saved decks yet</p>
                )}
                {savedDecks.map(d => (
                  <div key={d.id} className="flex items-center gap-1 px-2 py-1 hover:bg-[rgba(180,140,60,0.06)]">
                    <button
                      onClick={() => { loadDeck(d.id); setDeckMenuOpen(false) }}
                      className="flex-1 text-left text-[10px] font-cinzel"
                      style={{ color: '#b0a060' }}
                    >{d.name}</button>
                    <button
                      onClick={() => deleteSavedDeck(d.id)}
                      className="text-[10px]"
                      style={{ color: '#6a4040' }}
                      aria-label={`Delete ${d.name}`}
                    >✕</button>
                  </div>
                ))}
                <div className="border-t p-2" style={{ borderColor: 'rgba(60,50,30,0.4)' }}>
                  <button
                    onClick={() => { clearDeck(); setDeckMenuOpen(false) }}
                    className="text-[9px] font-cinzel uppercase tracking-widest w-full text-left"
                    style={{ color: '#6a4040' }}
                  >✕ Clear Deck</button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setImportExportOpen(true)}
            className="text-[9px] font-cinzel uppercase tracking-widest text-gold-faint"
          >
            ⇅ Export
          </button>
        </div>
      </div>

      {/* ── Mobile bottom nav — OUTSIDE stone-bg (avoids clip-path) ── */}
      <nav
        className="md:hidden flex-shrink-0 flex border-t"
        style={{
          borderColor: 'rgba(80,65,40,0.5)',
          background: 'rgba(10,8,5,0.97)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {([
          { id: 'search', label: 'Search', icon: '⚗' },
          { id: 'deck',   label: 'Deck',   icon: '♜' },
          { id: 'stats',  label: 'Stats',  icon: '◈' },
        ] as { id: MobileTab; label: string; icon: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-[2px]"
            style={{
              minHeight: 52,
              color: mobileTab === tab.id ? '#c9a060' : '#4a4030',
              background: mobileTab === tab.id ? 'rgba(140,105,40,0.08)' : 'transparent',
              borderTop: mobileTab === tab.id ? '2px solid rgba(180,140,60,0.5)' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span className="text-[9px] font-cinzel uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Floating Merlin FAB — mobile only, OUTSIDE stone-bg ── */}
      <button
        className="md:hidden fixed z-40 flex items-center justify-center rounded-full"
        style={{
          bottom: 'calc(60px + env(safe-area-inset-bottom))',
          right: 16,
          width: 48,
          height: 48,
          background: 'linear-gradient(135deg, rgba(60,35,90,0.95), rgba(40,20,60,0.98))',
          border: '1px solid rgba(150,100,230,0.5)',
          boxShadow: '0 0 20px rgba(140,80,220,0.3), 0 4px 12px rgba(0,0,0,0.6)',
        }}
        onClick={openMerlin}
        title="Ask Merlin"
      >
        <MerlinSprite orbState="idle" size={0.6} />
      </button>

      {/* ── Tablet analytics drawer — OUTSIDE stone-bg ── */}
      <div
        className="hidden md:flex lg:hidden flex-col fixed right-0 top-0 bottom-0 z-30 overflow-hidden"
        style={{
          width: 280,
          transform: analyticsDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          background: '#1e1a14',
          borderLeft: '1px solid rgba(80,65,40,0.5)',
        }}
      >
        <AnalyticsSidebar />
      </div>

      {/* Tablet drawer handle */}
      <button
        className="hidden md:flex lg:hidden fixed z-30 flex-col items-center justify-center"
        style={{
          right: analyticsDrawerOpen ? 280 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          transition: 'right 0.25s ease',
          background: 'rgba(20,16,10,0.95)',
          border: '1px solid rgba(80,65,40,0.5)',
          borderRight: 'none',
          borderRadius: '4px 0 0 4px',
          padding: '10px 6px',
          gap: 3,
        }}
        onClick={() => setAnalyticsDrawerOpen(d => !d)}
      >
        <span style={{ fontSize: 13, color: '#c9a060' }}>◈</span>
        <span
          className="text-[8px] font-cinzel uppercase tracking-widest"
          style={{ writingMode: 'vertical-rl', color: '#8a7040' }}
        >
          Stats
        </span>
      </button>

      {/* Tablet backdrop */}
      {analyticsDrawerOpen && (
        <div
          className="hidden md:block lg:hidden fixed inset-0 z-20"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setAnalyticsDrawerOpen(false)}
        />
      )}

      {/* Modals */}
      <ErrorBoundary>
        <WizardModal />
      </ErrorBoundary>
      <CommanderFinderModal />
      {surprisePhase && (
        <SurpriseOverlay
          phase={surprisePhase}
          onConfirm={runSurprise}
          onCancel={() => setSurprisePhase(null)}
        />
      )}
      <PlaystyleModal />
      <ProxySheetModal />
      <ProfileModal />
      {importExportOpen && <ImportExportModal onClose={() => setImportExportOpen(false)} />}
      {AUTH_ENABLED && signInPromptOpen && <SignInPromptModal onClose={() => setSignInPromptOpen(false)} />}
      {upgradeModalOpen && <UpgradeModal onClose={() => { setUpgradeModalOpen(false); setUpgradeFeature(undefined) }} feature={upgradeFeature} />}
      {sharedDeck && <SharedDeckModal deck={sharedDeck} onClose={() => setSharedDeck(null)} />}
      <ToastStack />
    </div>
  )
}

// ── Landing / builder router ──────────────────────────────────────────────────

function AppWithLanding() {
  const { isSignedIn, isLoaded } = useAuthStore()
  const [enteredApp, setEnteredApp] = useState(() =>
    sessionStorage.getItem('decksmith_entered') === '1',
  )

  // Auto-enter the builder when auth loads and user is already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      sessionStorage.setItem('decksmith_entered', '1')
      setEnteredApp(true)
    }
  }, [isLoaded, isSignedIn])

  function handleEnterApp() {
    sessionStorage.setItem('decksmith_entered', '1')
    setEnteredApp(true)
  }

  // Show a blank dark screen while Clerk hydrates to prevent a landing-page
  // flash for already-signed-in returning users.
  if (AUTH_ENABLED && !isLoaded) {
    return (
      <>
        <AuthBridge />
        <div style={{ position: 'fixed', inset: 0, background: '#06040200' }} />
      </>
    )
  }

  const showLanding = !isSignedIn && !enteredApp

  return (
    <>
      {AUTH_ENABLED && <AuthBridge />}
      {showLanding
        ? <LandingPage onEnterApp={handleEnterApp} />
        : <AppShell />
      }
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWithLanding />
    </QueryClientProvider>
  )
}
