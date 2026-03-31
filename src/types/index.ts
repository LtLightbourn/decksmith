// ── Scryfall raw API shape ─────────────────────────────────────────────────

export interface ScryfallImageUris {
  small: string
  normal: string
  large: string
  art_crop: string
}

export interface ScryfallCard {
  id: string
  name: string
  mana_cost: string
  cmc: number
  type_line: string
  oracle_text?: string
  power?: string
  toughness?: string
  loyalty?: string
  colors?: string[]
  color_identity: string[]
  legalities: Record<string, 'legal' | 'not_legal' | 'banned' | 'restricted'>
  image_uris?: ScryfallImageUris
  card_faces?: Array<{ image_uris?: ScryfallImageUris; mana_cost?: string; type_line?: string }>
  set: string
  set_name: string
  rarity: string
  prints_search_uri: string
  prices?: { usd?: string | null; usd_foil?: string | null }
}

// ── App card shape (subset stored in deck) ────────────────────────────────

export interface Card {
  id: string
  name: string
  manaCost: string
  cmc: number
  typeLine: string
  colorIdentity: string[]
  imageUri: string
  set: string
  rarity: string
  oracleText: string
  priceUsd?: number
}

// ── Deck card (card + quantity) ───────────────────────────────────────────

export interface DeckCard {
  card: Card
  qty: number
}

// ── Section names (fixed order) ───────────────────────────────────────────

export const SECTION_ORDER = [
  'Commanders',
  'Creatures',
  'Instants',
  'Sorceries',
  'Enchantments',
  'Artifacts',
  'Planeswalkers',
  'Lands',
] as const

export type SectionName = (typeof SECTION_ORDER)[number]

// ── Deck sections map ─────────────────────────────────────────────────────

export type DeckSections = Record<SectionName, DeckCard[]>

// ── Saved deck slot ───────────────────────────────────────────────────────

export interface SavedDeck {
  id: string
  name: string
  commander: Card | null
  cards: DeckCard[]
  savedAt: number
}

// ── Analytics stats ───────────────────────────────────────────────────────

export interface DeckStats {
  totalCards: number
  manaCurve: Record<number, number>
  colorPips: Record<string, number>
  typeBreakdown: Record<string, number>
  avgCmc: number
  rampCount: number
  drawCount: number
  interactionCount: number
  boardWipeCount: number
  powerLevel: PowerLevelResult
}

export interface PowerLevelResult {
  score: number
  label: 'Casual' | 'Focused' | 'High Power' | 'cEDH'
  flags: string[]
}

// ── Search filters ────────────────────────────────────────────────────────

export interface SearchFilters {
  colors: string[]         // active color identity toggles
  cardType: string         // e.g. 'creature', 'instant'
  cmcMin: number
  cmcMax: number
  keyword: string          // oracle text keyword
  commanderLegal: boolean
  maxPrice?: number        // max USD price (undefined = no limit)
}

// ── Wizard modal state ────────────────────────────────────────────────────

export type WizardTab = 'vibe' | 'keywords' | 'refine'

export type DeckArchetype =
  | 'Aggro' | 'Control' | 'Combo' | 'Midrange' | 'Stax'
  | 'Voltron' | 'Tokens' | 'Superfriends' | 'Spellslinger'
  | 'Reanimator' | 'Goodstuff'

export type DeckBudget = 'Casual' | 'Focused' | 'High Power' | 'No Limit'

export type Bracket = 1 | 2 | 3 | 4

// ── Playstyle profile ─────────────────────────────────────────────────────

export type WinCondition  = 'creatures' | 'combo' | 'control' | 'fun'
export type InteractionStyle = 'reactive' | 'proactive' | 'focused' | 'political'
export type GameLength    = 'fast' | 'medium' | 'long' | 'decisions'
export type NeverDo       = 'combo' | 'stax' | 'extraturns' | 'oppressive'

export interface PlaystyleAnswers {
  winCondition:  WinCondition
  interaction:   InteractionStyle
  gameLength:    GameLength
  neverDo:       NeverDo
}

// ── Price data ────────────────────────────────────────────────────────────

export interface PriceData {
  usd: string | null
  usdFoil: string | null
  fetchedAt: number
}

// ── Mana base audit ───────────────────────────────────────────────────────

export interface ColorAuditEntry {
  color: string
  pipCount: number    // non-land cards (by qty) that require this color
  sourceCount: number // lands (by qty) that can produce this color
  status: 'green' | 'yellow' | 'red'
}

export interface ManaBaseAudit {
  entries: ColorAuditEntry[]
  isHealthy: boolean
}

// ── Deck versions ─────────────────────────────────────────────────────────

export interface DeckVersion {
  id: string
  label: string
  cards: DeckCard[]
  commander: Card | null
  savedAt: number
  bracket: Bracket
  cardCount: number
  deckValue: number
}

// ── Deck history + player memory ─────────────────────────────────────────

export interface DeckHistoryEntry {
  id: string
  name: string
  commander: Card | null
  cards: DeckCard[]
  bracket: number
  savedAt: number
  summary: string
  themes: string[]
  tag?: string
}

export interface PlayerMemory {
  totalDecks: number
  favoriteColors: string[]
  commonCards: string[]
  neverSuggest: string[]
  recentCommanders: string[]
  preferredStrategies: string[]
}

export interface KeywordFormState {
  archetype: DeckArchetype
  colors: string[]
  budget: DeckBudget
  notes: string
}

// ── Playtester ────────────────────────────────────────────────────────────

export type PlayPhase = 'opening' | 'game'

export interface BattlefieldCard {
  uid: string      // unique instance id (not card.id — same card can appear twice)
  card: Card
  tapped: boolean
  x: number        // % of battlefield width, 0-100
  y: number        // % of battlefield height, 0-100
}
