'use client'

import { useState } from 'react'
import { NotificationLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low_stock: {
    label: 'LOW STOCK',
    color: 'var(--color-amber)',
    bg: 'var(--color-amber-bg)',
    border: 'var(--color-amber)',
  },
  win_back: {
    label: 'WIN-BACK',
    color: 'var(--color-blue)',
    bg: 'var(--color-blue-bg)',
    border: 'var(--color-blue)',
  },
  upsell: {
    label: 'UPSELL',
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-bg)',
    border: 'var(--color-accent)',
  },
}

const DEFAULT_TYPE = {
  label: 'ALERT',
  color: 'var(--color-ink-3)',
  bg: 'var(--color-surface-2)',
  border: 'var(--color-border-mid)',
}

function buildMessage(type: string, payload: Record<string, any>): { main: string; detail: string } {
  if (type === 'low_stock') {
    return {
      main: `${payload.ingredient_name || 'An ingredient'} is running low.`,
      detail: `Current stock: ${payload.current_stock ?? 0} ${payload.unit ?? ''}. Reorder level: ${payload.reorder_level ?? 0} ${payload.unit ?? ''}. Supplier: ${payload.supplier_name || 'Default Supplier'} at ${payload.supplier_phone || 'N/A'}.`,
    }
  }
  if (type === 'win_back') {
    return {
      main: `Send a win-back offer to ${payload.customer_name || 'a customer'}.`,
      detail: `Last order: ${payload.last_order_date || 'unknown'}. Suggested discount: ${payload.discount || '10%'}.`,
    }
  }
  if (type === 'upsell') {
    return {
      main: `Suggest ${payload.item_name || 'an item'} to ${payload.customer_name || 'a customer'}.`,
      detail: `Based on order history. Item price: ${payload.item_price || 'N/A'}.`,
    }
  }
  return {
    main: payload.message || 'Automation action requires your approval.',
    detail: '',
  }
}

export function ApprovalsBoard({ initialApprovals }: { initialApprovals: NotificationLog[] }) {
  const [approvals, setApprovals] = useState<NotificationLog[]>(initialApprovals)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})

  const supabase = createClient()

  const handleAction = async (notification: NotificationLog, action: 'approve' | 'reject') => {
    if (processingId) return
    setProcessingId(notification.notification_id)
    setErrorMap(prev => {
      const copy = { ...prev }
      delete copy[notification.notification_id]
      return copy
    })

    try {
      if (action === 'approve') {
        const res = await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: notification.approval_token }),
        })
        if (!res.ok) {
          const js = await res.json()
          throw new Error(js.error || 'Webhook rejected.')
        }
      }

      const finalStatus = action === 'approve' ? 'approved' : 'rejected'
      setApprovals(prev => prev.filter(a => a.notification_id !== notification.notification_id))

      await supabase
        .from('notifications_log')
        .update({ status: finalStatus, resolved_at: new Date().toISOString() })
        .eq('notification_id', notification.notification_id)
    } catch (err: any) {
      setErrorMap(prev => ({ ...prev, [notification.notification_id]: err.message }))
    } finally {
      setProcessingId(null)
    }
  }

  if (approvals.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <CheckCircle size={40} color="var(--color-green)" style={{ marginBottom: '16px' }} />
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
          No pending approvals
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>All systems running.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {approvals.map(a => {
        const payload = a.payload as Record<string, any>
        const config = TYPE_CONFIG[a.type] ?? DEFAULT_TYPE
        const { main, detail } = buildMessage(a.type, payload)
        const isProcessing = processingId === a.notification_id
        const cardError = errorMap[a.notification_id]

        return (
          <div
            key={a.notification_id}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderLeft: `4px solid ${config.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
              opacity: isProcessing ? 0.5 : 1,
              pointerEvents: isProcessing ? 'none' : 'auto',
              transition: 'opacity 200ms ease',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{
                background: config.bg,
                color: config.color,
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
              }}>
                {config.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
                — {timeAgo(a.created_at)}
              </span>
            </div>

            {/* Body */}
            <p style={{ fontSize: '15px', color: 'var(--color-ink)', marginBottom: '6px', fontWeight: 400 }}>{main}</p>
            {detail && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>{detail}</p>
            )}

            {cardError && (
              <p style={{ fontSize: '12px', color: 'var(--color-red)', marginTop: '10px' }}>
                Error: {cardError}
              </p>
            )}

            {/* Action row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => handleAction(a, 'reject')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-mid)',
                  color: 'var(--color-ink-2)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(a, 'approve')}
                className="btn-primary"
                style={{ fontSize: '13px', padding: '7px 20px' }}
              >
                Approve
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
