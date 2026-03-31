import type { Card, DeckCard } from '../types'

// ── Fisher-Yates shuffle ───────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Expand DeckCard[] into a flat Card[] (respecting qty) ─────────────────

export function expandLibrary(cards: DeckCard[], commander: Card | null = null): Card[] {
  const lib: Card[] = []
  for (const dc of cards) {
    for (let i = 0; i < dc.qty; i++) lib.push(dc.card)
  }
  // Commander lives in command zone — not in library
  return lib
}

// ── Deal a shuffled opening hand ──────────────────────────────────────────

export function dealOpeningHand(library: Card[], size = 7): { hand: Card[]; rest: Card[] } {
  const shuffled = shuffle(library)
  return { hand: shuffled.slice(0, size), rest: shuffled.slice(size) }
}

// ── Identify ramp cards by oracle text heuristics ─────────────────────────

function isRamp(c: Card): boolean {
  const text = c.oracleText.toLowerCase()
  const type = c.typeLine.toLowerCase()
  if (type.includes('land')) return false
  // Mana rocks / dorks that tap for mana
  if (text.includes('{t}: add')) return true
  // Land-fetch spells (Rampant Growth, Cultivate, etc.)
  if (text.includes('search your library') && text.includes('land card')) return true
  return false
}

// ── Opening hand stats (100 simulated games) ──────────────────────────────

export interface OpeningHandStats {
  avgLands: number
  prob2Lands: number   // 0–1
  prob3Lands: number
  prob4Lands: number
  cardFrequency: Array<{ name: string; imageUri: string; frequency: number }>
}

export function simulateOpeningHands(
  cards: DeckCard[],
  sims = 100,
): OpeningHandStats {
  const library = expandLibrary(cards)
  if (library.length === 0) {
    return { avgLands: 0, prob2Lands: 0, prob3Lands: 0, prob4Lands: 0, cardFrequency: [] }
  }

  const handSize = Math.min(7, library.length)
  let totalLands = 0
  let n2 = 0, n3 = 0, n4 = 0
  const counts: Record<string, number> = {}

  for (let s = 0; s < sims; s++) {
    const hand = shuffle(library).slice(0, handSize)
    const lands = hand.filter(c => c.typeLine.toLowerCase().includes('land')).length
    totalLands += lands
    if (lands >= 2) n2++
    if (lands >= 3) n3++
    if (lands >= 4) n4++
    for (const c of hand) counts[c.name] = (counts[c.name] ?? 0) + 1
  }

  const imageMap: Record<string, string> = {}
  for (const dc of cards) imageMap[dc.card.name] = dc.card.imageUri

  const cardFrequency = Object.entries(counts)
    .map(([name, count]) => ({ name, imageUri: imageMap[name] ?? '', frequency: count / sims }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 12)

  return {
    avgLands: totalLands / sims,
    prob2Lands: n2 / sims,
    prob3Lands: n3 / sims,
    prob4Lands: n4 / sims,
    cardFrequency,
  }
}

// ── Mana curve simulation (average mana available by turn) ────────────────

export interface ManaByTurn {
  turn: number
  avgMana: number
}

export function simulateManaByTurn(
  cards: DeckCard[],
  turns = 8,
  sims = 100,
): ManaByTurn[] {
  const library = expandLibrary(cards)
  if (library.length === 0) return Array.from({ length: turns }, (_, i) => ({ turn: i + 1, avgMana: 0 }))

  const totals = Array<number>(turns).fill(0)

  for (let s = 0; s < sims; s++) {
    const deck = shuffle(library)
    const inHand = deck.slice(0, 7)
    const drawPile = deck.slice(7)

    let landsInPlay = 0
    let rampMana = 0
    const usedIndices = new Set<number>()

    for (let t = 0; t < turns; t++) {
      // Draw a card on turns 2+
      if (t > 0 && drawPile.length > t - 1) {
        inHand.push(drawPile[t - 1])
      }

      // Play best land available
      const landIdx = inHand.findIndex((c, i) => !usedIndices.has(i) && c.typeLine.toLowerCase().includes('land'))
      if (landIdx >= 0) {
        usedIndices.add(landIdx)
        landsInPlay++
      }

      // Play ramp if affordable
      const available = landsInPlay + rampMana
      const rampIdx = inHand.findIndex(
        (c, i) => !usedIndices.has(i) && isRamp(c) && c.cmc <= available,
      )
      if (rampIdx >= 0) {
        usedIndices.add(rampIdx)
        rampMana++
      }

      totals[t] += landsInPlay + rampMana
    }
  }

  return totals.map((sum, i) => ({ turn: i + 1, avgMana: sum / sims }))
}
