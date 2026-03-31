import type { Card, DeckCard, PriceData } from '../types'

const CACHE_KEY = 'price_cache'
const CACHE_TTL = 30 * 60 * 1000  // 30 minutes

// ── Cache I/O ─────────────────────────────────────────────────────────────

function loadCache(): Record<string, PriceData> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PriceData>) : {}
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, PriceData>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable — skip silently
  }
}

export function getCachedPrice(cardName: string): PriceData | null {
  const cache = loadCache()
  const entry = cache[cardName.toLowerCase()]
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return null
  return entry
}

export function setCachedPrice(cardName: string, price: PriceData): void {
  const cache = loadCache()
  cache[cardName.toLowerCase()] = price
  saveCache(cache)
}

// ── Formatters ────────────────────────────────────────────────────────────

export function formatPrice(data: PriceData | number | null | undefined): string {
  if (data == null) return '—'
  if (typeof data === 'number') {
    return data < 10 ? `$${data.toFixed(2)}` : `$${data.toFixed(0)}`
  }
  const val = data.usd ?? data.usdFoil
  if (!val) return '—'
  const n = parseFloat(val)
  return n < 10 ? `$${n.toFixed(2)}` : `$${n.toFixed(0)}`
}

export function getPriceValue(data: PriceData | number | null | undefined): number | null {
  if (data == null) return null
  if (typeof data === 'number') return data
  const val = data.usd ?? data.usdFoil
  return val ? parseFloat(val) : null
}

export function priceDisplayColor(value: number): string {
  if (value < 1) return '#5a9a5a'   // green  — bulk
  if (value < 10) return '#7a7a7a'  // muted  — modest
  if (value < 30) return '#b08830'  // amber  — pricey
  return '#aa4040'                   // red    — expensive
}

export function tcgPlayerUrl(name: string): string {
  return `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(name)}&view=grid`
}

// ── Scryfall batch fetch ──────────────────────────────────────────────────

const SCRYFALL_COLLECTION = 'https://api.scryfall.com/cards/collection'
const BATCH_SIZE = 75

export async function fetchCardPrices(
  cardNames: string[],
  force = false,
): Promise<Record<string, PriceData>> {
  const result: Record<string, PriceData> = {}
  const toFetch: string[] = []

  for (const name of cardNames) {
    const cached = force ? null : getCachedPrice(name)
    if (cached) {
      result[name.toLowerCase()] = cached
    } else {
      toFetch.push(name)
    }
  }

  if (toFetch.length === 0) return result

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)
    try {
      const res = await fetch(SCRYFALL_COLLECTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: batch.map(name => ({ name })) }),
      })
      if (!res.ok) continue

      const data = await res.json() as {
        data: Array<{ name: string; prices?: { usd?: string | null; usd_foil?: string | null } }>
        not_found?: Array<{ name?: string }>
      }

      for (const card of data.data) {
        const priceData: PriceData = {
          usd: card.prices?.usd ?? null,
          usdFoil: card.prices?.usd_foil ?? null,
          fetchedAt: Date.now(),
        }
        const key = card.name.toLowerCase()
        result[key] = priceData
        setCachedPrice(card.name, priceData)
      }

      // Cache not-found as null sentinel to avoid re-fetching
      for (const nf of (data.not_found ?? [])) {
        if (nf.name) {
          const sentinel: PriceData = { usd: null, usdFoil: null, fetchedAt: Date.now() }
          setCachedPrice(nf.name, sentinel)
        }
      }

      if (i + BATCH_SIZE < toFetch.length) {
        await new Promise(r => setTimeout(r, 150))
      }
    } catch {
      // Network error — skip batch silently
    }
  }

  return result
}

// ── Deck total ────────────────────────────────────────────────────────────

export function getDeckTotal(
  cards: DeckCard[],
  prices: Record<string, PriceData>,
  commander?: Card | null,
): { total: number; priced: number; hasUnknown: boolean } {
  let total = 0
  let priced = 0
  let hasUnknown = false

  const allItems: Array<{ name: string; qty: number; fallback?: number }> = [
    ...cards.map(dc => ({ name: dc.card.name, qty: dc.qty, fallback: dc.card.priceUsd })),
    ...(commander ? [{ name: commander.name, qty: 1, fallback: commander.priceUsd }] : []),
  ]

  for (const item of allItems) {
    const priceData = prices[item.name.toLowerCase()]
    const value = priceData ? getPriceValue(priceData) : (item.fallback ?? null)
    if (value != null) {
      total += value * item.qty
      priced++
    } else {
      hasUnknown = true
    }
  }

  return { total, priced, hasUnknown }
}
