import type { DeckCard, PowerLevelResult } from '../types'

const TUTORS = [
  'demonic tutor', 'vampiric tutor', 'imperial seal', 'enlightened tutor',
  'mystical tutor', 'worldly tutor', 'sylvan tutor', 'personal tutor',
  'diabolic tutor', 'grim tutor', 'beseech the mirror',
]

const FAST_MANA = [
  'sol ring', 'mana crypt', 'mana vault', 'chrome mox', 'mox diamond',
  'mox opal', 'jeweled lotus', 'black lotus', 'lotus petal',
  'ancient tomb', 'grim monolith',
]

const COMBO_KEYWORDS = [
  'infinite', 'win the game', 'extra turn', 'storm', 'labman',
  'thassa\'s oracle', 'laboratory maniac', 'jace, wielder of mysteries',
]

const DRAW_ENGINES = [
  'rhystic study', 'mystic remora', 'necropotence', 'phyrexian arena',
  'sylvan library', 'timetwister', 'wheel of fortune', 'windfall',
  'brainstorm', 'ponder', 'preordain',
]

const BOARD_WIPES = [
  'wrath of god', 'damnation', 'cyclonic rift', 'blasphemous act',
  'toxic deluge', 'living death', 'farewell', 'austere command',
]

const RAMP_KEYWORDS = [
  'sol ring', 'cultivate', 'kodama\'s reach', 'rampant growth', 'farseek',
  'nature\'s lore', 'three visits', 'land tax', 'skyshroud claim',
  'arcane signet', 'commander\'s sphere', 'fellwar stone',
]

function containsAny(name: string, oracle: string, list: string[]): boolean {
  const combined = (name + ' ' + oracle).toLowerCase()
  return list.some(entry => combined.includes(entry))
}

export function scoreDeck(cards: DeckCard[]): PowerLevelResult {
  const flags: string[] = []
  let score = 3

  const hasTutor = cards.some(dc => containsAny(dc.card.name, dc.card.oracleText, TUTORS))
  const hasFastMana = cards.some(dc => containsAny(dc.card.name, dc.card.oracleText, FAST_MANA))
  const hasComboKeywords = cards.some(dc => containsAny(dc.card.name, dc.card.oracleText, COMBO_KEYWORDS))
  const hasSolRing = cards.some(dc => dc.card.name.toLowerCase() === 'sol ring')
  const hasDrawEngines = cards.filter(dc => containsAny(dc.card.name, dc.card.oracleText, DRAW_ENGINES)).length

  if (hasSolRing) { score += 1; flags.push('Sol Ring') }
  if (hasTutor) { score += 2; flags.push('Tutors') }
  if (hasFastMana) { score += 2; flags.push('Fast mana') }
  if (hasComboKeywords) { score += 2; flags.push('Combo pieces') }
  if (hasDrawEngines >= 2) { score += 1; flags.push('Draw engines') }

  const avgCmc = cards.length
    ? cards.reduce((s, dc) => s + dc.card.cmc * dc.qty, 0) / cards.reduce((s, dc) => s + dc.qty, 0)
    : 0

  if (avgCmc < 2.5) score += 1
  if (avgCmc > 3.5) score -= 1

  const rampCount = cards.filter(dc => containsAny(dc.card.name, dc.card.oracleText, RAMP_KEYWORDS)).length
  const boardWipeCount = cards.filter(dc => containsAny(dc.card.name, dc.card.oracleText, BOARD_WIPES)).length

  if (rampCount >= 10) score += 1
  if (boardWipeCount >= 3) score += 1

  score = Math.max(1, Math.min(10, score))

  const label: PowerLevelResult['label'] =
    score <= 3 ? 'Casual' :
    score <= 6 ? 'Focused' :
    score <= 8 ? 'High Power' : 'cEDH'

  return { score, label, flags }
}

export function countRamp(cards: DeckCard[]): number {
  return cards.filter(dc => containsAny(dc.card.name, dc.card.oracleText, RAMP_KEYWORDS)).length
}

export function countDraw(cards: DeckCard[]): number {
  return cards.filter(dc => containsAny(dc.card.name, dc.card.oracleText, DRAW_ENGINES)).length
}

export function countInteraction(cards: DeckCard[]): number {
  const INTERACTION = ['destroy', 'exile', 'counter', 'remove', 'bounce', 'return target']
  return cards.filter(dc =>
    dc.card.typeLine.toLowerCase().includes('instant') &&
    INTERACTION.some(kw => dc.card.oracleText.toLowerCase().includes(kw))
  ).length
}

export function countBoardWipes(cards: DeckCard[]): number {
  return cards.filter(dc => containsAny(dc.card.name, dc.card.oracleText, BOARD_WIPES)).length
}
