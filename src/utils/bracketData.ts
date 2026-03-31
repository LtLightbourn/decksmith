// ── Command Zone Bracket System — Card Flag Data ─────────────────────────
// Bracket 4 = cEDH (these cards push a deck to full competitive)
// Bracket 3 = Powered (these cards push past casual/focused)
//
// Each entry is a lowercase exact card name OR an oracle text substring.
// Edit this file freely to keep up with new printings / bracket updates.

export type FlagCategory =
  | 'Fast Mana'
  | 'Optimal Tutor'
  | 'Budget Tutor'
  | 'Extra Turn'
  | 'Free Spell'
  | 'Draw Engine'
  | 'Mass Land Destruction'
  | 'Infinite Combo'
  | 'Stax'
  | 'Broken Combo'

export interface BracketFlag {
  cardName: string   // lowercase
  category: FlagCategory
  minBracket: 3 | 4
  tooltip: string
}

// ── Bracket 4 card names ────────────────────────────────────────────────

export const BRACKET_4_FLAGS: BracketFlag[] = [
  // Fast Mana
  { cardName: 'mana crypt',          category: 'Fast Mana',       minBracket: 4, tooltip: 'Free mana — cEDH staple' },
  { cardName: 'mox diamond',         category: 'Fast Mana',       minBracket: 4, tooltip: 'Free mana artifact' },
  { cardName: 'chrome mox',          category: 'Fast Mana',       minBracket: 4, tooltip: 'Free mana artifact' },
  { cardName: 'mox opal',            category: 'Fast Mana',       minBracket: 4, tooltip: 'Free mana artifact' },
  { cardName: 'jeweled lotus',       category: 'Fast Mana',       minBracket: 4, tooltip: 'Free commander mana' },
  { cardName: 'lotus petal',         category: 'Fast Mana',       minBracket: 4, tooltip: 'Free mana artifact' },
  { cardName: 'black lotus',         category: 'Fast Mana',       minBracket: 4, tooltip: 'Power 9 — unrestricted fast mana' },
  { cardName: "lion's eye diamond",  category: 'Fast Mana',       minBracket: 4, tooltip: 'Free mana artifact' },
  { cardName: 'grim monolith',       category: 'Fast Mana',       minBracket: 4, tooltip: 'Fast colorless mana' },
  { cardName: 'mana vault',          category: 'Fast Mana',       minBracket: 4, tooltip: 'Fast colorless mana' },
  { cardName: "mishra's workshop",   category: 'Fast Mana',       minBracket: 4, tooltip: 'Artifact fast mana land' },
  { cardName: 'ancient tomb',        category: 'Fast Mana',       minBracket: 4, tooltip: 'Fast colorless mana land' },

  // Optimal Tutors
  { cardName: 'demonic tutor',       category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Best black tutor — any card' },
  { cardName: 'vampiric tutor',      category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Instant speed top-of-library tutor' },
  { cardName: 'imperial seal',       category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Sorcery Vampiric Tutor' },
  { cardName: 'enlightened tutor',   category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Instant artifact/enchantment tutor' },
  { cardName: 'mystical tutor',      category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Instant instant/sorcery tutor' },
  { cardName: 'sylvan tutor',        category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Sorcery creature tutor' },
  { cardName: 'personal tutor',      category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Sorcery top-of-library tutor' },
  { cardName: 'tainted pact',        category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Exile tutor / Oracle combo piece' },
  { cardName: 'beseech the mirror',  category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Pay-life any card tutor' },
  { cardName: "lim-dûl's vault",     category: 'Optimal Tutor',   minBracket: 4, tooltip: 'Instant any card tutor' },
  { cardName: 'demonic consultation', category: 'Optimal Tutor',  minBracket: 4, tooltip: 'Oracle combo piece' },

  // Extra Turns
  { cardName: 'time walk',           category: 'Extra Turn',      minBracket: 4, tooltip: 'Power 9 extra turn' },
  { cardName: 'temporal manipulation', category: 'Extra Turn',    minBracket: 4, tooltip: 'Extra turn spell' },
  { cardName: 'capture of jingzhou', category: 'Extra Turn',      minBracket: 4, tooltip: 'Extra turn spell' },
  { cardName: 'temporal mastery',    category: 'Extra Turn',      minBracket: 4, tooltip: 'Extra turn spell' },
  { cardName: 'time warp',           category: 'Extra Turn',      minBracket: 4, tooltip: 'Extra turn spell' },
  { cardName: 'nexus of fate',       category: 'Extra Turn',      minBracket: 4, tooltip: 'Shuffles back — infinite turns' },
  { cardName: 'walk the aeons',      category: 'Extra Turn',      minBracket: 4, tooltip: 'Extra turn spell' },
  { cardName: 'savor the moment',    category: 'Extra Turn',      minBracket: 4, tooltip: 'Extra turn spell' },

  // Free Counterspells / Interaction
  { cardName: 'force of will',       category: 'Free Spell',      minBracket: 4, tooltip: 'Free counterspell — cEDH staple' },
  { cardName: 'force of negation',   category: 'Free Spell',      minBracket: 4, tooltip: 'Free counterspell' },
  { cardName: 'mana drain',          category: 'Free Spell',      minBracket: 4, tooltip: 'Counterspell that adds mana' },
  { cardName: 'fierce guardianship', category: 'Free Spell',      minBracket: 4, tooltip: 'Free commander protection' },
  { cardName: 'deflecting swat',     category: 'Free Spell',      minBracket: 4, tooltip: 'Free spell redirect' },
  { cardName: 'pact of negation',    category: 'Free Spell',      minBracket: 4, tooltip: 'Free win-the-turn counter' },

  // Broken Combo Pieces
  { cardName: "thassa's oracle",     category: 'Broken Combo',    minBracket: 4, tooltip: '2-card win with Consultation/Pact' },
  { cardName: 'underworld breach',   category: 'Broken Combo',    minBracket: 4, tooltip: 'Graveyard loop engine' },
  { cardName: 'dockside extortionist', category: 'Broken Combo',  minBracket: 4, tooltip: 'Explosive mana generation' },
  { cardName: 'isochron scepter',    category: 'Broken Combo',    minBracket: 4, tooltip: 'Infinite mana with Dramatic Reversal' },
  { cardName: 'dramatic reversal',   category: 'Broken Combo',    minBracket: 4, tooltip: 'Infinite mana with Isochron Scepter' },
  { cardName: 'flash',               category: 'Broken Combo',    minBracket: 4, tooltip: 'Flash Hulk enabler' },
  { cardName: 'protean hulk',        category: 'Broken Combo',    minBracket: 4, tooltip: 'Flash Hulk win condition' },
]

// ── Bracket 3 card names ────────────────────────────────────────────────

export const BRACKET_3_FLAGS: BracketFlag[] = [
  // Budget Tutors (powerful but not optimal)
  { cardName: 'diabolic tutor',      category: 'Budget Tutor',    minBracket: 3, tooltip: 'Unconditional sorcery tutor' },
  { cardName: 'grim tutor',          category: 'Budget Tutor',    minBracket: 3, tooltip: 'Any card tutor at life cost' },
  { cardName: 'diabolic intent',     category: 'Budget Tutor',    minBracket: 3, tooltip: 'Sacrifice tutor' },
  { cardName: 'increasing ambition', category: 'Budget Tutor',    minBracket: 3, tooltip: 'Sorcery any card tutor' },
  { cardName: 'profane tutor',       category: 'Budget Tutor',    minBracket: 3, tooltip: 'Suspend tutor' },
  { cardName: "mastermind's acquisition", category: 'Budget Tutor', minBracket: 3, tooltip: 'Any card tutor' },
  { cardName: 'dark petition',       category: 'Budget Tutor',    minBracket: 3, tooltip: 'Sorcery tutor with spell mastery' },
  { cardName: 'wishclaw talisman',   category: 'Budget Tutor',    minBracket: 3, tooltip: 'Repeatable any card tutor' },
  { cardName: 'solve the equation',  category: 'Budget Tutor',    minBracket: 3, tooltip: 'Instant or sorcery tutor' },
  { cardName: 'long-term plans',     category: 'Budget Tutor',    minBracket: 3, tooltip: 'Instant top-of-library tutor' },
  { cardName: 'worldly tutor',       category: 'Budget Tutor',    minBracket: 3, tooltip: 'Creature tutor' },

  // Strong Draw Engines
  { cardName: 'rhystic study',       category: 'Draw Engine',     minBracket: 3, tooltip: 'Taxes opponent mana for card draw' },
  { cardName: 'mystic remora',       category: 'Draw Engine',     minBracket: 3, tooltip: 'Draw engine vs non-creature spells' },
  { cardName: 'necropotence',        category: 'Draw Engine',     minBracket: 3, tooltip: 'Pay life for cards — very powerful' },
  { cardName: 'sylvan library',      category: 'Draw Engine',     minBracket: 3, tooltip: 'Top-of-library manipulation' },
  { cardName: 'consecrated sphinx',  category: 'Draw Engine',     minBracket: 3, tooltip: 'Doubles opponents\' draw triggers' },
  { cardName: 'smothering tithe',    category: 'Draw Engine',     minBracket: 3, tooltip: 'Generates treasure from opponent draws' },
  { cardName: 'phyrexian arena',     category: 'Draw Engine',     minBracket: 3, tooltip: 'Steady card draw at life cost' },

  // Mass Land Destruction
  { cardName: 'armageddon',          category: 'Mass Land Destruction', minBracket: 3, tooltip: 'Destroys all lands' },
  { cardName: 'ravages of war',      category: 'Mass Land Destruction', minBracket: 3, tooltip: 'Destroys all lands' },
  { cardName: 'catastrophe',         category: 'Mass Land Destruction', minBracket: 3, tooltip: 'Choose lands or creatures' },
  { cardName: 'jokulhaups',          category: 'Mass Land Destruction', minBracket: 3, tooltip: 'Destroys all permanents' },
  { cardName: 'obliterate',          category: 'Mass Land Destruction', minBracket: 3, tooltip: 'Uncounterable board + land wipe' },
  { cardName: 'apocalypse',          category: 'Mass Land Destruction', minBracket: 3, tooltip: 'Destroys all permanents' },

  // Infinite Combo (2-card or simple loops)
  { cardName: 'strionic resonator',  category: 'Infinite Combo',  minBracket: 3, tooltip: 'Combo with mana rocks for infinite' },
  { cardName: 'basalt monolith',     category: 'Infinite Combo',  minBracket: 3, tooltip: 'Infinite colorless mana combo' },
  { cardName: 'power artifact',      category: 'Infinite Combo',  minBracket: 3, tooltip: 'Infinite mana with Grim Monolith/Basalt' },
  { cardName: 'time sieve',          category: 'Infinite Combo',  minBracket: 3, tooltip: 'Infinite turns with artifact tokens' },
  { cardName: 'thopter foundry',     category: 'Infinite Combo',  minBracket: 3, tooltip: 'Thopter Sword infinite combo' },
  { cardName: 'sword of the meek',   category: 'Infinite Combo',  minBracket: 3, tooltip: 'Thopter Sword infinite combo' },

  // Stax
  { cardName: "winter orb",          category: 'Stax',            minBracket: 3, tooltip: 'Hard lock on untap' },
  { cardName: "static orb",          category: 'Stax',            minBracket: 3, tooltip: 'Hard lock on untap' },
  { cardName: "stasis",              category: 'Stax',            minBracket: 3, tooltip: 'Hard skip untap step' },
  { cardName: "smokestacks",         category: 'Stax',            minBracket: 3, tooltip: 'Sacrifice stax engine' },
  { cardName: "trinisphere",         category: 'Stax',            minBracket: 3, tooltip: 'Tax all spells to 3 mana' },
  { cardName: "sphere of resistance", category: 'Stax',           minBracket: 3, tooltip: 'Tax all spells +1 mana' },
  { cardName: "thorn of amethyst",   category: 'Stax',            minBracket: 3, tooltip: 'Tax noncreature spells' },
  { cardName: "collector ouphe",     category: 'Stax',            minBracket: 3, tooltip: 'Shuts off artifact activated abilities' },
  { cardName: "null rod",            category: 'Stax',            minBracket: 3, tooltip: 'Shuts off artifact activated abilities' },
]

// ── Oracle text patterns that flag bracket violations ────────────────────
// These catch cards by their effect text rather than name.

export interface OracleFlag {
  pattern: RegExp
  category: FlagCategory
  minBracket: 3 | 4
  tooltip: string
}

export const ORACLE_FLAGS: OracleFlag[] = [
  // Extra turn oracle text (catches all extra turn spells)
  {
    pattern: /take an extra turn/i,
    category: 'Extra Turn',
    minBracket: 4,
    tooltip: 'Extra turn spell',
  },
]

// ── Build lookup map for O(1) name checks ────────────────────────────────

const _flagMap = new Map<string, BracketFlag>()
for (const f of [...BRACKET_4_FLAGS, ...BRACKET_3_FLAGS]) {
  _flagMap.set(f.cardName.toLowerCase(), f)
}

export function getFlagForCard(cardName: string, oracleText: string): BracketFlag | null {
  // Exact name match
  const nameLower = cardName.toLowerCase()
  const nameFlag = _flagMap.get(nameLower)
  if (nameFlag) return nameFlag

  // Oracle text pattern match
  for (const of_ of ORACLE_FLAGS) {
    if (of_.pattern.test(oracleText)) {
      return {
        cardName: nameLower,
        category: of_.category,
        minBracket: of_.minBracket,
        tooltip: of_.tooltip,
      }
    }
  }

  return null
}

export type Bracket = 1 | 2 | 3 | 4

export const BRACKET_LABELS: Record<Bracket, { name: string; desc: string; color: string }> = {
  1: { name: 'Exhibition', desc: 'Precons, no synergy',          color: '#6a9a6a' },
  2: { name: 'Core',       desc: 'Upgraded precons, casual',     color: '#7a9a5a' },
  3: { name: 'Powered',    desc: 'Optimized, synergistic',       color: '#b87a30' },
  4: { name: 'cEDH',       desc: 'Maximum power, competitive',   color: '#c04040' },
}
