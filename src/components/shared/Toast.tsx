import React from 'react'
import { useDeckStore } from '../../store/deckStore'

export default function ToastStack() {
  const { toasts, removeToast } = useDeckStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-cinzel"
          style={{
            background: t.type === 'success' ? 'rgba(30,44,22,0.95)' :
                        t.type === 'warning' ? 'rgba(44,34,10,0.95)' :
                        'rgba(44,14,14,0.95)',
            border: `1px solid ${
              t.type === 'success' ? 'rgba(80,140,50,0.5)' :
              t.type === 'warning' ? 'rgba(180,130,40,0.5)' :
              'rgba(180,50,50,0.5)'
            }`,
            color: t.type === 'success' ? '#90c870' :
                   t.type === 'warning' ? '#d4a840' :
                   '#e05050',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            letterSpacing: '0.5px',
            fontSize: '11px',
            cursor: t.action ? 'default' : 'pointer',
          }}
          onClick={t.action ? undefined : () => removeToast(t.id)}
        >
          <span>
            {t.type === 'success' ? '✦' : t.type === 'warning' ? '⚠' : '✕'}
          </span>
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); removeToast(t.id) }}
              className="px-2 py-0.5 rounded-sm transition-all flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'inherit',
                fontSize: 10,
                letterSpacing: '0.5px',
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => removeToast(t.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            style={{ fontSize: 11 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
