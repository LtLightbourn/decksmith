import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import type { ScryfallCard, SearchFilters } from '../types'
import { scryfallToCard, buildScryfallQuery } from '../utils/colorIdentity'

const BASE = '/api/scryfall'

// Fetch a single card by exact name
export async function fetchCardByName(name: string) {
  const res = await fetch(`${BASE}/named?exact=${encodeURIComponent(name)}`)
  if (!res.ok) return null
  const sc = await res.json() as ScryfallCard
  return scryfallToCard(sc)
}

// Batch fetch many cards by name (for import)
export async function fetchCardsByNames(names: string[]): Promise<{ found: ReturnType<typeof scryfallToCard>[], notFound: string[] }> {
  const found: ReturnType<typeof scryfallToCard>[] = []
  const notFound: string[] = []

  // Scryfall has no batch endpoint for named — run in parallel with rate limiting
  const chunks = []
  for (let i = 0; i < names.length; i += 10) chunks.push(names.slice(i, i + 10))

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (name) => {
        const card = await fetchCardByName(name)
        if (card) found.push(card)
        else notFound.push(name)
      })
    )
    // Respect Scryfall rate limit (10 req/s)
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 120))
    }
  }

  return { found, notFound }
}

// Fetch staple suggestions for a color identity
export async function fetchStaples(colorIdentity: string[]): Promise<ReturnType<typeof scryfallToCard>[]> {
  const colors = colorIdentity.join('')
  const query = `id<=${colors || 'C'}+legal:commander+(o:draw+or+o:tutor+or+ramp)+not:extra`
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&order=edhrec&page=1`)
  if (!res.ok) return []
  const data = await res.json() as { data: ScryfallCard[] }
  return data.data.slice(0, 5).map(scryfallToCard)
}

// Debounced search hook
export function useScryfallSearch(term: string, filters: SearchFilters) {
  const [debouncedTerm, setDebouncedTerm] = useState(term)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), 300)
    return () => clearTimeout(id)
  }, [term])

  const query = buildScryfallQuery(debouncedTerm, filters)
  const enabled = query.trim().length >= 2

  return useQuery({
    queryKey: ['scryfall-search', query],
    queryFn: async () => {
      const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&order=name`)
      if (res.status === 404) return []
      if (!res.ok) throw new Error(`Scryfall error ${res.status}`)
      const data = await res.json() as { data: ScryfallCard[] }
      return data.data.map(scryfallToCard)
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  })
}
