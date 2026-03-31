import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bracket, Card, DeckCard, DeckHistoryEntry, DeckVersion, PlaystyleAnswers, PriceData, SavedDeck } from '../types'
import type { WizardPromptInput } from '../utils/claudeApi'

interface Toast {
  id: string
  message: string
  type: 'success' | 'warning' | 'error'
  action?: { label: string; onClick: () => void }
}

interface DeckStore {
  // Active deck
  commander: Card | null
  cards: DeckCard[]

  // Persistence
  savedDecks: SavedDeck[]
  activeDeckId: string | null
  activeDeckName: string

  // Playgroup
  playgroup: Card[]

  // Playstyle
  playstyle: PlaystyleAnswers | null
  playstyleModalOpen: boolean
  playstyleOnboardingShown: boolean

  // Player profile + history
  playerName: string
  neverSuggestCards: string[]
  deckHistory: DeckHistoryEntry[]
  profileModalOpen: boolean

  // Versions
  deckVersions: Record<string, DeckVersion[]>

  // Prices
  prices: Record<string, PriceData>
  lastPriceFetch: number | null
  pricesFetching: boolean

  // Proxy mode
  proxyMode: boolean
  proxyCardIds: string[]              // card IDs in current deck marked for printing
  proxyPerDeck: Record<string, string[]>  // persisted proxy selections keyed by deck ID
  proxySheetOpen: boolean

  // UI
  toasts: Toast[]
  analyticsOpen: boolean
  wizardOpen: boolean
  targetBracket: Bracket
  wizardPreFill: WizardPromptInput | null
  wizardInitialChat: string | null
  commanderFinderOpen: boolean

  // Commander actions
  setCommander: (card: Card | null) => void

  // Card actions
  addCard: (card: Card) => void
  removeCard: (cardId: string) => void
  incrementCard: (cardId: string) => void
  decrementCard: (cardId: string) => void
  clearDeck: () => void
  loadDeckCards: (commander: Card | null, cards: DeckCard[]) => void

  // Saved deck actions
  saveDeck: (name: string) => void
  loadDeck: (id: string) => void
  deleteSavedDeck: (id: string) => void
  renameDeck: (id: string, name: string) => void

  // Toast actions
  addToast: (message: string, type?: Toast['type'], action?: Toast['action']) => void
  removeToast: (id: string) => void

  // Playgroup actions
  addPlaygroupCommander: (card: Card) => void
  removePlaygroupCommander: (id: string) => void
  clearPlaygroup: () => void

  // Playstyle actions
  setPlaystyle: (answers: PlaystyleAnswers) => void
  setPlaystyleModalOpen: (open: boolean) => void

  // Profile + history actions
  setPlayerName: (name: string) => void
  addToNeverSuggest: (cardName: string) => void
  removeFromNeverSuggest: (cardName: string) => void
  saveToHistory: (entry: DeckHistoryEntry) => void
  loadFromHistory: (entry: DeckHistoryEntry) => void
  setProfileModalOpen: (open: boolean) => void

  // Version actions
  saveVersion: (label?: string) => void
  restoreVersion: (versionId: string) => void
  deleteVersion: (versionId: string) => void

  // Price actions
  setPrices: (prices: Record<string, PriceData>) => void
  setLastPriceFetch: (ts: number) => void
  setPricesFetching: (v: boolean) => void

  // Proxy actions
  toggleProxyMode: () => void
  toggleProxyCard: (cardId: string) => void
  setAllProxy: (cardIds: string[]) => void
  setProxySheetOpen: (open: boolean) => void

  // UI toggles
  setAnalyticsOpen: (open: boolean) => void
  setWizardOpen: (open: boolean) => void
  setTargetBracket: (b: Bracket) => void
  setWizardPreFill: (input: WizardPromptInput | null) => void
  setWizardInitialChat: (msg: string | null) => void
  setCommanderFinderOpen: (open: boolean) => void
}

const BASIC_LANDS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'])

function isBasicLand(card: Card): boolean {
  return BASIC_LANDS.has(card.name) || card.typeLine.toLowerCase().includes('basic land')
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      commander: null,
      cards: [],
      savedDecks: [],
      activeDeckId: null,
      activeDeckName: 'New Deck',
      playgroup: [],
      playstyle: null,
      playstyleModalOpen: false,
      playstyleOnboardingShown: false,
      playerName: '',
      neverSuggestCards: [],
      deckHistory: [],
      profileModalOpen: false,
      deckVersions: {},
      prices: {},
      lastPriceFetch: null,
      pricesFetching: false,
      proxyMode: false,
      proxyCardIds: [],
      proxyPerDeck: {},
      proxySheetOpen: false,
      toasts: [],
      analyticsOpen: true,
      wizardOpen: false,
      targetBracket: 2 as Bracket,
      wizardPreFill: null,
      wizardInitialChat: null,
      commanderFinderOpen: false,

      setCommander: (card) => set({ commander: card }),

      addCard: (card) => {
        const { cards, commander, addToast } = get()

        // Block if card IS the commander slot
        if (card.typeLine.toLowerCase().includes('legendary') &&
            (card.typeLine.toLowerCase().includes('creature') ||
             card.typeLine.toLowerCase().includes('planeswalker')) &&
            !commander) {
          // Let user decide — don't auto-set commander here
        }

        // Color identity check
        if (commander) {
          const commanderColors = new Set(commander.colorIdentity)
          const illegal = card.colorIdentity.some(c => !commanderColors.has(c))
          if (illegal) {
            addToast(`${card.name} is outside your commander's color identity`, 'warning')
            return
          }
        }

        const existing = cards.find(dc => dc.card.id === card.id)
        const isBasic = isBasicLand(card)

        if (existing) {
          if (!isBasic && existing.qty >= 1) {
            addToast(`${card.name} is already in your deck (singleton)`, 'warning')
            return
          }
          if (cards.reduce((s, dc) => s + dc.qty, 0) >= 99) {
            addToast('Deck is full (99 cards)', 'warning')
            return
          }
          set({ cards: cards.map(dc => dc.card.id === card.id ? { ...dc, qty: dc.qty + 1 } : dc) })
        } else {
          if (cards.reduce((s, dc) => s + dc.qty, 0) >= 99) {
            addToast('Deck is full (99 cards)', 'warning')
            return
          }
          set({ cards: [...cards, { card, qty: 1 }] })
        }
        addToast(`${card.name} added`, 'success')
      },

      removeCard: (cardId) => {
        set({ cards: get().cards.filter(dc => dc.card.id !== cardId) })
      },

      incrementCard: (cardId) => {
        const { cards, addToast } = get()
        const dc = cards.find(dc => dc.card.id === cardId)
        if (!dc) return
        if (!isBasicLand(dc.card)) {
          addToast(`${dc.card.name} is singleton`, 'warning')
          return
        }
        if (cards.reduce((s, dc) => s + dc.qty, 0) >= 99) {
          addToast('Deck is full (99 cards)', 'warning')
          return
        }
        set({ cards: cards.map(dc => dc.card.id === cardId ? { ...dc, qty: dc.qty + 1 } : dc) })
      },

      decrementCard: (cardId) => {
        const { cards } = get()
        const dc = cards.find(dc => dc.card.id === cardId)
        if (!dc) return
        if (dc.qty <= 1) {
          set({ cards: cards.filter(dc => dc.card.id !== cardId) })
        } else {
          set({ cards: cards.map(dc => dc.card.id === cardId ? { ...dc, qty: dc.qty - 1 } : dc) })
        }
      },

      clearDeck: () => set({ commander: null, cards: [] }),

      loadDeckCards: (commander, cards) => set({ commander, cards }),

      saveDeck: (name) => {
        const { commander, cards, savedDecks, activeDeckId } = get()
        const id = activeDeckId ?? `deck-${Date.now()}`
        const deck: SavedDeck = { id, name, commander, cards, savedAt: Date.now() }
        const existing = savedDecks.find(d => d.id === id)
        if (existing) {
          set({ savedDecks: savedDecks.map(d => d.id === id ? deck : d), activeDeckId: id, activeDeckName: name })
        } else {
          if (savedDecks.length >= 10) {
            get().addToast('Maximum 10 saved decks reached', 'warning')
            return
          }
          set({ savedDecks: [...savedDecks, deck], activeDeckId: id, activeDeckName: name })
        }
        get().addToast(`Deck "${name}" saved`, 'success')
      },

      loadDeck: (id) => {
        const { savedDecks, proxyPerDeck, proxyCardIds, activeDeckId } = get()
        const deck = savedDecks.find(d => d.id === id)
        if (!deck) return
        // Save current proxy state before switching decks
        const updatedProxyPerDeck = activeDeckId
          ? { ...proxyPerDeck, [activeDeckId]: proxyCardIds }
          : proxyPerDeck
        set({
          commander: deck.commander, cards: deck.cards,
          activeDeckId: deck.id, activeDeckName: deck.name,
          proxyCardIds: updatedProxyPerDeck[deck.id] ?? [],
          proxyPerDeck: updatedProxyPerDeck,
        })
      },

      deleteSavedDeck: (id) => {
        set({ savedDecks: get().savedDecks.filter(d => d.id !== id) })
      },

      renameDeck: (id, name) => {
        set({ savedDecks: get().savedDecks.map(d => d.id === id ? { ...d, name } : d) })
        if (get().activeDeckId === id) set({ activeDeckName: name })
      },

      addToast: (message, type = 'success', action) => {
        const id = `toast-${Date.now()}-${Math.random()}`
        set({ toasts: [...get().toasts, { id, message, type, action }] })
        setTimeout(() => get().removeToast(id), action ? 6000 : 3000)
      },

      removeToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),

      addPlaygroupCommander: (card) => {
        const { playgroup, addToast } = get()
        if (playgroup.length >= 5) { addToast('Maximum 5 playgroup commanders', 'warning'); return }
        if (playgroup.some(c => c.id === card.id)) { addToast(`${card.name} is already in your pod`, 'warning'); return }
        set({ playgroup: [...playgroup, card] })
      },

      removePlaygroupCommander: (id) => set({ playgroup: get().playgroup.filter(c => c.id !== id) }),

      clearPlaygroup: () => set({ playgroup: [] }),

      setPlaystyle: (answers) => set({ playstyle: answers, playstyleOnboardingShown: true, playstyleModalOpen: false }),
      setPlaystyleModalOpen: (open) => set({ playstyleModalOpen: open, playstyleOnboardingShown: true }),

      setPlayerName: (name) => set({ playerName: name }),
      addToNeverSuggest: (cardName) => set(s => ({
        neverSuggestCards: s.neverSuggestCards.includes(cardName)
          ? s.neverSuggestCards
          : [...s.neverSuggestCards, cardName],
      })),
      removeFromNeverSuggest: (cardName) => set(s => ({
        neverSuggestCards: s.neverSuggestCards.filter(n => n !== cardName),
      })),
      saveToHistory: (entry) => set(s => {
        const updated = [entry, ...s.deckHistory.filter(e => e.id !== entry.id)]
        return { deckHistory: updated.slice(0, 20) }
      }),
      loadFromHistory: (entry) => set({
        commander: entry.commander,
        cards: entry.cards,
        activeDeckName: entry.name,
        activeDeckId: null,
        proxyCardIds: [],
      }),
      setProfileModalOpen: (open) => set({ profileModalOpen: open }),

      saveVersion: (label) => {
        const { activeDeckId, cards, commander, targetBracket, prices, deckVersions } = get()
        const key = activeDeckId ?? '__unsaved__'
        const existing = deckVersions[key] ?? []
        const count = existing.length + 1
        const autoLabel = label?.trim() ||
          `Version ${count} — ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        const deckValue = cards.reduce((s, dc) => {
          const pd = prices[dc.card.name.toLowerCase()]
          const v = pd ? (parseFloat(pd.usd ?? '0') || 0) : (dc.card.priceUsd ?? 0)
          return s + v * dc.qty
        }, 0) + (commander?.priceUsd ?? 0)
        const version: DeckVersion = {
          id: `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          label: autoLabel,
          cards: JSON.parse(JSON.stringify(cards)) as typeof cards,
          commander: commander ? { ...commander } : null,
          savedAt: Date.now(),
          bracket: targetBracket,
          cardCount: cards.reduce((s, dc) => s + dc.qty, 0),
          deckValue,
        }
        const updated = [version, ...existing].slice(0, 10)
        set({ deckVersions: { ...deckVersions, [key]: updated } })
      },

      restoreVersion: (versionId) => {
        const { activeDeckId, deckVersions } = get()
        const key = activeDeckId ?? '__unsaved__'
        const versions = deckVersions[key] ?? []
        const target = versions.find(v => v.id === versionId)
        if (!target) return
        set({ cards: target.cards, commander: target.commander, targetBracket: target.bracket })
      },

      deleteVersion: (versionId) => {
        const { activeDeckId, deckVersions } = get()
        const key = activeDeckId ?? '__unsaved__'
        const versions = deckVersions[key] ?? []
        set({ deckVersions: { ...deckVersions, [key]: versions.filter(v => v.id !== versionId) } })
      },

      setPrices: (prices) => set(s => ({ prices: { ...s.prices, ...prices } })),
      setLastPriceFetch: (ts) => set({ lastPriceFetch: ts }),
      setPricesFetching: (v) => set({ pricesFetching: v }),

      toggleProxyMode: () => set(s => ({ proxyMode: !s.proxyMode })),
      toggleProxyCard: (cardId) => set(s => ({
        proxyCardIds: s.proxyCardIds.includes(cardId)
          ? s.proxyCardIds.filter(id => id !== cardId)
          : [...s.proxyCardIds, cardId],
      })),
      setAllProxy: (cardIds) => set({ proxyCardIds: cardIds }),
      setProxySheetOpen: (open) => set({ proxySheetOpen: open }),

      setAnalyticsOpen: (open) => set({ analyticsOpen: open }),
      setWizardOpen: (open) => set({ wizardOpen: open }),
      setTargetBracket: (b) => set({ targetBracket: b }),
      setWizardPreFill: (input) => set({ wizardPreFill: input }),
      setWizardInitialChat: (msg) => set({ wizardInitialChat: msg }),
      setCommanderFinderOpen: (open) => set({ commanderFinderOpen: open }),
    }),
    {
      name: 'decksmith_saved',
      partialize: (state) => ({
        savedDecks: state.savedDecks,
        commander: state.commander,
        cards: state.cards,
        activeDeckId: state.activeDeckId,
        activeDeckName: state.activeDeckName,
        targetBracket: state.targetBracket,
        playgroup: state.playgroup,
        playstyle: state.playstyle,
        playstyleOnboardingShown: state.playstyleOnboardingShown,
        proxyPerDeck: state.proxyPerDeck,
        playerName: state.playerName,
        neverSuggestCards: state.neverSuggestCards,
        deckHistory: state.deckHistory,
        deckVersions: state.deckVersions,
        prices: state.prices,
        lastPriceFetch: state.lastPriceFetch,
      }),
    }
  )
)
