import React, { useRef, useState, useEffect } from 'react'
import type { Card } from '../../types'

interface Props {
  card: Card
  children: React.ReactNode
}

export default function CardPreview({ card, children }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [isTouch, setIsTouch] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  function show() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const IMG_W = 200
    const IMG_H = 280

    let left = rect.right + 8
    let top = rect.top

    if (left + IMG_W > window.innerWidth - 8) left = rect.left - IMG_W - 8
    if (top + IMG_H > window.innerHeight - 8) top = window.innerHeight - IMG_H - 8
    if (top < 8) top = 8

    setPos({ top, left })
    setVisible(true)
  }

  function hide() { setVisible(false) }

  function handleTap(e: React.MouseEvent) {
    e.stopPropagation()
    if (visible) { hide(); return }
    // Center the preview on touch
    const IMG_W = 240
    const IMG_H = 336
    setPos({
      top: Math.max(8, (window.innerHeight - IMG_H) / 2),
      left: Math.max(8, (window.innerWidth - IMG_W) / 2),
    })
    setVisible(true)
  }

  if (isTouch) {
    return (
      <div ref={triggerRef} className="relative">
        {children}
        {visible && card.imageUri && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={hide}
          >
            <img
              src={card.imageUri}
              alt={card.name}
              width={240}
              height={336}
              className="rounded-lg"
              style={{ boxShadow: '0 0 40px rgba(0,0,0,0.9), 0 0 12px rgba(180,140,60,0.3)' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
        {/* Long-press area — tap on the row itself won't trigger; user must tap the name */}
        <button
          className="absolute inset-0 opacity-0"
          style={{ cursor: 'default' }}
          onClick={handleTap}
          aria-label={`Preview ${card.name}`}
        />
      </div>
    )
  }

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="relative"
    >
      {children}
      {visible && card.imageUri && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          <img
            src={card.imageUri}
            alt={card.name}
            width={200}
            height={280}
            className="rounded-lg shadow-2xl"
            style={{
              boxShadow: '0 0 30px rgba(0,0,0,0.9), 0 0 10px rgba(180,140,60,0.2)',
              transition: 'transform 0.15s ease',
              transform: 'scale(1.04)',
            }}
          />
        </div>
      )}
    </div>
  )
}
