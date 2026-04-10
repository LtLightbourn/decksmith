import type { Card, DeckCard, ColorAuditEntry, ManaBaseAudit } from '../types'

// ── Basic land constants ──────────────────────────────────────────────────

const BASIC_LAND_BY_COLOR: Record<string, string> = {
  W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
}

// ── Common Commander land → color production lookup ───────────────────────
// Key: card name, Value: colors it can produce

const LAND_COLORS: Record<string, string[]> = {
  // Fetch lands
  'Flooded Strand':        ['W', 'U'],
  'Polluted Delta':        ['U', 'B'],
  'Bloodstained Mire':     ['B', 'R'],
  'Wooded Foothills':      ['R', 'G'],
  'Windswept Heath':       ['G', 'W'],
  'Marsh Flats':           ['W', 'B'],
  'Scalding Tarn':         ['U', 'R'],
  'Verdant Catacombs':     ['B', 'G'],
  'Arid Mesa':             ['W', 'R'],
  'Misty Rainforest':      ['U', 'G'],
  // Shock lands
  'Hallowed Fountain':     ['W', 'U'],
  'Watery Grave':          ['U', 'B'],
  'Blood Crypt':           ['B', 'R'],
  'Stomping Ground':       ['R', 'G'],
  'Temple Garden':         ['G', 'W'],
  'Godless Shrine':        ['W', 'B'],
  'Steam Vents':           ['U', 'R'],
  'Overgrown Tomb':        ['B', 'G'],
  'Sacred Foundry':        ['W', 'R'],
  'Breeding Pool':         ['U', 'G'],
  // Check lands
  'Glacial Fortress':      ['W', 'U'],
  'Drowned Catacomb':      ['U', 'B'],
  'Dragonskull Summit':    ['B', 'R'],
  'Rootbound Crag':        ['R', 'G'],
  'Sunpetal Grove':        ['G', 'W'],
  'Isolated Chapel':       ['W', 'B'],
  'Sulfur Falls':          ['U', 'R'],
  'Woodland Cemetery':     ['B', 'G'],
  'Clifftop Retreat':      ['W', 'R'],
  'Hinterland Harbor':     ['U', 'G'],
  // Original dual lands
  'Tundra':                ['W', 'U'],
  'Underground Sea':       ['U', 'B'],
  'Badlands':              ['B', 'R'],
  'Taiga':                 ['R', 'G'],
  'Savanna':               ['G', 'W'],
  'Scrubland':             ['W', 'B'],
  'Volcanic Island':       ['U', 'R'],
  'Bayou':                 ['B', 'G'],
  'Plateau':               ['W', 'R'],
  'Tropical Island':       ['U', 'G'],
  // Temple scry lands
  'Temple of Enlightenment': ['W', 'U'],
  'Temple of Deceit':        ['U', 'B'],
  'Temple of Malice':        ['B', 'R'],
  'Temple of Abandon':       ['R', 'G'],
  'Temple of Plenty':        ['G', 'W'],
  'Temple of Silence':       ['W', 'B'],
  'Temple of Epiphany':      ['U', 'R'],
  'Temple of Malady':        ['B', 'G'],
  'Temple of Triumph':       ['W', 'R'],
  'Temple of Mystery':       ['U', 'G'],
  // Guildgates
  'Azorius Guildgate':     ['W', 'U'],
  'Dimir Guildgate':       ['U', 'B'],
  'Rakdos Guildgate':      ['B', 'R'],
  'Gruul Guildgate':       ['R', 'G'],
  'Selesnya Guildgate':    ['G', 'W'],
  'Orzhov Guildgate':      ['W', 'B'],
  'Izzet Guildgate':       ['U', 'R'],
  'Golgari Guildgate':     ['B', 'G'],
  'Boros Guildgate':       ['W', 'R'],
  'Simic Guildgate':       ['U', 'G'],
  // Pain lands
  'Adarkar Wastes':        ['W', 'U'],
  'Underground River':     ['U', 'B'],
  'Sulfurous Springs':     ['B', 'R'],
  'Karplusan Forest':      ['R', 'G'],
  'Brushland':             ['G', 'W'],
  'Caves of Koilos':       ['W', 'B'],
  'Shivan Reef':           ['U', 'R'],
  'Llanowar Wastes':       ['B', 'G'],
  'Battlefield Forge':     ['W', 'R'],
  'Yavimaya Coast':        ['U', 'G'],
  // Reveal/battle lands
  'Canopy Vista':          ['G', 'W'],
  'Sunken Hollow':         ['U', 'B'],
  'Prairie Stream':        ['W', 'U'],
  'Smoldering Marsh':      ['B', 'R'],
  'Cinder Glade':          ['R', 'G'],
  'Scattered Groves':      ['G', 'W'],
  'Irrigated Farmland':    ['W', 'U'],
  'Fetid Pools':           ['U', 'B'],
  'Canyon Slough':         ['B', 'R'],
  'Sheltered Thicket':     ['R', 'G'],
  // Tri-color shard lands
  'Arcane Sanctum':        ['W', 'U', 'B'],
  'Crumbling Necropolis':  ['U', 'B', 'R'],
  'Savage Lands':          ['B', 'R', 'G'],
  'Jungle Shrine':         ['W', 'R', 'G'],
  'Seaside Citadel':       ['W', 'U', 'G'],
  // All-color lands (produce any, intersected with commander identity at call site)
  'City of Brass':         ['W', 'U', 'B', 'R', 'G'],
  'Mana Confluence':       ['W', 'U', 'B', 'R', 'G'],
  'Command Tower':         ['W', 'U', 'B', 'R', 'G'],
  'Exotic Orchard':        ['W', 'U', 'B', 'R', 'G'],
  'Reflecting Pool':       ['W', 'U', 'B', 'R', 'G'],
  'Path of Ancestry':      ['W', 'U', 'B', 'R', 'G'],
  'Chromatic Lantern':     [], // not a land, but sometimes listed — produces nothing as land
  'Rupture Spire':         ['W', 'U', 'B', 'R', 'G'],
  'Transguild Promenade':  ['W', 'U', 'B', 'R', 'G'],
  'Grand Coliseum':        ['W', 'U', 'B', 'R', 'G'],
  'Pillar of the Paruns':  ['W', 'U', 'B', 'R', 'G'],
}

// ── 1. String-level deduplication (before Scryfall fetch) ─────────────────

export function deduplicateCardNames(names: string[]): string[] {
  const seen = new Set<string>()
  return names.filter(name => {
    const key = name.toLowerCase().trim()
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── 2. DeckCard-level deduplication ──────────────────────────────────────

function deduplicateCards(cards: DeckCard[]): { cards: DeckCard[]; hadDuplicates: boolean } {
  const map = new Map<string, DeckCard>()
  for (const dc of cards) {
    const key = dc.card.name.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      map.set(key, { ...existing, qty: existing.qty + dc.qty })
    } else {
      map.set(key, { ...dc })
    }
  }
  const result = [...map.values()]
  return { cards: result, hadDuplicates: result.length < cards.length }
}

// ── 3. Card count enforcement ─────────────────────────────────────────────

function createBasicLandCard(color: string): Card {
  const name = BASIC_LAND_BY_COLOR[color] ?? 'Plains'
  return {
    id: `synth-basic-${color.toLowerCase()}`,
    name,
    manaCost: '',
    cmc: 0,
    typeLine: `Basic Land — ${name}`,
    colorIdentity: [color],
    imageUri: '',
    set: 'synth',
    rarity: 'common',
    oracleText: `({${color}})`,
  }
}

// Higher = keep (trim lowest first)
function keepScore(dc: DeckCard): number {
  const tl = dc.card.typeLine.toLowerCase()
  if (tl.includes('basic') && tl.includes('land')) return 0       // trim first
  if (tl.includes('land')) return 1                                // non-basic lands next
  if (tl.includes('artifact') && !tl.includes('creature') && dc.card.cmc <= 2) return 2 // mana rocks
  return 3 + dc.card.cmc                                          // everything else: keep high-CMC last
}

const MAX_PAD = 20 // refuse to pad more than this — a larger gap means Claude hallucinated card names

function enforceCardCount(cards: DeckCard[], colorIdentity: string[]): DeckCard[] {
  const total = cards.reduce((s, dc) => s + dc.qty, 0)
  if (total === 99) return cards

  if (total < 99) {
    const needed = 99 - total
    if (needed > MAX_PAD) {
      console.warn(`[Merlin] Deck is only ${total}/99 — gap of ${needed} exceeds MAX_PAD (${MAX_PAD}). Skipping pad to avoid basic-land flood.`)
      return cards
    }
    const colors = colorIdentity.filter(c => BASIC_LAND_BY_COLOR[c])
    if (colors.length === 0) {
      console.warn(`[Merlin] Deck is ${total}/99 — colorless identity, cannot auto-pad`)
      return cards
    }
    console.warn(`[Merlin] Deck padded from ${total} to 99 cards (+${needed} basics)`)
    const result = cards.map(dc => ({ ...dc }))
    for (let i = 0; i < needed; i++) {
      const color = colors[i % colors.length]
      const landName = BASIC_LAND_BY_COLOR[color]
      const idx = result.findIndex(dc => dc.card.name === landName)
      if (idx >= 0) {
        result[idx] = { ...result[idx], qty: result[idx].qty + 1 }
      } else {
        result.push({ card: createBasicLandCard(color), qty: 1 })
      }
    }
    return result
  }

  // Over 99 — trim least-replaceable cards first
  const excess = total - 99
  console.warn(`[Merlin] Deck trimmed from ${total} to 99 cards (-${excess})`)
  // Sort ascending by keep-score so lowest keep-score (basics) comes first in the sorted array
  const sorted = [...cards].sort((a, b) => keepScore(a) - keepScore(b))
  let toRemove = excess
  const result = sorted.map(dc => ({ ...dc }))
  for (const dc of result) {
    if (toRemove <= 0) break
    const cut = Math.min(dc.qty, toRemove)
    dc.qty -= cut
    toRemove -= cut
  }
  return result.filter(dc => dc.qty > 0)
}

// ── 4. Mana base audit + fix ──────────────────────────────────────────────

function getLandColors(card: Card, commanderColors: string[]): string[] {
  const tl = card.typeLine.toLowerCase()
  const oracle = card.oracleText.toLowerCase()

  // Basic lands by type line
  if (tl.includes('basic') && tl.includes('land')) {
    for (const [sym, color] of [['plains', 'W'], ['island', 'U'], ['swamp', 'B'], ['mountain', 'R'], ['forest', 'G']] as const) {
      if (tl.includes(sym) && commanderColors.includes(color)) return [color]
    }
    return []
  }

  // Named lookup — intersect with commander identity
  const known = LAND_COLORS[card.name]
  if (known !== undefined) {
    const cmdSet = new Set(commanderColors)
    return known.filter(c => cmdSet.has(c))
  }

  // Oracle text: explicit "Add {X}"
  const produced = new Set<string>()
  for (const [color, sym] of [['W', 'w'], ['U', 'u'], ['B', 'b'], ['R', 'r'], ['G', 'g']] as const) {
    if (oracle.includes(`add {${sym}}`) && commanderColors.includes(color)) {
      produced.add(color)
    }
  }
  // "any color" or "any type" → all commander colors
  if (oracle.includes('any color') || oracle.includes('any type') || oracle.includes('mana of any')) {
    commanderColors.forEach(c => produced.add(c))
  }
  return [...produced]
}

function extractRequiredColors(manaCost: string): string[] {
  const colors: string[] = []
  for (const m of manaCost.matchAll(/\{([WUBRG])\}/g)) {
    if (!colors.includes(m[1])) colors.push(m[1])
  }
  return colors
}

function computeAudit(cards: DeckCard[], commanderColors: string[]): ManaBaseAudit {
  const pipCount: Record<string, number> = {}
  const sourceCount: Record<string, number> = {}
  for (const c of commanderColors) { pipCount[c] = 0; sourceCount[c] = 0 }

  for (const dc of cards) {
    const tl = dc.card.typeLine.toLowerCase()
    if (tl.includes('land')) {
      for (const c of getLandColors(dc.card, commanderColors)) {
        sourceCount[c] = (sourceCount[c] ?? 0) + dc.qty
      }
    } else {
      for (const c of extractRequiredColors(dc.card.manaCost)) {
        if (commanderColors.includes(c)) {
          pipCount[c] = (pipCount[c] ?? 0) + dc.qty
        }
      }
    }
  }

  const entries: ColorAuditEntry[] = commanderColors.map(color => {
    const pips = pipCount[color] ?? 0
    const srcs = sourceCount[color] ?? 0
    let status: 'green' | 'yellow' | 'red'
    if (pips === 0) status = 'green'
    else if (srcs * 3 >= pips) status = 'green'
    else if (srcs * 5 >= pips) status = 'yellow'
    else status = 'red'
    return { color, pipCount: pips, sourceCount: srcs, status }
  })

  return { entries, isHealthy: entries.every(e => e.status !== 'red') }
}

function auditManaBase(inputCards: DeckCard[], commander: Card | null): { cards: DeckCard[]; audit: ManaBaseAudit } {
  const commanderColors = commander?.colorIdentity ?? []
  if (commanderColors.length === 0) {
    return { cards: inputCards, audit: computeAudit(inputCards, commanderColors) }
  }

  let cards = inputCards.map(dc => ({ ...dc }))

  for (let iter = 0; iter < 10; iter++) {
    const audit = computeAudit(cards, commanderColors)
    // "Undersupported" = color has cards requiring it but fewer than 3 sources
    const undersupported = audit.entries.filter(e => e.pipCount > 0 && e.sourceCount < 3)
    if (undersupported.length === 0) return { cards, audit }

    // Fix the most undersupported color (fewest sources)
    const target = undersupported.sort((a, b) => a.sourceCount - b.sourceCount)[0]
    const color = target.color

    // Find highest-CMC non-land card requiring that color
    const candidates = cards
      .filter(dc => {
        if (dc.card.typeLine.toLowerCase().includes('land')) return false
        return extractRequiredColors(dc.card.manaCost).includes(color)
      })
      .sort((a, b) => b.card.cmc - a.card.cmc)

    if (candidates.length === 0) break

    // Remove one copy of the highest-CMC offender
    const victim = candidates[0]
    cards = cards
      .map(dc => dc.card.id === victim.card.id ? { ...dc, qty: dc.qty - 1 } : dc)
      .filter(dc => dc.qty > 0)

    // Add one basic land for that color
    const landName = BASIC_LAND_BY_COLOR[color]
    if (landName) {
      const idx = cards.findIndex(dc => dc.card.name === landName)
      if (idx >= 0) {
        cards = cards.map((dc, i) => i === idx ? { ...dc, qty: dc.qty + 1 } : dc)
      } else {
        cards = [...cards, { card: createBasicLandCard(color), qty: 1 }]
      }
    }
  }

  return { cards, audit: computeAudit(cards, commanderColors) }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Full validation pipeline — run after Scryfall cards are fetched.
 * 1. Deduplicates cards with identical names
 * 2. Pads or trims to exactly 99 non-commander cards
 * 3. Audits mana base and swaps high-CMC cards for basics in undersupported colors
 */
export function validateAndCleanDecklist(
  cards: DeckCard[],
  commander: Card | null,
): { cards: DeckCard[]; audit: ManaBaseAudit; hadDuplicates: boolean } {
  const { cards: step1, hadDuplicates } = deduplicateCards(cards)
  const step2 = enforceCardCount(step1, commander?.colorIdentity ?? [])
  const { cards: step3, audit } = auditManaBase(step2, commander)
  return { cards: step3, audit, hadDuplicates }
}

/**
 * Compute mana base audit from current live deck state (for sidebar display).
 * Does not apply any fixes — read-only.
 */
export function computeCurrentAudit(cards: DeckCard[], commander: Card | null): ManaBaseAudit {
  return computeAudit(cards, commander?.colorIdentity ?? [])
}
