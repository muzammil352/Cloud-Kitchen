'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export type ToastItem = {
  id: string
  type: 'success' | 'error'
  message: string
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

export function Toasts({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: '28px', right: '28px',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderLeft: `4px solid ${t.type === 'success' ? 'var(--color-green)' : '#ef4444'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
              boxShadow: '0 8px 32px rgba(26,25,23,0.12), 0 2px 8px rgba(26,25,23,0.06)',
              minWidth: '280px', maxWidth: '380px',
              animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)',
              pointerEvents: 'auto',
            }}
          >
            {t.type === 'success'
              ? <CheckCircle size={16} style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: '1px' }} />
              : <XCircle    size={16} style={{ color: '#ef4444',            flexShrink: 0, marginTop: '1px' }} />
            }
            <span style={{
              flex: 1, fontFamily: 'var(--font-body)', fontSize: '13px',
              color: 'var(--color-ink)', lineHeight: 1.5, fontWeight: 500,
            }}>
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'var(--color-ink-3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}