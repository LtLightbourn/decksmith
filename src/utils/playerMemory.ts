import type { DeckHistoryEntry, PlayerMemory } from '../types'

export function buildPlayerMemory(
  history: DeckHistoryEntry[],
  neverSuggestCards: string[],
): PlayerMemory {
  // Favorite colors from commander color identities
  const colorCount: Record<string, number> = {}
  for (const deck of history) {
    for (const c of (deck.commander?.colorIdentity ?? [])) {
      colorCount[c] = (colorCount[c] ?? 0) + 1
    }
  }
  const favoriteColors = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c)

  // Common cards: appearing in 3+ distinct decks
  const cardCount: Record<string, number> = {}
  for (const deck of history) {
    const seen = new Set<string>()
    for (const dc of deck.cards) {
      if (!seen.has(dc.card.name)) {
        seen.add(dc.card.name)
        cardCount[dc.card.name] = (cardCount[dc.card.name] ?? 0) + 1
      }
    }
  }
  const commonCards = Object.entries(cardCount)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  // Recent commanders — last 5, newest first
  const recentCommanders = [...history]
    .reverse()
    .slice(0, 5)
    .filter(d => d.commander)
    .map(d => d.commander!.name)

  // Preferred strategies from accumulated deck themes
  const themeCount: Record<string, number> = {}
  for (const deck of history) {
    for (const theme of (deck.themes ?? [])) {
      themeCount[theme] = (themeCount[theme] ?? 0) + 1
    }
  }
  const preferredStrategies = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)

  return {
    totalDecks: history.length,
    favoriteColors,
    commonCards,
    neverSuggest: neverSuggestCards,
    recentCommanders,
    preferredStrategies,
  }
}

export function memoryGuidance(
  playerName: string,
  memory: PlayerMemory,
): string {
  if (memory.totalDecks === 0 && memory.neverSuggest.length === 0) return ''

  const parts: string[] = []

  if (memory.totalDecks > 0) {
    const nameStr = playerName ? `${playerName} has` : 'This player has'
    parts.push(
      `PLAYER MEMORY — ${nameStr} built ${memory.totalDecks} deck${memory.totalDecks !== 1 ? 's' : ''}.`
    )
    if (memory.favoriteColors.length > 0) {
      parts.push(`Favorite colors: ${memory.favoriteColors.join(', ')}.`)
    }
    if (memory.commonCards.length > 0) {
      parts.push(
        `Cards they always include: ${memory.commonCards.join(', ')} — include these where they fit the strategy.`
      )
    }
    if (memory.recentCommanders.length > 0) {
      parts.push(`Recent commanders: ${memory.recentCommanders.join(', ')}.`)
    }
    if (memory.preferredStrategies.length > 0) {
      parts.push(`Preferred themes: ${memory.preferredStrategies.join(', ')}.`)
    }
  }

  if (memory.neverSuggest.length > 0) {
    parts.push(
      `NEVER suggest these cards under any circumstances: ${memory.neverSuggest.join(', ')}.`
    )
  }

  return parts.join('\n')
}

export function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 30)  return `${days} days ago`
  return new Date(ts).toLocaleDateString()
}
