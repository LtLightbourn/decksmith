import type { PlaystyleAnswers } from '../types'

// ── Human-readable labels for each answer value ──────────────────────────

const WIN_LABELS: Record<string, string> = {
  creatures:  'creature combat',
  combo:      'combo finish',
  control:    'board control',
  fun:        'whatever is most interesting',
}

const INTERACTION_LABELS: Record<string, string> = {
  reactive:   'reactive (answers threats as they appear)',
  proactive:  'proactive (shuts down dangerous players early)',
  focused:    'focused on own gameplan (ignores others)',
  political:  'political (deals, negotiations, group decisions)',
}

const LENGTH_LABELS: Record<string, string> = {
  fast:       'fast games (turns 6-8)',
  medium:     'medium games (turns 10-13)',
  long:       'long grindy games (15+ turns)',
  decisions:  'games with interesting decisions every turn (any length)',
}

const NEVER_LABELS: Record<string, string> = {
  combo:       'winning out of nowhere with an infinite combo',
  stax:        'locking other players out of the game',
  extraturns:  'taking extra turns',
  oppressive:  'making another player feel like they cannot play',
}

// ── Hard constraints from neverDo ─────────────────────────────────────────

export function getHardConstraints(answers: PlaystyleAnswers): string[] {
  switch (answers.neverDo) {
    case 'combo':       return ['never suggest infinite combos, instant-win 2-card combos, or Laboratory Maniac-style win conditions']
    case 'stax':        return ['never suggest stax pieces that prevent opponents from playing (Winter Orb, Stasis, Sphere of Resistance, Trinisphere, etc.)']
    case 'extraturns':  return ['never suggest extra turn spells (Time Warp, Nexus of Fate, Temporal Manipulation, etc.)']
    case 'oppressive':  return ['avoid cards that make players feel unable to play — no hard locks, no mass land destruction, no "you can\'t cast spells" effects']
  }
}

// ── Profile label (the 2-word badge) ──────────────────────────────────────

export function generateProfileLabel(answers: PlaystyleAnswers): string {
  const { winCondition, interaction, gameLength } = answers

  if (interaction === 'political') {
    if (winCondition === 'creatures') return 'Political Aggro'
    if (winCondition === 'control')   return 'Political Controller'
    if (gameLength === 'long')        return 'Political Grinder'
    return 'Political Midrange'
  }

  if (winCondition === 'combo') {
    if (interaction === 'focused')   return 'Glass Cannon'
    return 'Combo Spike'
  }

  if (winCondition === 'creatures') {
    if (gameLength === 'fast')       return 'Fair Aggro'
    if (gameLength === 'long')       return 'Stompy Grinder'
    return 'Stompy Midrange'
  }

  if (winCondition === 'control') {
    if (gameLength === 'long')       return 'Control Grinder'
    if (interaction === 'proactive') return 'Proactive Controller'
    return 'Board Controller'
  }

  // 'fun' win condition
  if (gameLength === 'decisions')    return 'Brew Aficionado'
  if (gameLength === 'long')         return 'Value Grinder'
  if (interaction === 'reactive')    return 'Reactive Brewer'
  return 'Balanced Builder'
}

// ── Full AI guidance block ────────────────────────────────────────────────

export function playstyleGuidance(answers: PlaystyleAnswers | null): string {
  if (!answers) return ''

  const constraints = getHardConstraints(answers)
  const label = generateProfileLabel(answers)

  return `PLAYER PLAYSTYLE PROFILE (${label}):
- Preferred win condition: ${WIN_LABELS[answers.winCondition]}
- Interaction style: ${INTERACTION_LABELS[answers.interaction]}
- Preferred game length: ${LENGTH_LABELS[answers.gameLength]}
HARD CONSTRAINTS — the player has explicitly said they never want these — do NOT suggest them under any circumstances:
- ${constraints[0]}
When making suggestions, reference the playstyle. For example: "Since you prefer ${INTERACTION_LABELS[answers.interaction].split(' (')[0]}, I'd suggest X over Y here."`
}
