import React, { useState, useMemo } from 'react'
import { BarChart, Bar, Cell, PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { useDeckStore } from '../../store/deckStore'
import { useDeckStats } from '../../hooks/useDeckStats'
import PlaygroupPanel from '../Playgroup/PlaygroupPanel'
import UpgradePanel from './UpgradePanel'
import { ProGate } from '../Auth/ProGate'
import { computeCurrentAudit } from '../../utils/deckValidation'
import { getPriceValue, priceDisplayColor, tcgPlayerUrl, formatPrice } from '../../utils/priceUtils'
import { getBudgetSwaps } from '../../utils/claudeApi'
import type { BudgetSwap } from '../../utils/claudeApi'

type SidebarTab = 'stats' | 'upgrades'

const COLOR_HEX: Record<string, string> = {
  W: '#d8d0a0', U: '#4a7fbb', B: '#8a60b0', R: '#cc3333', G: '#3a8a3a', C: '#8a7a6a',
}
const STATUS_COLOR = { green: '#5a9a5a', yellow: '#a09040', red: '#aa4040' }
const STATUS_ICON  = { green: '✓', yellow: '!', red: '✕' }

const BAR_COLORS = ['#6aaa4a', '#8aaa3a', '#aaaa30', '#c09030', '#c06030', '#aa3030', '#882020']

const COLOR_PIE_COLORS: Record<string, string> = {
  W: '#d8d0a0', U: '#4a7fbb', B: '#8a60b0', R: '#cc3333', G: '#3a8a3a', C: '#8a7a6a',
}

function StatBar({ label, value, max = 10, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  const isLow = value < max * 0.4
  return (
    <div className="px-3 py-1">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-cinzel tracking-widest uppercase" style={{ color: '#7a6a4a' }}>{label}</span>
        <span className="text-[9px] font-cinzel" style={{ color: isLow ? '#cc4444' : '#c9a060' }}>
          {value}{isLow ? ' !' : ''}
        </span>
      </div>
      <div className="h-1 rounded-sm overflow-hidden" style={{ background: 'rgba(30,24,16,0.8)', border: '1px solid rgba(60,50,30,0.3)' }}>
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  )
}

const SECTION_TYPE_MAP: Array<{ label: string; test: (tl: string) => boolean }> = [
  { label: 'Creatures',    test: tl => tl.includes('creature') },
  { label: 'Instants',     test: tl => tl.includes('instant') },
  { label: 'Sorceries',    test: tl => tl.includes('sorcery') },
  { label: 'Enchantments', test: tl => tl.includes('enchantment') },
  { label: 'Artifacts',    test: tl => tl.includes('artifact') },
  { label: 'Planeswalkers',test: tl => tl.includes('planeswalker') },
  { label: 'Lands',        test: tl => tl.includes('land') },
]

export default function AnalyticsSidebar() {
  const { cards, commander, analyticsOpen, setAnalyticsOpen, prices } = useDeckStore()
  const stats = useDeckStats(cards)
  const [activeTab, setActiveTab] = useState<SidebarTab>('stats')
  const [budgetSwaps, setBudgetSwaps] = useState<BudgetSwap[]>([])
  const [swapLoading, setSwapLoading] = useState(false)

  const totalCards = cards.reduce((s, dc) => s + dc.qty, 0)
  const totalWithCommander = totalCards + (commander ? 1 : 0)
  const countOk = totalCards === 99

  const hasDuplicates = useMemo(() => {
    const names = cards.map(dc => dc.card.name.toLowerCase())
    return names.length !== new Set(names).size
  }, [cards])

  const audit = useMemo(
    () => computeCurrentAudit(cards, commander ?? null),
    [cards, commander],
  )

  const curveData = Object.entries(stats.manaCurve).map(([cmc, count]) => ({
    cmc: cmc === '6' ? '6+' : cmc,
    count,
  }))

  const pieData = Object.entries(stats.colorPips)
    .filter(([, v]) => v > 0)
    .map(([color, value]) => ({ name: color, value }))

  const { score, label, flags } = stats.powerLevel

  // Cost breakdown by card type
  const costByType = useMemo(() => {
    return SECTION_TYPE_MAP.map(({ label: sLabel, test }) => {
      const matching = cards.filter(dc => test(dc.card.typeLine.toLowerCase()))
      const total = matching.reduce((sum, dc) => {
        const pd = prices[dc.card.name.toLowerCase()]
        const v = pd ? getPriceValue(pd) : (dc.card.priceUsd ?? null)
        return sum + (v ?? 0) * dc.qty
      }, 0)
      return { label: sLabel, total }
    }).filter(d => d.total > 0)
  }, [cards, prices])

  const costByTypeMax = costByType.length > 0 ? Math.max(...costByType.map(d => d.total)) : 1

  // Top 5 most expensive cards
  const top5 = useMemo(() => {
    return [...cards]
      .map(dc => {
        const pd = prices[dc.card.name.toLowerCase()]
        const v = pd ? getPriceValue(pd) : (dc.card.priceUsd ?? null)
        return { name: dc.card.name, value: v }
      })
      .filter(c => c.value != null && c.value > 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 5) as Array<{ name: string; value: number }>
  }, [cards, prices])

  async function handleBudgetSwaps() {
    if (swapLoading || top5.length === 0) return
    setSwapLoading(true)
    setBudgetSwaps([])
    try {
      const swaps = await getBudgetSwaps(
        top5.map(c => ({ name: c.name, priceUsd: c.value })),
        commander?.name ?? null,
        commander?.colorIdentity ?? [],
        3,
      )
      setBudgetSwaps(swaps)
    } finally {
      setSwapLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col h-full panel-inset border-l"
      style={{ background: 'rgba(10,8,5,0.5)', borderColor: 'rgba(50,42,28,0.5)' }}
    >
      {/* Header */}
      <button
        onClick={() => setAnalyticsOpen(!analyticsOpen)}
        className="flex-shrink-0 flex items-center justify-between px-3 py-[5px] border-b w-full"
        style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(8,6,4,0.4)' }}
      >
        <span className="text-[9px] font-cinzel tracking-[3px] uppercase" style={{ color: '#c9a060' }}>
          ✦ Analytics
        </span>
        <span className="text-[10px]" style={{ color: '#5a5040' }}>{analyticsOpen ? '◀' : '▶'}</span>
      </button>

      {analyticsOpen && (
        <>
        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b" style={{ borderColor: 'rgba(60,50,30,0.5)' }}>
          {(['stats', 'upgrades'] as SidebarTab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-1.5 text-[9px] font-cinzel uppercase tracking-widest"
              style={{
                color: activeTab === t ? '#c9a060' : '#4a4030',
                borderBottom: activeTab === t ? '1px solid #c9a060' : '1px solid transparent',
                background: activeTab === t ? 'rgba(180,140,50,0.05)' : 'transparent',
              }}
            >
              {t === 'stats' ? '◈ Stats' : '✦ Upgrades'}
            </button>
          ))}
        </div>

        {activeTab === 'upgrades' && <UpgradePanel />}

        {activeTab === 'stats' && (
        <div className="flex-1 overflow-y-auto">
          {/* Mana curve — visible to all users */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[9px] font-cinzel tracking-[2px] uppercase mb-2" style={{ color: '#7a6a4a' }}>Mana Curve</p>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={curveData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {curveData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i] ?? '#6a6a6a'} />
                  ))}
                </Bar>
                <Tooltip
                  contentStyle={{ background: '#1a1612', border: '1px solid rgba(120,95,55,0.4)', borderRadius: 2, fontSize: 10, fontFamily: 'Cinzel, serif', color: '#c9a060' }}
                  cursor={{ fill: 'rgba(180,140,60,0.06)' }}
                  formatter={(v) => [v, 'cards']}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-1">
              {curveData.map(d => (
                <span key={d.cmc} className="text-[8px] font-cinzel" style={{ color: '#4a4030' }}>{d.cmc}</span>
              ))}
            </div>
          </div>

          <ProGate
            feature="analytics"
            fallback={
              <div className="px-3 py-3 text-center">
                <p className="text-[8px] font-cinzel uppercase tracking-widest mb-1" style={{ color: '#5a5040' }}>
                  Upgrade for full analytics
                </p>
                <p className="text-[8px] font-body italic" style={{ color: '#6a5e44' }}>
                  Avg CMC · Color pips · Power level · Cost breakdown
                </p>
              </div>
            }
          >

          <div className="gold-line mx-3 my-1" />

          {/* Avg CMC */}
          <div className="px-3 py-1 flex justify-between">
            <span className="text-[9px] font-cinzel tracking-widest uppercase" style={{ color: '#7a6a4a' }}>Avg CMC</span>
            <span className="text-[9px] font-cinzel" style={{ color: '#c9a060' }}>{stats.avgCmc.toFixed(2)}</span>
          </div>

          <div className="gold-line mx-3 my-1" />

          {/* Color distribution pie */}
          {pieData.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[9px] font-cinzel tracking-[2px] uppercase mb-2" style={{ color: '#7a6a4a' }}>Color Pips</p>
              <div className="flex items-center gap-2">
                <PieChart width={60} height={60}>
                  <Pie data={pieData} dataKey="value" cx={28} cy={28} innerRadius={14} outerRadius={28}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={COLOR_PIE_COLORS[entry.name] ?? '#888'} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="flex flex-col gap-1">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLOR_PIE_COLORS[d.name] ?? '#888' }} />
                      <span className="text-[9px] font-cinzel" style={{ color: '#6a5e44' }}>{d.name} {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="gold-line mx-3 my-1" />

          {/* Stat bars */}
          <StatBar label="Ramp" value={stats.rampCount} max={10} color="#4a8a30" />
          <StatBar label="Draw" value={stats.drawCount} max={8} color="#3060a0" />
          <StatBar label="Interaction" value={stats.interactionCount} max={10} color="#6030a0" />
          <StatBar label="Board Wipes" value={stats.boardWipeCount} max={4} color="#a03030" />

          <div className="gold-line mx-3 my-1" />

          {/* Power level */}
          <div className="px-3 py-2">
            <p className="text-[9px] font-cinzel tracking-[2px] uppercase mb-2" style={{ color: '#7a6a4a' }}>Power Level</p>
            <div className="flex items-center gap-3">
              <span
                className="font-cinzel-deco leading-none"
                style={{ fontSize: 32, color: '#c9a060', textShadow: '0 0 14px rgba(200,150,60,0.5)' }}
              >
                {score}
              </span>
              <div>
                <p className="text-[10px] font-cinzel" style={{ color: '#c9a060' }}>{label}</p>
                {flags.length > 0 && (
                  <p className="text-[9px] font-body italic mt-1" style={{ color: '#7a6a4a' }}>
                    {flags.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {cards.length === 0 && (
            <p className="px-3 pb-3 text-[10px] font-body italic text-center" style={{ color: '#4a4030' }}>
              Add cards to see stats
            </p>
          )}

          {/* ── Cost Breakdown ── */}
          {cards.length > 0 && costByType.length > 0 && (
            <>
              <div className="gold-line mx-3 my-1" />
              <div className="px-3 py-2">
                <p className="text-[9px] font-cinzel tracking-[2px] uppercase mb-2" style={{ color: '#7a6a4a' }}>
                  Cost Breakdown
                </p>

                {/* Type cost bars */}
                {costByType.map(({ label: sLabel, total }) => (
                  <div key={sLabel} className="mb-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] font-cinzel uppercase" style={{ color: '#5a5040' }}>{sLabel}</span>
                      <span className="text-[8px] font-body" style={{ color: '#8a7050' }}>${total.toFixed(0)}</span>
                    </div>
                    <div className="h-[3px] rounded-sm overflow-hidden" style={{ background: 'rgba(30,24,16,0.8)' }}>
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${(total / costByTypeMax) * 100}%`,
                          background: 'linear-gradient(90deg, rgba(180,140,50,0.4), rgba(180,140,50,0.7))',
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* Top 5 expensive */}
                {top5.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[8px] font-cinzel uppercase tracking-widest mb-1" style={{ color: '#5a5040' }}>
                      Most Expensive
                    </p>
                    {top5.map(c => (
                      <div key={c.name} className="flex items-center justify-between py-[2px]">
                        <a
                          href={tcgPlayerUrl(c.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] font-body truncate flex-1 mr-1 hover:underline"
                          style={{ color: '#8a7a5a' }}
                        >
                          {c.name}
                        </a>
                        <span className="text-[8px] font-body flex-shrink-0" style={{ color: priceDisplayColor(c.value) }}>
                          {formatPrice(c.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budget Swaps button */}
                <button
                  onClick={handleBudgetSwaps}
                  disabled={swapLoading || top5.length === 0}
                  className="mt-2 w-full text-[8px] font-cinzel uppercase tracking-widest py-1 rounded-sm transition-all"
                  style={{
                    background: swapLoading ? 'rgba(20,15,8,0.5)' : 'rgba(30,22,10,0.6)',
                    border: '1px solid rgba(100,80,40,0.35)',
                    color: swapLoading ? '#4a4030' : '#8a7040',
                    cursor: swapLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {swapLoading ? '…finding swaps' : '⇄ Budget Swaps'}
                </button>

                {/* Budget swap results */}
                {budgetSwaps.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {budgetSwaps.map((swap, i) => (
                      <div key={i} className="rounded-sm p-1.5" style={{ background: 'rgba(20,16,8,0.5)', border: '1px solid rgba(60,50,30,0.3)' }}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[7px] font-body truncate" style={{ color: '#7a5a5a' }}>
                            – {swap.cut}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[7px] font-body truncate" style={{ color: '#5a7a5a' }}>
                            + {swap.add}
                          </span>
                        </div>
                        <p className="text-[7px] font-body italic mt-0.5" style={{ color: '#5a5040' }}>
                          {swap.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Deck Health ── */}
          {cards.length > 0 && (
            <>
              <div className="gold-line mx-3 my-1" />
              <div className="px-3 py-2">
                <p className="text-[9px] font-cinzel tracking-[2px] uppercase mb-2" style={{ color: '#7a6a4a' }}>
                  Deck Health
                </p>

                {/* Card count */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-cinzel uppercase" style={{ color: '#6a5e44' }}>
                    Card Count
                  </span>
                  <span
                    className="text-[8px] font-cinzel"
                    style={{ color: countOk ? STATUS_COLOR.green : STATUS_COLOR.red }}
                  >
                    {STATUS_ICON[countOk ? 'green' : 'red']} {totalWithCommander}/100
                  </span>
                </div>

                {/* Duplicate check */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-cinzel uppercase" style={{ color: '#6a5e44' }}>
                    Duplicates
                  </span>
                  <span
                    className="text-[8px] font-cinzel"
                    style={{ color: hasDuplicates ? STATUS_COLOR.red : STATUS_COLOR.green }}
                  >
                    {hasDuplicates ? '✕ Found' : '✓ Clean'}
                  </span>
                </div>

                {/* Mana base by color */}
                {audit.entries.length > 0 && (
                  <div
                    className="rounded-sm overflow-hidden"
                    style={{ border: '1px solid rgba(50,40,24,0.35)' }}
                  >
                    {audit.entries.map(entry => (
                      <div
                        key={entry.color}
                        className="flex items-center gap-1.5 px-2 py-1 border-b"
                        style={{ borderColor: 'rgba(40,32,18,0.3)' }}
                      >
                        {/* Color pip */}
                        <div
                          className="w-2 h-2 rounded-sm flex-shrink-0"
                          style={{ background: COLOR_HEX[entry.color] ?? '#888' }}
                        />
                        <span className="text-[8px] font-cinzel flex-shrink-0 w-3" style={{ color: COLOR_HEX[entry.color] ?? '#888' }}>
                          {entry.color}
                        </span>
                        {/* Pip / source counts */}
                        <span className="flex-1 text-[7px] font-body text-right" style={{ color: '#5a5040' }}>
                          {entry.pipCount} cards / {entry.sourceCount} src
                        </span>
                        {/* Status dot */}
                        <span
                          className="flex-shrink-0 text-[8px] font-cinzel w-3 text-center"
                          style={{ color: STATUS_COLOR[entry.status] }}
                          title={entry.status === 'green' ? 'Healthy mana base' : entry.status === 'yellow' ? 'Borderline — consider adding more sources' : 'Undersupported — few sources for required color'}
                        >
                          {STATUS_ICON[entry.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {audit.entries.length === 0 && (
                  <p className="text-[8px] font-body italic" style={{ color: '#4a3a28' }}>
                    Set a commander to see mana health.
                  </p>
                )}
              </div>
            </>
          )}

          </ProGate>

          <PlaygroupPanel />
        </div>
        )}
        </>
      )}
    </div>
  )
}
