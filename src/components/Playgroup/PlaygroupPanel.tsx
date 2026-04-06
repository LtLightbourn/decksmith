import React, { useState, useEffect, useRef } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { analyzePlaygroup, tuneForPod } from '../../utils/claudeApi'
import { scryfallToCard } from '../../utils/colorIdentity'
import type { ScryfallCard } from '../../types'
import type { PlaygroupAnalysis, SwapSuggestion } from '../../utils/claudeApi'

const SCRYFALL_BASE = '/api/scryfall'

const COLOR_DOTS: Record<string, string> = {
  W: '#d8d0a0', U: '#4a7fbb', B: '#8a60b0', R: '#cc3333', G: '#3a8a3a',
}

function ColorPips({ colors }: { colors: string[] }) {
  if (colors.length === 0) return <span style={{ color: '#8a7a6a', fontSize: 9 }}>◆</span>
  return (
    <div className="flex gap-px">
      {colors.map(c => (
        <div
          key={c}
          className="rounded-full flex-shrink-0"
          style={{ width: 7, height: 7, background: COLOR_DOTS[c] ?? '#8a7a6a' }}
          title={c}
        />
      ))}
    </div>
  )
}

export default function PlaygroupPanel() {
  const {
    playgroup, addPlaygroupCommander, removePlaygroupCommander, clearPlaygroup,
    cards, commander, targetBracket,
  } = useDeckStore()

  const [isOpen, setIsOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; colorIdentity: string[] }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const [analysis, setAnalysis] = useState<PlaygroupAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [swaps, setSwaps] = useState<SwapSuggestion[]>([])
  const [isTuning, setIsTuning] = useState(false)
  const [tuneError, setTuneError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Reset analysis when pod changes
  useEffect(() => {
    setAnalysis(null)
    setAnalyzeError(null)
    setSwaps([])
    setTuneError(null)
  }, [playgroup.length])

  // Debounced Scryfall commander search
  useEffect(() => {
    if (searchTerm.length < 2) { setSuggestions([]); setShowDropdown(false); return }
    const id = setTimeout(async () => {
      setIsSearching(true)
      try {
        const q = `is:commander name:${encodeURIComponent(searchTerm)}`
        const res = await fetch(`${SCRYFALL_BASE}/search?q=${encodeURIComponent(q)}&order=name`)
        if (res.status === 404) { setSuggestions([]); setShowDropdown(false); return }
        if (!res.ok) return
        const data = await res.json() as { data: ScryfallCard[] }
        const results = data.data.slice(0, 6).map(sc => ({
          id: sc.id,
          name: sc.name,
          colorIdentity: sc.color_identity,
        }))
        setSuggestions(results)
        setShowDropdown(true)
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
    return () => clearTimeout(id)
  }, [searchTerm])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSelectCommander(result: { id: string; name: string; colorIdentity: string[] }) {
    // Fetch full card data to get image uri etc.
    try {
      const res = await fetch(`${SCRYFALL_BASE}/cards/${result.id}`)
      if (!res.ok) return
      const sc = await res.json() as ScryfallCard
      addPlaygroupCommander(scryfallToCard(sc))
    } catch {
      // fallback: add with minimal data
      addPlaygroupCommander({
        id: result.id,
        name: result.name,
        colorIdentity: result.colorIdentity,
        manaCost: '',
        cmc: 0,
        typeLine: 'Legendary Creature',
        imageUri: '',
        set: '',
        rarity: '',
        oracleText: '',
      })
    }
    setSearchTerm('')
    setSuggestions([])
    setShowDropdown(false)
  }

  async function handleAnalyze() {
    if (playgroup.length === 0) return
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const names = playgroup.map(c => c.name)
      const result = await analyzePlaygroup(names, playgroup.length >= 3)
      setAnalysis(result)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleTune() {
    if (playgroup.length === 0 || cards.length === 0) return
    setIsTuning(true)
    setTuneError(null)
    try {
      const deckNames = cards.map(dc => dc.card.name)
      const podNames = playgroup.map(c => c.name)
      const result = await tuneForPod(deckNames, commander?.name ?? null, podNames, targetBracket)
      setSwaps(result)
    } catch (err) {
      setTuneError(err instanceof Error ? err.message : 'Tuning failed')
    } finally {
      setIsTuning(false)
    }
  }

  const LABEL: React.CSSProperties = {
    fontSize: 9,
    fontFamily: 'Cinzel, serif',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#7a6a4a',
  }

  const DIVIDER = <div className="gold-line mx-3 my-2" />

  return (
    <div className="border-t" style={{ borderColor: 'rgba(50,42,28,0.5)' }}>
      {/* Section header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center justify-between px-3 py-[5px] w-full border-b"
        style={{ borderColor: 'rgba(50,42,28,0.5)', background: 'rgba(8,6,4,0.4)' }}
      >
        <span className="text-[9px] font-cinzel tracking-[3px] uppercase" style={{ color: '#c9a060' }}>
          ⚔ Your Playgroup
        </span>
        <div className="flex items-center gap-2">
          {playgroup.length > 0 && (
            <span className="text-[8px] font-cinzel" style={{ color: '#6a5e44' }}>
              {playgroup.length}/5
            </span>
          )}
          <span className="text-[10px]" style={{ color: '#5a5040' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div>
          {/* Search input */}
          {playgroup.length < 5 && (
            <div className="px-2 pt-2 pb-1 relative">
              <div className="flex gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Add opponent's commander..."
                  className="flex-1 px-2 py-1 text-[10px] rounded-sm"
                  style={{
                    background: 'rgba(12,8,4,0.8)',
                    border: '1px solid rgba(70,58,36,0.5)',
                    color: '#b8a882',
                    fontFamily: 'Georgia, serif',
                    outline: 'none',
                    minWidth: 0,
                  }}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                />
                {isSearching && (
                  <span className="self-center text-[9px]" style={{ color: '#5a5040', flexShrink: 0 }}>…</span>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-2 right-2 rounded-sm overflow-hidden z-50"
                  style={{
                    top: 'calc(100% - 2px)',
                    background: 'rgba(18,13,8,0.99)',
                    border: '1px solid rgba(100,80,45,0.5)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.9)',
                  }}
                >
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectCommander(s)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-[rgba(180,140,60,0.08)] transition-colors"
                    >
                      <ColorPips colors={s.colorIdentity} />
                      <span className="text-[10px] font-body truncate" style={{ color: '#b0a070' }}>
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Commander list */}
          {playgroup.length > 0 && (
            <div className="px-2 pb-1 space-y-[3px]">
              {playgroup.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
                  style={{ background: 'rgba(25,18,10,0.6)', border: '1px solid rgba(60,48,28,0.4)' }}
                >
                  <ColorPips colors={c.colorIdentity} />
                  <span className="flex-1 truncate text-[10px] font-body" style={{ color: '#a89860' }}>
                    {c.name}
                  </span>
                  <button
                    onClick={() => removePlaygroupCommander(c.id)}
                    className="flex-shrink-0 text-[9px] transition-colors hover:opacity-70"
                    style={{ color: '#6a4040' }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {playgroup.length > 1 && (
                <button
                  onClick={clearPlaygroup}
                  className="text-[8px] font-cinzel uppercase tracking-wide w-full text-right pr-1 pt-0.5"
                  style={{ color: '#5a3a3a' }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {playgroup.length === 0 && (
            <p className="px-3 py-3 text-[10px] font-body italic text-center" style={{ color: '#4a4030' }}>
              Add your opponents' commanders to tailor your build to your pod.
            </p>
          )}

          {/* Threat analysis */}
          {playgroup.length > 0 && (
            <>
              {DIVIDER}
              <div className="px-2 pb-2">
                {!analysis && !isAnalyzing && (
                  <button
                    onClick={handleAnalyze}
                    className="w-full py-1.5 text-[9px] font-cinzel uppercase tracking-widest rounded-sm transition-all hover:opacity-90"
                    style={{
                      background: 'rgba(30,22,10,0.7)',
                      border: '1px solid rgba(100,80,40,0.4)',
                      color: '#a08040',
                    }}
                  >
                    ◈ Analyze Pod Threats
                  </button>
                )}

                {isAnalyzing && (
                  <p className="text-[9px] font-body italic text-center py-2" style={{ color: '#6a5a3a' }}>
                    Merlin reads the battlefield…
                  </p>
                )}

                {analyzeError && (
                  <p className="text-[9px] font-body italic text-center py-1" style={{ color: '#8a3030' }}>
                    {analyzeError}
                  </p>
                )}

                {analysis && (
                  <div className="space-y-2">
                    {/* Threat rows */}
                    <p style={LABEL} className="pt-1">Threats</p>
                    {analysis.threats.map((t, i) => (
                      <div key={i} className="px-2 py-1.5 rounded-sm" style={{ background: 'rgba(20,14,6,0.6)', border: '1px solid rgba(80,50,30,0.3)' }}>
                        <p className="text-[9px] font-cinzel" style={{ color: '#c09050' }}>{t.commander}</p>
                        <p className="text-[9px] font-body italic mt-0.5 leading-snug" style={{ color: '#7a6a4a' }}>{t.description}</p>
                      </div>
                    ))}

                    {/* Suggested interaction */}
                    {analysis.interactions.length > 0 && (
                      <>
                        <p style={{ ...LABEL, paddingTop: 4 }}>Suggested Interaction</p>
                        {analysis.interactions.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span style={{ color: '#5a8a4a', fontSize: 9, marginTop: 1, flexShrink: 0 }}>▸</span>
                            <p className="text-[9px] font-body leading-snug" style={{ color: '#8a7a5a' }}>{item}</p>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Political cards */}
                    {analysis.politicalCards.length > 0 && (
                      <>
                        <p style={{ ...LABEL, paddingTop: 4 }}>Political Cards</p>
                        {analysis.politicalCards.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span style={{ color: '#8a60a0', fontSize: 9, marginTop: 1, flexShrink: 0 }}>◆</span>
                            <p className="text-[9px] font-body leading-snug" style={{ color: '#8a7a5a' }}>{item}</p>
                          </div>
                        ))}
                      </>
                    )}

                    <button
                      onClick={handleAnalyze}
                      className="text-[8px] font-cinzel uppercase tracking-wide w-full text-right pt-1 opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: '#6a5a3a' }}
                    >
                      ↺ Refresh
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tune for My Pod */}
          {playgroup.length > 0 && cards.length > 0 && (
            <>
              {DIVIDER}
              <div className="px-2 pb-3">
                <button
                  onClick={handleTune}
                  disabled={isTuning}
                  className="w-full py-2 text-[9px] font-cinzel uppercase tracking-widest rounded-sm transition-all hover:opacity-90"
                  style={{
                    background: isTuning
                      ? 'rgba(30,15,50,0.5)'
                      : 'linear-gradient(135deg, rgba(60,30,90,0.8), rgba(40,18,65,0.9))',
                    border: '1px solid rgba(140,90,210,0.35)',
                    color: isTuning ? '#6a4a80' : '#b090d8',
                    opacity: isTuning ? 0.7 : 1,
                    cursor: isTuning ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isTuning ? 'Consulting the arcanes…' : '✦ Tune for My Pod'}
                </button>

                {tuneError && (
                  <p className="text-[9px] font-body italic text-center mt-2" style={{ color: '#8a3030' }}>
                    {tuneError}
                  </p>
                )}

                {swaps.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p style={LABEL}>Suggested Swaps</p>
                    {swaps.map((s, i) => (
                      <div
                        key={i}
                        className="px-2 py-2 rounded-sm space-y-1"
                        style={{ background: 'rgba(15,10,5,0.7)', border: '1px solid rgba(70,50,30,0.35)' }}
                      >
                        <div className="flex items-baseline gap-1">
                          <span className="text-[8px] font-cinzel uppercase tracking-wide flex-shrink-0" style={{ color: '#8a3030' }}>Cut</span>
                          <span className="text-[10px] font-body truncate" style={{ color: '#c08070' }}>{s.cut}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[8px] font-cinzel uppercase tracking-wide flex-shrink-0" style={{ color: '#4a8a4a' }}>Add</span>
                          <span className="text-[10px] font-body truncate" style={{ color: '#80c080' }}>{s.add}</span>
                        </div>
                        <p className="text-[8px] font-body italic leading-snug" style={{ color: '#6a5a40' }}>{s.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
