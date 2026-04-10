import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore, AUTH_ENABLED } from '../../store/authStore'
import { useDeckStore } from '../../store/deckStore'
import MerlinSprite from './MerlinSprite'
import { buildDeck, chatWithMerlin, generateSmartGreeting } from '../../utils/claudeApi'
import { buildPlayerMemory, memoryGuidance } from '../../utils/playerMemory'
import { validateAndCleanDecklist } from '../../utils/deckValidation'
import { fetchCardsByNames, fetchCardByName } from '../../hooks/useScryfall'
import type { WizardTab, DeckArchetype, DeckBudget } from '../../types'
import type { ChatMessage } from '../../utils/claudeApi'
import { BRACKET_LABELS } from '../../utils/bracketData'
import { playstyleGuidance } from '../../utils/playstyleProfile'
import BugReportModal from '../shared/BugReportModal'

const ARCHETYPES: DeckArchetype[] = [
  'Aggro', 'Control', 'Combo', 'Midrange', 'Stax',
  'Voltron', 'Tokens', 'Superfriends', 'Spellslinger', 'Reanimator', 'Goodstuff',
]
const BUDGETS: DeckBudget[] = ['Casual', 'Focused', 'High Power', 'No Limit']
const COLORS_LIST = ['W', 'U', 'B', 'R', 'G']

type OrbState = 'idle' | 'loading' | 'success' | 'error'
type Phase = 'form' | 'chat'

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(12,8,4,0.8)',
  border: '1px solid rgba(80,65,40,0.5)',
  color: '#c0b090',
  borderRadius: 2,
  fontFamily: 'Georgia, serif',
  outline: 'none',
  padding: '6px 10px',
  width: '100%',
  resize: 'vertical',
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  resize: undefined,
  cursor: 'pointer',
}

export default function WizardModal() {
  const {
    wizardOpen, setWizardOpen, cards, commander, loadDeckCards, setCommander, addToast,
    targetBracket, playgroup, playstyle,
    playerName, neverSuggestCards, deckHistory,
    wizardPreFill, setWizardPreFill,
    wizardInitialChat, setWizardInitialChat,
    saveVersion,
  } = useDeckStore()

  const { isPro } = useAuthStore()
  const chatLocked = AUTH_ENABLED && !isPro

  const styleGuidance = playstyleGuidance(playstyle)
  const memory = buildPlayerMemory(deckHistory, neverSuggestCards)
  const memGuide = memoryGuidance(playerName, memory)
  const fullGuidance = [styleGuidance, memGuide].filter(Boolean).join('\n\n')

  // Form state
  const [tab, setTab] = useState<WizardTab>('vibe')
  const [vibe, setVibe] = useState('')
  const [archetype, setArchetype] = useState<DeckArchetype>('Midrange')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [budget, setBudget] = useState<DeckBudget>('Focused')
  const [notes, setNotes] = useState('')

  // Chat state
  const [phase, setPhase] = useState<Phase>('form')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [lastError, setLastError] = useState<string | null>(null)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  const [greeting, setGreeting] = useState<string | null>(null)
  const [greetingLoading, setGreetingLoading] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Open directly in chat phase when a surprise deck is loaded
  useEffect(() => {
    if (!wizardOpen || !wizardInitialChat) return
    setChatHistory([{ role: 'assistant', content: wizardInitialChat }])
    setPhase('chat')
    setWizardInitialChat(null)
  }, [wizardOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply pre-fill from Commander Finder when modal opens
  useEffect(() => {
    if (!wizardOpen || !wizardPreFill) return
    if (wizardPreFill.vibe) {
      setTab('vibe')
      setVibe(wizardPreFill.vibe)
    } else {
      setTab('keywords')
      if (wizardPreFill.archetype) setArchetype(wizardPreFill.archetype as typeof archetype)
      if (wizardPreFill.colors) setSelectedColors(wizardPreFill.colors)
      if (wizardPreFill.budget) setBudget(wizardPreFill.budget as typeof budget)
      if (wizardPreFill.notes) setNotes(wizardPreFill.notes)
    }
    setWizardPreFill(null)
  }, [wizardOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch smart greeting when modal opens with history
  useEffect(() => {
    if (!wizardOpen) { setGreeting(null); return }
    if (memory.totalDecks === 0) return
    setGreetingLoading(true)
    generateSmartGreeting(playerName, memory.recentCommanders, memory.preferredStrategies, memory.totalDecks)
      .then(g => setGreeting(g))
      .catch(() => {})
      .finally(() => setGreetingLoading(false))
  }, [wizardOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleColor(c: string) {
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  function buildDeckContext(): string {
    if (!commander && cards.length === 0) return 'No deck loaded.'
    const lines = [
      `Commander: ${commander?.name ?? 'None'}`,
      `Cards (${cards.reduce((s, dc) => s + dc.qty, 0)}):`,
      ...cards.map(dc => dc.card.name),
    ]
    return lines.join('\n')
  }

  function addMessage(role: ChatMessage['role'], content: string) {
    setChatHistory(prev => [...prev, { role, content }])
  }

  async function handleForge() {
    setOrbState('loading')
    setStatusMsg('Merlin is consulting the arcane archives...')

    try {
      const podNames = playgroup.map(c => c.name)
      const input = tab === 'vibe'
        ? { vibe, bracket: targetBracket, playgroup: podNames, playstyle: fullGuidance }
        : { archetype, colors: selectedColors, budget, notes, bracket: targetBracket, playgroup: podNames, playstyle: fullGuidance }

      let result = await buildDeck(input)

      // If Claude returned a clearly broken deck (too few unique cards), retry once
      if (result.cards.length < 80) {
        setStatusMsg('Refining deck...')
        result = await buildDeck(input)
      }

      if (!result.commander) {
        throw new Error('Merlin did not name a commander — try again')
      }

      // Auto-version the current deck before replacing it
      if (cards.length > 0 || commander) {
        saveVersion(`Before Merlin forge — ${result.commander}`)
      }

      // Deduplicate and hard-cap basic lands before fetching — last line of defence
      const BASIC_LAND_NAMES = new Set(['Mountain', 'Plains', 'Island', 'Swamp', 'Forest', 'Wastes'])
      const seenCards = new Set<string>()
      const basicCounts = new Map<string, number>()
      const cleanedCards = result.cards.filter(name => {
        const key = name.toLowerCase().trim()
        if (!key || seenCards.has(key)) return false
        seenCards.add(key)
        if (BASIC_LAND_NAMES.has(name)) {
          const n = (basicCounts.get(name) ?? 0) + 1
          basicCounts.set(name, n)
          return n <= 20
        }
        return true
      })

      // If after deduplication and capping we still have too few cards, the build failed
      if (cleanedCards.length < 60) {
        throw new Error(`Merlin only returned ${cleanedCards.length} unique cards — please try again`)
      }

      setStatusMsg(`Commander: ${result.commander} — verifying ${cleanedCards.length} cards with Scryfall...`)

      // Fetch commander and deck cards in parallel
      const [commanderCard, { found, notFound }] = await Promise.all([
        fetchCardByName(result.commander),
        fetchCardsByNames(cleanedCards.slice(0, 99)),
      ])

      if (!commanderCard) {
        throw new Error(`Could not find commander "${result.commander}" on Scryfall`)
      }

      // Guard: if Scryfall only validated a handful of cards, Claude hallucinated most names
      if (found.length < 60) {
        throw new Error(
          `Merlin's cards didn't check out — only ${found.length} of ${cleanedCards.length} card names were real. Please try again.`
        )
      }

      const rawDeckCards = found.map(c => ({ card: c, qty: 1 }))
      const { cards: deckCards, hadDuplicates } = validateAndCleanDecklist(rawDeckCards, commanderCard)
      if (hadDuplicates) addToast('Duplicate cards merged automatically', 'warning')
      loadDeckCards(commanderCard, deckCards)

      setOrbState('success')

      if (notFound.length > 0) {
        addToast(`${notFound.length} card${notFound.length > 1 ? 's' : ''} not found — skipped`, 'warning')
      }

      // Switch to chat phase with Merlin's opening message
      const openingMsg = `${result.description}\n\nYour commander is **${result.commander}**. I've loaded ${found.length} cards into your deck.\n\nAsk me anything about the strategy, card choices, or tell me what you'd like to change.`
      setChatHistory([{ role: 'assistant', content: openingMsg }])
      setPhase('chat')
      setTimeout(() => setOrbState('idle'), 1200)
    } catch (err) {
      setOrbState('error')
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setStatusMsg(`Something went wrong: ${msg}`)
      setLastError(msg)
      addToast('Merlin failed to conjure your deck', 'error')
      setTimeout(() => setOrbState('idle'), 2000)
    }
  }

  async function handleSendChat() {
    const msg = chatInput.trim()
    if (!msg || orbState === 'loading') return

    setChatInput('')
    addMessage('user', msg)
    setOrbState('loading')

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: msg }]

    try {
      const deckContext = `Current Deck:\n${buildDeckContext()}`
      const result = await chatWithMerlin(newHistory, deckContext, targetBracket, playgroup.map(c => c.name), fullGuidance)

      addMessage('assistant', result.text)

      if (result.deckUpdate) {
        const { commander: newCmd, cards: newCards } = result.deckUpdate
        setStatusMsg('Updating deck...')
        // Auto-version before applying chat changes
        saveVersion(`Before Merlin chat — Turn ${chatHistory.filter(m => m.role === 'user').length}`)

        const [commanderCard, { found, notFound }] = await Promise.all([
          fetchCardByName(newCmd),
          fetchCardsByNames(newCards.slice(0, 99)),
        ])

        if (commanderCard) {
          const { cards: cleanCards, hadDuplicates: duped } = validateAndCleanDecklist(
            found.map(c => ({ card: c, qty: 1 })),
            commanderCard,
          )
          loadDeckCards(commanderCard, cleanCards)
          addToast(`Deck updated — ${cleanCards.reduce((s, dc) => s + dc.qty, 0)} cards`, 'success')
          if (duped) addToast('Duplicate cards merged automatically', 'warning')
          if (notFound.length > 0) {
            addToast(`${notFound.length} card${notFound.length > 1 ? 's' : ''} not found`, 'warning')
          }
        }
        setStatusMsg('')
      }

      setOrbState('success')
      setTimeout(() => setOrbState('idle'), 800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addMessage('assistant', `*The crystal ball clouds over...* (${msg})`)
      setOrbState('error')
      setTimeout(() => setOrbState('idle'), 2000)
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  function handleReset() {
    setPhase('form')
    setChatHistory([])
    setVibe('')
    setNotes('')
    setOrbState('idle')
    setStatusMsg('')
  }

  if (!wizardOpen) return null

  const modalWidth = phase === 'chat' ? 600 : 480

  const PANEL_STYLE: React.CSSProperties = {
    background: 'rgba(20,14,8,0.97)',
    border: '1px solid rgba(120,95,55,0.5)',
    borderRadius: 4,
    boxShadow: '0 0 60px rgba(0,0,0,0.95), 0 0 20px rgba(140,80,220,0.1)',
    maxWidth: modalWidth,
    width: '90vw',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  }

  return (
    <>
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) setWizardOpen(false) }}
    >
      <div className="stone-bg modal-sheet relative" style={PANEL_STYLE}>
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="rounded-full" style={{ width: 36, height: 4, background: 'rgba(120,95,55,0.4)' }} />
        </div>
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* Header */}
        <div className="flex items-center gap-3 pt-5 pb-4 px-6 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(80,65,40,0.4)' }}>
          <MerlinSprite orbState={orbState} size={1.1} />
          <div className="flex-1">
            <h2 className="font-cinzel-deco text-base tracking-widest" style={{ color: '#c9a060', letterSpacing: 3 }}>
              Merlin
            </h2>
            <div className="flex items-center gap-2">
              <p className="font-body text-label italic" style={{ color: '#6a5e44' }}>
                {phase === 'form' ? 'Describe your vision. The wizard shall forge your deck.' : 'Your arcane deck builder'}
              </p>
              <span
                className="text-micro font-cinzel uppercase tracking-wide px-1.5 py-0.5 rounded-sm flex-shrink-0"
                style={{
                  background: 'rgba(30,22,10,0.6)',
                  border: `1px solid rgba(${bracketRgbStr(targetBracket)}, 0.35)`,
                  color: BRACKET_LABELS[targetBracket].color,
                }}
                title={`Building for Bracket ${targetBracket} — ${BRACKET_LABELS[targetBracket].name}`}
              >
                B{targetBracket} · {BRACKET_LABELS[targetBracket].name}
              </span>
            </div>
          </div>
          {phase === 'chat' && (
            <button
              onClick={handleReset}
              className="text-micro font-cinzel uppercase tracking-widest px-3 py-1.5 transition-colors"
              style={{
                background: 'rgba(20,16,10,0.8)',
                border: '1px solid rgba(60,50,30,0.4)',
                color: '#5a5040',
                borderRadius: 2,
              }}
            >
              New Deck
            </button>
          )}
          <button
            onClick={() => setWizardOpen(false)}
            className="text-heading transition-colors ml-1"
            style={{ color: '#5a5040', lineHeight: 1 }}
            title="Close"
            aria-label="Close Merlin wizard"
          >✕</button>
        </div>

        {/* ── FORM PHASE ── */}
        {phase === 'form' && (
          <>
            {/* Smart greeting */}
            {(greeting || greetingLoading) && (
              <div
                className="flex-shrink-0 mx-5 mt-4 px-3 py-2.5 rounded-sm"
                style={{ background: 'rgba(60,35,90,0.25)', border: '1px solid rgba(120,80,200,0.2)' }}
              >
                {greetingLoading ? (
                  <p className="text-label font-body italic" style={{ color: '#6a5e7a' }}>
                    Merlin stirs…
                  </p>
                ) : (
                  <p className="text-label font-body italic leading-relaxed" style={{ color: '#b0a0d0' }}>
                    {greeting}
                  </p>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b flex-shrink-0 mt-3" style={{ borderColor: 'rgba(60,50,30,0.5)' }}>
              {(['vibe', 'keywords'] as WizardTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 text-label font-cinzel uppercase tracking-widest transition-colors"
                  style={{
                    color: tab === t ? '#c9a060' : '#5a5040',
                    borderBottom: tab === t ? '1px solid #c9a060' : '1px solid transparent',
                    background: tab === t ? 'rgba(180,140,50,0.06)' : 'transparent',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              {tab === 'vibe' && (
                <div>
                  <label className="text-micro font-cinzel tracking-[2px] uppercase block mb-2 text-gold-muted">
                    Describe your deck's vibe
                  </label>
                  <textarea
                    className="text-label"
                    style={{ ...INPUT_STYLE, minHeight: 100 }}
                    placeholder="e.g. spooky aristocrats deck that wins by draining life through sacrifice and reanimating fallen creatures..."
                    value={vibe}
                    onChange={e => setVibe(e.target.value)}
                  />
                </div>
              )}

              {tab === 'keywords' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-micro font-cinzel tracking-[2px] uppercase block mb-1 text-gold-muted">Archetype</label>
                    <select className="text-label" value={archetype} onChange={e => setArchetype(e.target.value as DeckArchetype)} style={SELECT_STYLE}>
                      {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-micro font-cinzel tracking-[2px] uppercase block mb-1 text-gold-muted">Colors</label>
                    <div className="flex gap-2">
                      {COLORS_LIST.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleColor(c)}
                          className="text-label font-cinzel font-bold rounded-sm w-7 h-7 transition-all"
                          style={{
                            background: selectedColors.includes(c) ? '#6a4ab8' : 'rgba(30,24,16,0.8)',
                            color: selectedColors.includes(c) ? '#d0b8ff' : '#5a5040',
                            border: `1px solid ${selectedColors.includes(c) ? 'rgba(160,120,255,0.4)' : 'rgba(60,50,30,0.4)'}`,
                          }}
                        >{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-micro font-cinzel tracking-[2px] uppercase block mb-1 text-gold-muted">Budget</label>
                    <select className="text-label" value={budget} onChange={e => setBudget(e.target.value as DeckBudget)} style={SELECT_STYLE}>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-micro font-cinzel tracking-[2px] uppercase block mb-1 text-gold-muted">Notes (optional)</label>
                    <textarea
                      className="text-label"
                      style={{ ...INPUT_STYLE, minHeight: 50 }}
                      placeholder="Any special requests..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {statusMsg && (
                <div className="mt-3 text-center">
                  <p className="text-label font-body italic" style={{ color: orbState === 'error' ? '#cc4444' : '#8a7a5a' }}>
                    {statusMsg}
                  </p>
                  {orbState === 'error' && lastError && (
                    <button
                      onClick={() => setBugReportOpen(true)}
                      className="mt-1 text-micro font-cinzel uppercase tracking-widest transition-opacity hover:opacity-80"
                      style={{ color: '#5a5040', textDecoration: 'underline', textDecorationColor: 'rgba(90,80,64,0.4)' }}
                    >
                      Report this error →
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 pb-5 flex-shrink-0">
              <button
                onClick={() => setWizardOpen(false)}
                className="flex-1 py-2 text-label font-cinzel uppercase tracking-widest transition-colors"
                style={{
                  background: 'rgba(20,16,10,0.8)',
                  border: '1px solid rgba(60,50,30,0.4)',
                  color: '#5a5040',
                  borderRadius: 2,
                }}
              >
                Dismiss
              </button>
              <button
                onClick={handleForge}
                disabled={orbState === 'loading'}
                className="py-2 px-6 text-label font-cinzel uppercase tracking-widest transition-all"
                style={{
                  flex: 2,
                  background: orbState === 'loading'
                    ? 'rgba(60,40,90,0.5)'
                    : 'linear-gradient(135deg, rgba(80,50,120,0.8), rgba(50,30,80,0.9))',
                  border: '1px solid rgba(160,110,240,0.4)',
                  color: orbState === 'loading' ? '#8a70a0' : '#c8a8f0',
                  borderRadius: 2,
                  opacity: orbState === 'loading' ? 0.7 : 1,
                  cursor: orbState === 'loading' ? 'not-allowed' : 'pointer',
                }}
              >
                {orbState === 'loading' ? 'Conjuring...' : '✦ Forge Deck'}
              </button>
            </div>
          </>
        )}

        {/* ── CHAT PHASE ── */}
        {phase === 'chat' && (
          <>
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
              style={{ minHeight: 280, maxHeight: '55vh' }}
            >
              {chatHistory.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {orbState === 'loading' && (
                <div className="flex items-center gap-2">
                  <MerlinDot />
                  <span className="text-label font-body italic" style={{ color: '#6a5e44' }}>
                    Merlin is pondering...
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(60,50,30,0.4)', flexShrink: 0 }} />

            {/* Pro upsell banner — shown when chat is locked */}
            {chatLocked && (
              <button
                className="flex-shrink-0 mx-4 mb-1 py-2 px-3 rounded-sm text-left transition-opacity hover:opacity-90"
                style={{
                  background: 'rgba(40,28,8,0.85)',
                  border: '1px solid rgba(180,140,50,0.35)',
                }}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('decksmith:pro-required', { detail: { feature: 'merlin_chat' } }),
                  )
                }
              >
                <span className="text-label font-cinzel text-gold">
                  ✦ Refining with Merlin is an Arcane feature —{' '}
                  <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(200,160,60,0.4)' }}>
                    Upgrade to keep the conversation going →
                  </span>
                </span>
              </button>
            )}

            {/* Chat input */}
            <div className="flex gap-2 px-4 py-3 flex-shrink-0">
              <textarea
                ref={inputRef}
                className="text-label"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={orbState === 'loading' || chatLocked}
                rows={2}
                style={{
                  ...INPUT_STYLE,
                  flex: 1,
                  resize: 'none',
                  minHeight: 'unset',
                  opacity: orbState === 'loading' || chatLocked ? 0.4 : 1,
                }}
                placeholder="Ask Merlin about your deck, or request changes... (Enter to send)"
              />
              <button
                onClick={handleSendChat}
                disabled={orbState === 'loading' || !chatInput.trim() || chatLocked}
                className="text-heading"
                style={{
                  background: orbState === 'loading' || !chatInput.trim() || chatLocked
                    ? 'rgba(40,30,60,0.5)'
                    : 'linear-gradient(135deg, rgba(80,50,120,0.9), rgba(50,30,80,0.95))',
                  border: '1px solid rgba(120,80,200,0.4)',
                  color: orbState === 'loading' || !chatInput.trim() || chatLocked ? '#5a4870' : '#c8a8f0',
                  borderRadius: 2,
                  padding: '0 14px',
                  cursor: orbState === 'loading' || !chatInput.trim() || chatLocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                title="Send"
                aria-label="Send message"
              >
                ✦
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {bugReportOpen && (
      <BugReportModal
        errorContext={lastError ?? undefined}
        onClose={() => setBugReportOpen(false)}
      />
    )}
    </>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isMerlin = msg.role === 'assistant'

  // Render **bold** markdown-style
  const parts = msg.content.split(/(\*\*[^*]+\*\*)/)
  const rendered = parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: '#d4b870' }}>{p.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{p}</React.Fragment>
  )

  return (
    <div className={`flex gap-2 ${isMerlin ? '' : 'flex-row-reverse'}`}>
      {isMerlin && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-label"
          style={{ background: 'rgba(80,50,120,0.3)', border: '1px solid rgba(120,80,200,0.3)', marginTop: 2 }}>
          ✦
        </div>
      )}
      <div
        className="font-body text-label leading-relaxed rounded"
        style={{
          maxWidth: '82%',
          padding: '8px 12px',
          background: isMerlin
            ? 'rgba(60,35,90,0.35)'
            : 'rgba(40,32,20,0.6)',
          border: isMerlin
            ? '1px solid rgba(120,80,200,0.2)'
            : '1px solid rgba(80,65,40,0.3)',
          color: isMerlin ? '#c0a8e0' : '#b0a080',
          whiteSpace: 'pre-wrap',
        }}
      >
        {rendered}
      </div>
    </div>
  )
}

function bracketRgbStr(b: number): string {
  switch (b) {
    case 1: return '80,160,80'
    case 2: return '120,170,70'
    case 3: return '200,130,50'
    case 4: return '200,65,65'
    default: return '120,100,60'
  }
}

function MerlinDot() {
  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: '50%',
          background: '#8060b0',
          animation: `orbPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}
