import LZString from 'lz-string'
import type { Card, DeckCard, Bracket } from '../types'

// ── Shared deck encode/decode ─────────────────────────────────────────────

interface SharedDeckWire {
  n: string          // deck name
  c: string          // commander name (empty string if none)
  b: number          // bracket
  cards: Array<{ n: string; q: number }>
}

export function encodeDeck(
  deckName: string,
  commander: Card | null,
  cards: DeckCard[],
  bracket: Bracket,
): string {
  const wire: SharedDeckWire = {
    n: deckName || 'Unnamed Deck',
    c: commander?.name ?? '',
    b: bracket,
    cards: cards.map(dc => ({ n: dc.card.name, q: dc.qty })),
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(wire))
}

export function decodeDeck(compressed: string): SharedDeckWire | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    if (!json) return null
    const wire = JSON.parse(json) as SharedDeckWire
    if (!wire || !Array.isArray(wire.cards)) return null
    return wire
  } catch {
    return null
  }
}

export type { SharedDeckWire }

export function exportDeck(commander: Card | null, cards: DeckCard[]): string {
  const lines: string[] = []

  if (commander) {
    lines.push('// Commander')
    lines.push(`1 ${commander.name}`)
    lines.push('')
  }

  const sections: Record<string, DeckCard[]> = {
    Creatures: [], Instants: [], Sorceries: [],
    Enchantments: [], Artifacts: [], Planeswalkers: [], Lands: [], Other: [],
  }

  for (const dc of cards) {
    const tl = dc.card.typeLine.toLowerCase()
    if (tl.includes('creature')) sections.Creatures.push(dc)
    else if (tl.includes('instant')) sections.Instants.push(dc)
    else if (tl.includes('sorcery')) sections.Sorceries.push(dc)
    else if (tl.includes('enchantment')) sections.Enchantments.push(dc)
    else if (tl.includes('artifact')) sections.Artifacts.push(dc)
    else if (tl.includes('planeswalker')) sections.Planeswalkers.push(dc)
    else if (tl.includes('land')) sections.Lands.push(dc)
    else sections.Other.push(dc)
  }

  for (const [section, dcs] of Object.entries(sections)) {
    if (dcs.length === 0) continue
    lines.push(`// ${section}`)
    for (const dc of dcs) {
      lines.push(`${dc.qty} ${dc.card.name}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ── Export format functions ───────────────────────────────────────────────

function bucketByType(cards: DeckCard[]): Record<string, DeckCard[]> {
  const buckets: Record<string, DeckCard[]> = {
    Creatures: [], Instants: [], Sorceries: [],
    Enchantments: [], Artifacts: [], Planeswalkers: [], Lands: [], Other: [],
  }
  for (const dc of cards) {
    const tl = dc.card.typeLine.toLowerCase()
    if (tl.includes('creature')) buckets.Creatures.push(dc)
    else if (tl.includes('instant')) buckets.Instants.push(dc)
    else if (tl.includes('sorcery')) buckets.Sorceries.push(dc)
    else if (tl.includes('enchantment')) buckets.Enchantments.push(dc)
    else if (tl.includes('artifact')) buckets.Artifacts.push(dc)
    else if (tl.includes('planeswalker')) buckets.Planeswalkers.push(dc)
    else if (tl.includes('land')) buckets.Lands.push(dc)
    else buckets.Other.push(dc)
  }
  return buckets
}

/** Moxfield: Commander: Name\n1 CardName */
export function exportMoxfield(commander: Card | null, cards: DeckCard[]): string {
  const lines: string[] = []
  if (commander) lines.push(`Commander: ${commander.name}`)
  for (const dc of cards) lines.push(`${dc.qty} ${dc.card.name}`)
  return lines.join('\n').trim()
}

/** MTGO: 1 CardName (no commander line) */
export function exportMTGO(_commander: Card | null, cards: DeckCard[]): string {
  return cards.map(dc => `${dc.qty} ${dc.card.name}`).join('\n')
}

/** Arena: 1 CardName (SET) — no collector number since it isn't stored */
export function exportArena(commander: Card | null, cards: DeckCard[]): string {
  const lines: string[] = []
  if (commander) {
    const set = commander.set?.toUpperCase()
    lines.push(set ? `1 ${commander.name} (${set})` : `1 ${commander.name}`)
  }
  for (const dc of cards) {
    const set = dc.card.set?.toUpperCase()
    lines.push(set ? `${dc.qty} ${dc.card.name} (${set})` : `${dc.qty} ${dc.card.name}`)
  }
  return lines.join('\n').trim()
}

/** Plain text: Qty x CardName grouped by type */
export function exportPlainText(commander: Card | null, cards: DeckCard[]): string {
  const lines: string[] = []
  if (commander) {
    lines.push('=== Commander ===')
    lines.push(`1x ${commander.name}`)
    lines.push('')
  }
  const buckets = bucketByType(cards)
  for (const [section, dcs] of Object.entries(buckets)) {
    if (dcs.length === 0) continue
    lines.push(`=== ${section} (${dcs.reduce((s, dc) => s + dc.qty, 0)}) ===`)
    for (const dc of dcs) lines.push(`${dc.qty}x ${dc.card.name}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

// ── Import ────────────────────────────────────────────────────────────────

// Returns array of card names parsed from a pasted decklist
export function parseImportText(text: string): string[] {
  const names: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('//')) continue
    // Match "1 Card Name" or "1x Card Name" or just "Card Name"
    const match = line.match(/^(?:\d+x?\s+)?(.+)$/)
    if (match) {
      const name = match[1].trim()
      if (name) names.push(name)
    }
  }
  return [...new Set(names)] // deduplicate
}
