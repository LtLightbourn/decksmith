// ── Claude API proxy client ───────────────────────────────────────────────
import { deduplicateCardNames } from './deckValidation'
import { playstyleGuidance } from './playstyleProfile'
import type { PlaystyleAnswers } from '../types'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface WizardPromptInput {
  vibe?: string
  archetype?: string
  colors?: string[]
  budget?: string
  notes?: string
  bracket?: number            // 1-4 Command Zone bracket target
  playgroup?: string[]        // opponent commander names
  playstyle?: string | null   // pre-formatted guidance block from playstyleGuidance()
}

export interface DeckBuildResult {
  commander: string
  description: string
  cards: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResult {
  text: string
  deckUpdate?: {
    commander: string
    cards: string[]
  }
}

export interface ThreatEntry {
  commander: string
  description: string
}

export interface PlaygroupAnalysis {
  threats: ThreatEntry[]
  interactions: string[]
  politicalCards: string[]
}

export interface SwapSuggestion {
  cut: string
  add: string
  reason: string
}

export interface DeckSummaryResult {
  summary: string
  themes: string[]
}

export interface RawUpgrade {
  cut: string
  add: string
  impact: 'High' | 'Medium' | 'Low'
  reason: string
}

export interface BudgetSwap {
  cut: string
  add: string
  reason: string
}

// ── Auth token getter (registered by AuthBridge) ─────────────────────────

type TokenGetter = () => Promise<string | null>
let _getToken: TokenGetter | null = null

export function registerTokenGetter(fn: TokenGetter): void {
  _getToken = fn
}

export async function fetchUsage(): Promise<{ remaining: number; limit: number } | null> {
  try {
    const headers: Record<string, string> = {}
    if (_getToken) {
      const token = await _getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE}/api/usage`, { headers })
    if (!response.ok) return null
    return await response.json() as { remaining: number; limit: number }
  } catch {
    return null
  }
}

export async function fetchStripeStatus(): Promise<{
  isPro: boolean
  usageCount: number
  limit: number
} | null> {
  try {
    const headers: Record<string, string> = {}
    if (_getToken) {
      const token = await _getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE}/api/stripe/status`, { headers })
    if (!response.ok) return null
    return await response.json() as { isPro: boolean; usageCount: number; limit: number }
  } catch {
    return null
  }
}

export async function createCheckoutSession(): Promise<{ url: string } | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (_getToken) {
      const token = await _getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers,
    })
    if (!response.ok) return null
    return await response.json() as { url: string }
  } catch {
    return null
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────

async function callClaude(
  messages: ChatMessage[],
  system: string,
  temperature?: number,
  extraBody?: Record<string, unknown>,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (_getToken) {
    const token = await _getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}/api/claude`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      ...(temperature != null ? { temperature } : {}),
      system,
      messages,
      ...extraBody,
    }),
  })

  if (response.status === 402) {
    const body = await response.json().catch(() => ({})) as { feature?: string }
    if (body.feature === 'merlin_chat') {
      window.dispatchEvent(new CustomEvent('decksmith:pro-required', { detail: { feature: 'merlin_chat' } }))
    } else {
      window.dispatchEvent(new CustomEvent('decksmith:limit-reached'))
    }
    throw new Error('pro_required')
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Proxy error ${response.status}: ${err}`)
  }

  // Propagate remaining usage to the UI
  const remaining = response.headers.get('X-Usage-Remaining')
  if (remaining !== null) {
    window.dispatchEvent(
      new CustomEvent('decksmith:usage', { detail: { remaining: parseInt(remaining, 10) } }),
    )
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

// Pro-gated Claude proxy — routes to named endpoints, no usage counting
async function callClaudePro(
  endpoint: string,
  messages: ChatMessage[],
  system: string,
  temperature?: number,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (_getToken) {
    const token = await _getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      ...(temperature != null ? { temperature } : {}),
      system,
      messages,
    }),
  })

  if (response.status === 402) {
    const body = await response.json().catch(() => ({})) as { feature?: string }
    window.dispatchEvent(new CustomEvent('decksmith:pro-required', {
      detail: { feature: body.feature ?? endpoint.replace('/api/', '') },
    }))
    throw new Error('pro_required')
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Proxy error ${response.status}: ${err}`)
  }

  const data = await response.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

function parseCardsSection(text: string): string[] {
  const names = text
    .split('\n')
    .map(l => l.trim().replace(/^\d+[.)]\s*/, '').replace(/^[-•*]\s*/, ''))
    .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('['))
  return deduplicateCardNames(names)
}

const DECK_SECTIONS = ['RAMP', 'DRAW', 'INTERACTION', 'CREATURES', 'OTHER', 'LANDS', 'CARDS']
const BASIC_LANDS = new Set(['Mountain', 'Plains', 'Island', 'Swamp', 'Forest', 'Wastes'])
const MAX_BASICS_PER_TYPE = 20

function capBasicLands(cards: string[]): string[] {
  const counts = new Map<string, number>()
  return cards.filter(card => {
    if (BASIC_LANDS.has(card)) {
      const n = (counts.get(card) ?? 0) + 1
      counts.set(card, n)
      return n <= MAX_BASICS_PER_TYPE
    }
    return true
  })
}

function parseSectionedOrFlat(text: string): string[] {
  const hasSections = DECK_SECTIONS.some(s => text.includes(`${s}:\n`) || text.includes(`${s}:\r\n`))

  let allCards: string[]

  if (hasSections) {
    // Collect cards from each named section using indexOf so multiline issues don't apply
    allCards = []
    for (const section of DECK_SECTIONS) {
      const header = `${section}:`
      const start = text.indexOf(header)
      if (start === -1) continue
      // Section ends at the next section header or end of string
      let end = text.length
      for (const other of DECK_SECTIONS) {
        if (other === section) continue
        const otherStart = text.indexOf(`${other}:`, start + header.length)
        if (otherStart !== -1 && otherStart < end) end = otherStart
      }
      allCards.push(...parseCardsSection(text.slice(start + header.length, end)))
    }
    allCards = deduplicateCardNames(allCards)
  } else {
    // Fallback: flat CARDS: format
    const cardsStart = text.indexOf('CARDS:')
    const cardsText = cardsStart !== -1 ? text.slice(cardsStart + 'CARDS:'.length) : text
    allCards = parseCardsSection(cardsText)
  }

  // Safety net: never let basic lands dominate the deck
  return capBasicLands(allCards)
}

function bracketGuidance(bracket?: number): string {
  switch (bracket) {
    case 1: return `POWER LEVEL — Bracket 1 (Exhibition): Precon-level. No tutors, no fast mana, no extra turns, no infinite combos, no stax. Minimal synergy. Cards should be straightforward and fair.`
    case 2: return `POWER LEVEL — Bracket 2 (Core): Upgraded casual. No optimal tutors (Demonic Tutor, Vampiric Tutor, etc.), no fast mana artifacts (Mana Crypt, Chrome Mox, Mox Diamond, etc.), no extra turn spells, no cEDH combo pieces. Sol Ring is acceptable. Synergy is welcome but not optimized.`
    case 3: return `POWER LEVEL — Bracket 3 (Powered): Optimized synergistic deck. Budget tutors (Diabolic Tutor, Diabolic Intent) are OK; optimal tutors are not. No cEDH-tier fast mana, no Force of Will, no game-winning 2-card combos that win on the spot. Strong draw engines (Rhystic Study, Necropotence) are fine.`
    case 4: return `POWER LEVEL — Bracket 4 (cEDH): Maximum power, full competitive. All tutors, all fast mana, free counterspells, optimal combo lines all appropriate.`
    default: return ''
  }
}

function playgroupGuidance(playgroup?: string[]): string {
  if (!playgroup || playgroup.length === 0) return ''
  const list = playgroup.join(', ')
  return `PLAYGROUP CONTEXT — The player's pod contains: ${list}. Build to be competitive against these specific strategies without being oppressive. Suggest interaction that answers these threats specifically. Consider the multiplayer politics of a ${playgroup.length}-player pod.`
}

// ── Commander Finder ──────────────────────────────────────────────────────

export interface CommanderSuggestion {
  name: string
  colors: string[]
  strategy: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  priceRange: 'Budget' | 'Mid-Range' | 'Expensive'
  why: string
  imageUri?: string
}

export async function findCommanders(
  description: string,
  bracket: number,
  playstyle?: string | null,
): Promise<CommanderSuggestion[]> {
  const bracketLine = bracketGuidance(bracket)
  const styleLine = playstyle ?? ''

  const system = `You are Merlin, an expert Magic: The Gathering Commander advisor.
${styleLine}
${bracketLine}

A player describes how they want to play. Suggest 4 commanders that match their description.

Respond with ONLY a JSON block in this exact format:
[COMMANDERS]
[
  {
    "name": "Exact Scryfall card name",
    "colors": ["W","U","B","R","G"],
    "strategy": "One sentence describing the deck strategy",
    "difficulty": "Beginner|Intermediate|Advanced",
    "priceRange": "Budget|Mid-Range|Expensive",
    "why": "One sentence on why this commander matches the player's description"
  }
]
[/COMMANDERS]

Rules:
- colors must only contain colors in this commander's color identity
- difficulty: Beginner = straightforward win conditions, Advanced = complex timing/interaction
- priceRange: Budget = deck under $80, Mid-Range = $80-200, Expensive = over $200
- Choose diverse commanders — don't suggest two commanders with the same strategy
- Use exact card names as they appear on Scryfall`

  const raw = await callClaudePro(
    '/api/commander-finder',
    [{ role: 'user', content: description }],
    system,
    0.9,
  )

  const match = raw.match(/\[COMMANDERS\]([\s\S]*?)\[\/COMMANDERS\]/)
  if (!match) throw new Error('Merlin returned an unexpected response format')

  let suggestions: CommanderSuggestion[]
  try {
    suggestions = JSON.parse(match[1].trim()) as CommanderSuggestion[]
  } catch {
    throw new Error('Could not parse commander suggestions')
  }

  // Fetch images from Scryfall for each commander
  const withImages = await Promise.all(
    suggestions.map(async (s) => {
      try {
        const res = await fetch(
          `/api/scryfall/named?exact=${encodeURIComponent(s.name)}`,
        )
        if (!res.ok) return s
        const card = await res.json() as {
          image_uris?: { normal?: string }
          card_faces?: Array<{ image_uris?: { normal?: string } }>
        }
        const imageUri =
          card.image_uris?.normal ??
          card.card_faces?.[0]?.image_uris?.normal
        return { ...s, imageUri }
      } catch {
        return s
      }
    }),
  )

  return withImages
}

// ── Public API ────────────────────────────────────────────────────────────

export async function buildDeck(input: WizardPromptInput): Promise<DeckBuildResult> {
  const bracketLine = bracketGuidance(input.bracket)
  const podLine = playgroupGuidance(input.playgroup)
  const styleLine = input.playstyle ?? ''

  const system = `You are Merlin, an expert Magic: The Gathering Commander deck builder with a wise, mystical personality.

${styleLine}
${bracketLine}
${podLine}

Important philosophy: Build complete, functional Commander decks — not theme showcases. When someone asks for a "Goblin deck" or any tribal/theme deck, include the best tribal pieces AND the support cards that make the deck function (ramp, draw, removal, protection). A Goblin deck runs Sol Ring, Skullclamp, and Blasphemous Act alongside Goblins — not just Goblins. Every deck needs a full 99-card suite of cards that win games, not just cards that match the theme.

Respond in EXACTLY this format — no deviations:

COMMANDER: <single commander card name>
DESCRIPTION: <2-3 sentences describing the deck strategy, feel, and win conditions>
RAMP:
<10-12 ramp cards — mana rocks, land ramp, mana dorks>
DRAW:
<8-10 card draw and card advantage pieces>
INTERACTION:
<8-10 removal, board wipes, counterspells, or protection pieces>
CREATURES:
<18-24 creatures that serve the strategy — do not repeat any card already listed above>
OTHER:
<8-14 remaining spells — instants, sorceries, enchantments, artifacts, planeswalkers>
LANDS:
<33-36 lands — no more than 20 basic lands, fill the rest with nonbasic lands>

Strict rules:
- COMMANDER must be a legendary creature or planeswalker that can legally be a commander
- The commander must NOT appear in any section
- Use only real, legal card names that exist in paper Magic: The Gathering
- All cards must be legal in Commander format and fit within the commander's color identity
- No card may appear more than once across all sections
- No numbers or quantities — one card name per line
- All sections together must total EXACTLY 99 cards — count carefully`

  let userPrompt: string
  if (input.vibe) {
    userPrompt = `Build me a Commander deck with this vibe: "${input.vibe}"`
  } else {
    const colorStr = input.colors && input.colors.length > 0
      ? `Color identity: ${input.colors.join(', ')}`
      : 'Any colors'
    userPrompt = `Build me a Commander deck.
Archetype: ${input.archetype ?? 'Midrange'}
${colorStr}
Budget: ${input.budget ?? 'Focused'}
${input.notes ? `Notes: ${input.notes}` : ''}`
  }

  const text = await callClaude([{ role: 'user', content: userPrompt }], system, 0.7)

  const commanderMatch = text.match(/^COMMANDER:\s*(.+)$/m)
  const descStart = text.indexOf('DESCRIPTION:')
  const cardsStart = text.indexOf('CARDS:')

  let description = ''
  if (descStart !== -1) {
    const descEnd = cardsStart !== -1 ? cardsStart : text.indexOf('RAMP:') !== -1 ? text.indexOf('RAMP:') : text.length
    description = text.slice(descStart + 'DESCRIPTION:'.length, descEnd).trim()
  }

  // Support both old flat CARDS: format and new sectioned format
  const cards = parseSectionedOrFlat(text)

  return {
    commander: commanderMatch ? commanderMatch[1].trim() : '',
    description,
    cards,
  }
}

function parseDeckBuildResponse(text: string): DeckBuildResult {
  const commanderMatch = text.match(/^COMMANDER:\s*(.+)$/m)
  const descStart = text.indexOf('DESCRIPTION:')
  const cardsStart = text.indexOf('CARDS:')

  let description = ''
  if (descStart !== -1) {
    const end = cardsStart !== -1 ? cardsStart : text.length
    description = text.slice(descStart + 'DESCRIPTION:'.length, end).trim()
  }

  return {
    commander: commanderMatch ? commanderMatch[1].trim() : '',
    description,
    cards: parseSectionedOrFlat(text),
  }
}

export async function generateSurpriseDeck(
  bracket: number,
  playstyle: PlaystyleAnswers | null,
  recentCommanders: string[],
): Promise<DeckBuildResult> {
  const bracketLine = bracketGuidance(bracket)
  const styleLine = playstyleGuidance(playstyle)

  const avoidList = recentCommanders.length > 0
    ? `\nDo NOT choose any of these commanders the player has built recently: ${recentCommanders.join(', ')}.`
    : ''

  const system = `You are Merlin, an expert Magic: The Gathering Commander deck builder. You revel in surprise and creativity.

${styleLine}
${bracketLine}

Choose a completely random commander and theme. Be creative and unexpected — avoid the most popular commanders (no Atraxa, Kenrith, Edgar Markov, Urza, Yuriko, Muldrotha, etc.). Embrace the obscure, the flavorful, the delightfully chaotic.${avoidList}

Respond in EXACTLY this format — no deviations:

COMMANDER: <single commander card name>
DESCRIPTION: <2-3 sentences describing the deck strategy, feel, and win conditions — capture the flavor and surprise>
RAMP:
<10-12 ramp cards — mana rocks, land ramp, mana dorks>
DRAW:
<8-10 card draw and card advantage pieces>
INTERACTION:
<8-10 removal, board wipes, counterspells, or protection pieces>
CREATURES:
<18-24 creatures that serve the strategy — do not repeat any card already listed above>
OTHER:
<8-14 remaining spells — instants, sorceries, enchantments, artifacts, planeswalkers>
LANDS:
<33-36 lands — no more than 20 basic lands, fill the rest with nonbasic lands>

Strict rules:
- COMMANDER must be a legendary creature or planeswalker that can legally be a commander
- The commander must NOT appear in any section
- Use only real, legal card names that exist in paper Magic: The Gathering
- All cards must be legal in Commander format and fit within the commander's color identity
- No card may appear more than once across all sections
- No numbers or quantities — one card name per line
- All sections together must total EXACTLY 99 cards — count carefully
- Basic lands should make up no more than 20-25 of the land slots — fill the rest with nonbasic lands
- Every non-land card must serve the deck strategy — no filler`

  const text = await callClaudePro(
    '/api/surprise-deck',
    [{ role: 'user', content: 'Surprise me. Build me something unexpected and fun.' }],
    system,
    1.0,
  )

  return parseDeckBuildResponse(text)
}

export async function chatWithMerlin(
  history: ChatMessage[],
  deckContext: string,
  bracket?: number,
  playgroup?: string[],
  playstyle?: string | null,
): Promise<ChatResult> {
  const bracketLine = bracketGuidance(bracket)
  const podLine = playgroupGuidance(playgroup)
  const styleLine = playstyle ?? ''

  const system = `You are Merlin, a mystical and wise Magic: The Gathering Commander deck builder. You have intimate knowledge of the user's current deck.

${deckContext}

${styleLine}
${bracketLine}
${podLine}

You can:
- Answer questions about the deck, its strategy, synergies, and card choices
- Explain why specific cards are included and how they work together
- Suggest improvements or changes
- Rebuild the deck based on the user's requests

If the user asks you to make changes to the deck (add/remove cards, change the commander, rebuild it), include the FULL updated deck list at the END of your response, wrapped like this:
[DECK_UPDATE]
COMMANDER: <commander name>
CARDS:
<99 card names, one per line, no numbering>
[/DECK_UPDATE]

Always write your conversational response BEFORE the [DECK_UPDATE] block.
If just answering questions, omit the [DECK_UPDATE] block entirely.
Keep responses concise. Stay in character as a wise, slightly cryptic wizard.`

  const text = await callClaude(history, system, undefined, { isChatMessage: true })

  const updateMatch = text.match(/\[DECK_UPDATE\]([\s\S]+?)\[\/DECK_UPDATE\]/)
  let deckUpdate: ChatResult['deckUpdate'] = undefined
  let cleanText = text

  if (updateMatch) {
    const block = updateMatch[1]
    const cmdMatch = block.match(/^COMMANDER:\s*(.+)$/m)
    const cardsStart = block.indexOf('CARDS:')
    if (cmdMatch && cardsStart !== -1) {
      const cards = parseCardsSection(block.slice(cardsStart + 'CARDS:'.length))
      if (cards.length > 0) {
        deckUpdate = { commander: cmdMatch[1].trim(), cards }
      }
    }
    cleanText = text.replace(/\[DECK_UPDATE\][\s\S]+?\[\/DECK_UPDATE\]/, '').trim()
  }

  return { text: cleanText, deckUpdate }
}

export async function analyzePlaygroup(
  commanders: string[],
  isMultiplayer: boolean,
): Promise<PlaygroupAnalysis> {
  const system = `You are Merlin, a wise Magic: The Gathering strategist. Analyze a Commander pod and output threat assessments and interaction recommendations.

Respond in EXACTLY this format:

THREAT: <commander name> | <one sentence describing their primary strategy and win condition>
THREAT: <commander name> | <one sentence>
...
INTERACTION: <specific interaction type or card category with brief reason>
INTERACTION: <specific interaction type or card category with brief reason>
...
${isMultiplayer ? `POLITICAL: <card name> | <one sentence on why it fits multiplayer>
POLITICAL: <card name> | <one sentence>
POLITICAL: <card name> | <one sentence>` : ''}

Rules:
- One THREAT line per commander in the pod
- 3-5 INTERACTION lines
- ${isMultiplayer ? '3 POLITICAL lines with real card names' : 'No POLITICAL section needed'}
- Be specific about what threats to answer, not generic`

  const text = await callClaudePro(
    '/api/analyze-playgroup',
    [{ role: 'user', content: `Analyze this Commander pod: ${commanders.join(', ')}` }],
    system,
  )

  const threats: ThreatEntry[] = []
  const interactions: string[] = []
  const politicalCards: string[] = []

  for (const line of text.split('\n')) {
    const t = line.match(/^THREAT:\s*(.+?)\s*\|\s*(.+)$/)
    if (t) { threats.push({ commander: t[1].trim(), description: t[2].trim() }); continue }
    const i = line.match(/^INTERACTION:\s*(.+)$/)
    if (i) { interactions.push(i[1].trim()); continue }
    const p = line.match(/^POLITICAL:\s*(.+?)\s*\|\s*(.+)$/)
    if (p) { politicalCards.push(`${p[1].trim()} — ${p[2].trim()}`); continue }
  }

  return { threats, interactions, politicalCards }
}

export async function tuneForPod(
  deckCards: string[],
  commanderName: string | null,
  playgroupCommanders: string[],
  bracket: number,
): Promise<SwapSuggestion[]> {
  const bracketLine = bracketGuidance(bracket)

  const system = `You are Merlin, a Magic: The Gathering deck tuning expert. Given a decklist and a Commander pod, suggest targeted swaps to improve the deck's matchup against the specific opponents.

${bracketLine}

Respond with exactly 5-8 swap suggestions in this format:

CUT: <exact card name from the decklist>
ADD: <replacement card name>
REASON: <one sentence explaining why this swap specifically helps against this pod>

Rules:
- CUT cards must be real cards from the provided decklist
- ADD cards must be real Magic cards that are legal in Commander
- ADD cards must fit within the commander's color identity
- Each suggestion must directly address a specific threat in the pod
- Do not suggest adding cards already in the deck`

  const deckList = deckCards.slice(0, 99).join('\n')
  const podList = playgroupCommanders.join(', ')
  const userPrompt = `Commander: ${commanderName ?? 'Unknown'}
Pod opponents: ${podList}

Current decklist:
${deckList}

Suggest specific swaps to better handle this pod.`

  const text = await callClaudePro('/api/tune-for-pod', [{ role: 'user', content: userPrompt }], system, 0.5)

  const swaps: SwapSuggestion[] = []
  const lines = text.split('\n').map(l => l.trim())

  for (let i = 0; i < lines.length - 2; i++) {
    const cut = lines[i].match(/^CUT:\s*(.+)$/)
    const add = lines[i + 1]?.match(/^ADD:\s*(.+)$/)
    const reason = lines[i + 2]?.match(/^REASON:\s*(.+)$/)
    if (cut && add && reason) {
      swaps.push({ cut: cut[1].trim(), add: add[1].trim(), reason: reason[1].trim() })
      i += 2
    }
  }

  return swaps
}

export async function generateDeckSummary(
  commanderName: string | null,
  cardNames: string[],
): Promise<DeckSummaryResult> {
  const system = `You are a Magic: The Gathering deck analyst. Respond with EXACTLY two lines and nothing else:
SUMMARY: [one sentence describing this deck's primary strategy and win condition]
THEMES: [2-4 comma-separated lowercase keywords from this list: aristocrats, graveyard, tokens, combo, ramp, control, voltron, stax, goodstuff, spellslinger, reanimator, tribal, infinite-combo, land-destruction, aggro, midrange, politics, pillowfort, infect, equipment]`

  const text = await callClaude(
    [{
      role: 'user',
      content: `Commander: ${commanderName ?? 'Unknown'}\n\nDecklist:\n${cardNames.slice(0, 60).join('\n')}`,
    }],
    system,
    0.3,
  )

  const summaryMatch = text.match(/^SUMMARY:\s*(.+)$/m)
  const themesMatch  = text.match(/^THEMES:\s*(.+)$/m)

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    themes: themesMatch
      ? themesMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [],
  }
}

export async function generateSmartGreeting(
  playerName: string,
  recentCommanders: string[],
  preferredStrategies: string[],
  totalDecks: number,
): Promise<string> {
  const system = `You are Merlin, a wise and slightly cryptic Magic: The Gathering wizard. Write a brief personalized greeting for a returning player based on their history. Be warm but not sycophantic. Reference their specific recent commanders or themes. One to two sentences only. Slightly archaic but readable tone.`

  const context = [
    `Player: ${playerName || 'traveler'}`,
    `Decks built: ${totalDecks}`,
    recentCommanders.length > 0 ? `Recent commanders: ${recentCommanders.join(', ')}` : '',
    preferredStrategies.length > 0 ? `Preferred themes: ${preferredStrategies.join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const text = await callClaude([{ role: 'user', content: context }], system, 0.85)
  return text.trim()
}

export async function getBudgetSwaps(
  expensiveCards: Array<{ name: string; priceUsd: number }>,
  commanderName: string | null,
  deckColors: string[],
  bracket: number,
): Promise<BudgetSwap[]> {
  const bracketLine = bracketGuidance(bracket)
  const colorStr = deckColors.length > 0 ? deckColors.join('') : 'WUBRG'

  const system = `You are Merlin, a Magic: The Gathering budget optimization expert. Given a list of expensive cards from a deck, suggest cheaper functional replacements that maintain deck strategy.

${bracketLine}

Commander color identity: ${colorStr}

Respond with ONLY a JSON array inside [BUDGET_SWAPS]...[/BUDGET_SWAPS] tags:

[BUDGET_SWAPS]
[
  {
    "cut": "exact expensive card name",
    "add": "cheaper functional replacement",
    "reason": "one sentence explaining the swap preserves deck function"
  }
]
[/BUDGET_SWAPS]

Rules:
- One swap per expensive card provided
- ADD cards must be legal Commander cards within the color identity
- ADD cards must serve a similar function to the CUT card
- ADD cards should typically cost less than the CUT card
- Do not suggest cards already in the deck`

  const cardList = expensiveCards
    .map(c => `${c.name} ($${c.priceUsd.toFixed(2)})`)
    .join('\n')

  const text = await callClaudePro(
    '/api/budget-swaps',
    [{ role: 'user', content: `Commander: ${commanderName ?? 'Unknown'}\n\nExpensive cards to replace:\n${cardList}` }],
    system,
    0.4,
  )

  const match = text.match(/\[BUDGET_SWAPS\]([\s\S]+?)\[\/BUDGET_SWAPS\]/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[1].trim()) as Array<{
      cut?: string; add?: string; reason?: string
    }>
    return parsed
      .filter(s => s.cut && s.add && s.reason)
      .map(s => ({ cut: s.cut!.trim(), add: s.add!.trim(), reason: s.reason!.trim() }))
  } catch {
    return []
  }
}

export async function getUpgradeSuggestions(
  deckCards: Array<{ name: string; priceUsd?: number }>,
  commanderName: string | null,
  budgetPerCard: number | null,
  bracket: number,
  playstyle: string | null,
  playgroup: string[],
): Promise<RawUpgrade[]> {
  const bracketLine = bracketGuidance(bracket)
  const podLine = playgroupGuidance(playgroup)
  const styleLine = playstyle ?? ''
  const budgetStr = budgetPerCard != null ? `$${budgetPerCard} or less per card` : 'no budget limit'

  const system = `You are Merlin, a Magic: The Gathering deck optimization expert. Analyze the decklist and suggest high-impact upgrades within budget.

${bracketLine}
${podLine}
${styleLine}

Budget constraint: Suggested "add" cards must cost ${budgetStr}.

Respond with ONLY a JSON array inside [UPGRADES]...[/UPGRADES] tags, no other text:

[UPGRADES]
[
  {
    "cut": "exact card name from the decklist",
    "add": "real Magic card name to add",
    "impact": "High",
    "reason": "one specific sentence why this swap improves this deck"
  }
]
[/UPGRADES]

Rules:
- Suggest 6-10 swaps total
- CUT names must match exactly from the provided decklist
- ADD cards must be real, legal Commander cards within the commander's color identity
- Do not suggest adding cards already in the deck
- impact must be exactly "High", "Medium", or "Low"
- Prioritize swaps that most improve consistency, synergy, or pod matchups`

  const deckList = deckCards
    .map(c => `${c.name}${c.priceUsd != null ? ` ($${c.priceUsd.toFixed(2)})` : ''}`)
    .join('\n')

  const userPrompt = `Commander: ${commanderName ?? 'Unknown'}

Current deck (with prices where known):
${deckList}

Suggest the highest-impact upgrades within ${budgetStr}.`

  const text = await callClaudePro('/api/upgrade-suggestions', [{ role: 'user', content: userPrompt }], system, 0.4)

  const match = text.match(/\[UPGRADES\]([\s\S]+?)\[\/UPGRADES\]/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[1].trim()) as Array<{
      cut?: string; add?: string; impact?: string; reason?: string
    }>
    return parsed
      .filter(s => s.cut && s.add && s.impact && s.reason)
      .map(s => ({
        cut: s.cut!.trim(),
        add: s.add!.trim(),
        impact: (['High', 'Medium', 'Low'].includes(s.impact!) ? s.impact! : 'Medium') as 'High' | 'Medium' | 'Low',
        reason: s.reason!.trim(),
      }))
  } catch {
    return []
  }
}

// ── Playtester ─────────────────────────────────────────────────────────────

export async function assessOpeningHand(
  cardNames: string[],
  commanderName: string | null,
): Promise<string> {
  const system = 'You are a concise Magic: The Gathering deck expert. Respond in exactly one sentence.'
  const messages: ChatMessage[] = [{
    role: 'user',
    content: `Commander: ${commanderName ?? 'Unknown'}\nOpening hand: ${cardNames.join(', ')}\n\nAssess this opening hand in one sentence — mention land count, key pieces, and keep/mulligan recommendation.`,
  }]
  const text = await callClaude(messages, system, 0.3)
  return text.trim()
}

export async function assessBoardState(
  commanderName: string | null,
  turn: number,
  lifeTotal: number,
  handCards: string[],
  battlefieldCards: string[],
): Promise<string> {
  const system = 'You are a concise Magic: The Gathering deck expert. Respond in exactly one sentence.'
  const messages: ChatMessage[] = [{
    role: 'user',
    content: `Commander: ${commanderName ?? 'Unknown'}\nTurn ${turn} | Life: ${lifeTotal}\nHand (${handCards.length}): ${handCards.join(', ')}\nBattlefield: ${battlefieldCards.join(', ') || 'empty'}\n\nAssess the board state and suggest the next key play in one sentence.`,
  }]
  const text = await callClaude(messages, system, 0.3)
  return text.trim()
}
