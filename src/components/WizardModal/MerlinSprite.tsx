import React from 'react'

type OrbState = 'idle' | 'loading' | 'success' | 'error'

interface Props { orbState: OrbState; size?: number }

export default function MerlinSprite({ orbState, size = 1 }: Props) {
  const s = (n: number) => n * size

  const orbAnimation =
    orbState === 'idle' ? 'animate-orbPulse' :
    orbState === 'loading' ? 'animate-orbCycle' :
    ''

  const orbBg =
    orbState === 'idle' ? 'radial-gradient(circle at 35% 30%, #c0a0ff, #6020c0)' :
    orbState === 'success' ? 'radial-gradient(circle at 35% 30%, #ffe060, #c08020)' :
    orbState === 'error' ? 'radial-gradient(circle at 35% 30%, #ff8080, #800020)' :
    'radial-gradient(circle at 35% 30%, #c0a0ff, #6020c0)'

  const orbShadow =
    orbState === 'success' ? '0 0 16px rgba(240,200,60,1), 0 0 30px rgba(200,160,40,0.6)' :
    orbState === 'error' ? '0 0 16px rgba(255,80,80,0.9)' : ''

  return (
    <div className="relative inline-block" style={{ width: s(56), height: s(70) }}>
      {/* Hat */}
      <div className="absolute" style={{
        left: '50%', transform: 'translateX(-50%)',
        top: 0, width: 0, height: 0,
        borderLeft: `${s(14)}px solid transparent`,
        borderRight: `${s(14)}px solid transparent`,
        borderBottom: `${s(28)}px solid #3a2860`,
        filter: 'drop-shadow(0 0 6px rgba(140,80,220,0.35))',
      }} />
      {/* Hat brim */}
      <div className="absolute" style={{
        top: s(24), left: '50%', transform: 'translateX(-50%)',
        width: s(32), height: s(7),
        background: '#4a3878', borderRadius: 2,
      }} />
      {/* Hat star */}
      <span className="absolute" style={{
        top: s(5), left: '50%', transform: 'translateX(-50%)',
        color: '#f0d060', fontSize: s(9),
        textShadow: '0 0 6px rgba(240,200,60,0.8)',
      }}>★</span>

      {/* Face */}
      <div className="absolute" style={{
        top: s(30), left: '50%', transform: 'translateX(-50%)',
        width: s(22), height: s(18),
        background: '#d4a878', borderRadius: `${s(4)}px ${s(4)}px ${s(6)}px ${s(6)}px`,
      }} />
      {/* Left eye */}
      <div className="absolute" style={{
        top: s(35), left: `calc(50% - ${s(7)}px)`,
        width: s(4), height: s(4),
        background: '#8040ff', borderRadius: '50%',
        boxShadow: `0 0 ${s(4)}px rgba(140,60,255,0.9)`,
      }} />
      {/* Right eye */}
      <div className="absolute" style={{
        top: s(35), left: `calc(50% + ${s(3)}px)`,
        width: s(4), height: s(4),
        background: '#8040ff', borderRadius: '50%',
        boxShadow: `0 0 ${s(4)}px rgba(140,60,255,0.9)`,
      }} />

      {/* Beard */}
      <div className="absolute" style={{
        top: s(44), left: '50%', transform: 'translateX(-50%)',
        width: s(18), height: s(12),
        background: 'linear-gradient(180deg, #e8e0d0, #c8c0b0)',
        borderRadius: `${s(2)}px ${s(2)}px ${s(8)}px ${s(8)}px`,
      }} />

      {/* Robe */}
      <div className="absolute" style={{
        top: s(48), left: '50%', transform: 'translateX(-50%)',
        width: s(36), height: s(24),
        background: 'linear-gradient(180deg, #3a2860, #2a1848)',
        borderRadius: `${s(4)}px ${s(4)}px ${s(8)}px ${s(8)}px`,
      }} />
      {/* Robe star */}
      <span className="absolute" style={{
        top: s(53), left: '50%', transform: 'translateX(-50%)',
        color: '#f0d060', fontSize: s(7),
        textShadow: '0 0 4px rgba(240,200,60,0.7)',
      }}>✦</span>

      {/* Staff */}
      <div className="absolute" style={{
        right: s(3), top: s(30), width: s(3), height: s(38),
        background: 'linear-gradient(180deg, #8a6a30, #6a4a20)',
        borderRadius: s(2),
      }} />

      {/* Orb */}
      <div
        className={`absolute ${orbAnimation}`}
        style={{
          right: 0, top: s(26),
          width: s(9), height: s(9),
          background: orbBg,
          borderRadius: '50%',
          boxShadow: orbShadow || `0 0 ${s(8)}px rgba(140,60,255,0.8)`,
          transition: 'background 0.5s ease, box-shadow 0.5s ease',
        }}
      />
    </div>
  )
}
