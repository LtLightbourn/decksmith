import React, { useState } from 'react'
import { useDeckStore } from '../../store/deckStore'
import { exportDeck, parseImportText } from '../../utils/deckParser'
import { fetchCardsByNames } from '../../hooks/useScryfall'

interface Props { onClose: () => void }

export default function ImportExportModal({ onClose }: Props) {
  const { commander, cards, loadDeckCards, addToast } = useDeckStore()
  const [mode, setMode] = useState<'export' | 'import'>('export')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const exportText = exportDeck(commander, cards)

  async function handleCopy() {
    await navigator.clipboard.writeText(exportText)
    addToast('Decklist copied to clipboard', 'success')
  }

  async function handleImport() {
    const names = parseImportText(importText)
    if (names.length === 0) {
      addToast('No card names found in paste', 'warning')
      return
    }
    setImporting(true)
    setErrors([])
    const { found, notFound } = await fetchCardsByNames(names)
    setImporting(false)

    if (notFound.length > 0) setErrors(notFound)
    const deckCards = found.map(c => ({ card: c, qty: 1 }))
    loadDeckCards(null, deckCards)
    addToast(`Imported ${found.length} cards`, 'success')
    if (notFound.length === 0) onClose()
  }

  const INPUT_STYLE = {
    background: 'rgba(10,8,4,0.8)',
    border: '1px solid rgba(70,58,36,0.5)',
    color: '#b0a070',
    fontFamily: 'monospace',
    fontSize: 11,
    outline: 'none',
    padding: '8px 10px',
    width: '100%',
    borderRadius: 2,
    resize: 'vertical' as const,
    minHeight: 200,
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="stone-bg relative"
        style={{ maxWidth: 480, width: '90vw', background: 'rgba(20,14,8,0.97)', border: '1px solid rgba(120,95,55,0.5)', borderRadius: 4, boxShadow: '0 0 60px rgba(0,0,0,0.95)' }}
      >
        <div className="iron-tl" /><div className="iron-tr" />
        <div className="iron-bl" /><div className="iron-br" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(80,65,40,0.4)' }}>
          <span className="font-cinzel text-[11px] tracking-[3px] uppercase" style={{ color: '#c9a060' }}>✦ Import / Export</span>
          <button onClick={onClose} style={{ color: '#5a5040', fontSize: 14 }}>✕</button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(60,50,30,0.4)' }}>
          {(['export', 'import'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 text-[10px] font-cinzel uppercase tracking-widest"
              style={{
                color: mode === m ? '#c9a060' : '#5a5040',
                borderBottom: mode === m ? '1px solid #c9a060' : '1px solid transparent',
                background: mode === m ? 'rgba(180,140,50,0.06)' : 'transparent',
              }}
            >{m}</button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {mode === 'export' ? (
            <>
              <textarea readOnly value={exportText} style={INPUT_STYLE} />
              <button
                onClick={handleCopy}
                className="w-full py-2 text-[10px] font-cinzel uppercase tracking-widest"
                style={{ background: 'rgba(30,44,18,0.8)', border: '1px solid rgba(70,110,40,0.4)', color: '#80b060', borderRadius: 2 }}
              >
                ✦ Copy to Clipboard
              </button>
            </>
          ) : (
            <>
              <p className="text-[10px] font-body italic" style={{ color: '#6a5e44' }}>
                Paste a decklist in MTGO/Moxfield format (e.g. "1 Sol Ring")
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={'1 Sol Ring\n1 Arcane Signet\n...'}
                style={INPUT_STYLE}
              />
              {errors.length > 0 && (
                <div>
                  <p className="text-[9px] font-cinzel uppercase tracking-widest mb-1" style={{ color: '#cc4444' }}>
                    Cards not found ({errors.length}):
                  </p>
                  <p className="text-[10px] font-body italic" style={{ color: '#7a4040' }}>
                    {errors.slice(0, 10).join(', ')}{errors.length > 10 ? '...' : ''}
                  </p>
                </div>
              )}
              <button
                onClick={handleImport}
                disabled={importing || !importText.trim()}
                className="w-full py-2 text-[10px] font-cinzel uppercase tracking-widest"
                style={{
                  background: 'rgba(60,40,90,0.8)', border: '1px solid rgba(140,100,200,0.4)',
                  color: '#c0a0f0', borderRadius: 2,
                  opacity: importing || !importText.trim() ? 0.5 : 1,
                  cursor: importing || !importText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? 'Fetching cards...' : '✦ Import Deck'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
