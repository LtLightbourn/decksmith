import { useMemo } from 'react'
import type { DeckCard, DeckStats } from '../types'
import { scoreDeck, countRamp, countDraw, countInteraction, countBoardWipes } from '../utils/powerLevel'

export function useDeckStats(cards: DeckCard[]): DeckStats {
  return useMemo(() => {
    const totalCards = cards.reduce((s, dc) => s + dc.qty, 0)

    // Mana curve (cmc 0–6+)
    const manaCurve: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const dc of cards) {
      const bucket = Math.min(dc.card.cmc, 6)
      manaCurve[bucket] = (manaCurve[bucket] ?? 0) + dc.qty
    }

    // Color pip distribution
    const colorPips: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
    for (const dc of cards) {
      const cost = dc.card.manaCost
      for (const c of ['W', 'U', 'B', 'R', 'G']) {
        const count = (cost.match(new RegExp(`{${c}}`, 'g')) ?? []).length
        colorPips[c] = (colorPips[c] ?? 0) + count * dc.qty
      }
    }

    // Type breakdown
    const typeBreakdown: Record<string, number> = {
      Creatures: 0, Instants: 0, Sorceries: 0,
      Enchantments: 0, Artifacts: 0, Planeswalkers: 0, Lands: 0, Other: 0,
    }
    for (const dc of cards) {
      const tl = dc.card.typeLine.toLowerCase()
      if (tl.includes('creature')) typeBreakdown.Creatures += dc.qty
      else if (tl.includes('instant')) typeBreakdown.Instants += dc.qty
      else if (tl.includes('sorcery')) typeBreakdown.Sorceries += dc.qty
      else if (tl.includes('enchantment')) typeBreakdown.Enchantments += dc.qty
      else if (tl.includes('artifact')) typeBreakdown.Artifacts += dc.qty
      else if (tl.includes('planeswalker')) typeBreakdown.Planeswalkers += dc.qty
      else if (tl.includes('land')) typeBreakdown.Lands += dc.qty
      else typeBreakdown.Other += dc.qty
    }

    const nonLandCards = cards.filter(dc => !dc.card.typeLine.toLowerCase().includes('land'))
    const avgCmc = nonLandCards.length
      ? nonLandCards.reduce((s, dc) => s + dc.card.cmc * dc.qty, 0) /
        nonLandCards.reduce((s, dc) => s + dc.qty, 0)
      : 0

    return {
      totalCards,
      manaCurve,
      colorPips,
      typeBreakdown,
      avgCmc,
      rampCount: countRamp(cards),
      drawCount: countDraw(cards),
      interactionCount: countInteraction(cards),
      boardWipeCount: countBoardWipes(cards),
      powerLevel: scoreDeck(cards),
    }
  }, [cards])
}
