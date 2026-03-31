import type { Card, ScryfallCard } from '../types'

export function scryfallToCard(sc: ScryfallCard): Card {
  const imageUri =
    sc.image_uris?.normal ??
    sc.card_faces?.[0]?.image_uris?.normal ??
    ''

  return {
    id: sc.id,
    name: sc.name,
    manaCost: sc.mana_cost ?? sc.card_faces?.[0]?.mana_cost ?? '',
    cmc: sc.cmc,
    typeLine: sc.type_line ?? sc.card_faces?.[0]?.type_line ?? '',
    colorIdentity: sc.color_identity,
    imageUri,
    set: sc.set,
    rarity: sc.rarity,
    oracleText: sc.oracle_text ?? '',
    priceUsd: sc.prices?.usd ? parseFloat(sc.prices.usd) : undefined,
  }
}

export function isCommanderLegal(card: Card): boolean {
  const tl = card.typeLine.toLowerCase()
  return (
    (tl.includes('legendary') && tl.includes('creature')) ||
    (tl.includes('legendary') && tl.includes('planeswalker')) ||
    card.oracleText.toLowerCase().includes('can be your commander')
  )
}

export function colorIdentityLegal(card: Card, commander: Card): boolean {
  if (card.colorIdentity.length === 0) return true
  const commanderSet = new Set(commander.colorIdentity)
  return card.colorIdentity.every(c => commanderSet.has(c))
}

export function buildScryfallQuery(
  term: string,
  filters: {
    colors: string[]
    cardType: string
    cmcMin: number
    cmcMax: number
    keyword: string
    commanderLegal: boolean
  }
): string {
  const parts: string[] = []

  if (term.trim()) parts.push(term.trim())
  if (filters.commanderLegal) parts.push('legal:commander')
  if (filters.colors.length > 0) parts.push(`id<=${filters.colors.join('')}`)
  if (filters.cardType) parts.push(`t:${filters.cardType}`)
  if (filters.cmcMin > 0) parts.push(`cmc>=${filters.cmcMin}`)
  if (filters.cmcMax < 16) parts.push(`cmc<=${filters.cmcMax}`)
  if (filters.keyword) parts.push(`o:"${filters.keyword}"`)

  return parts.join('+')
}
