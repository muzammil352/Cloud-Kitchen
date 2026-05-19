'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationLog } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'

const TYPE_META: Record<string, { label: string; border: string; color: string; bg: string }> = {
  win_back:         { label: 'Win-Back',    border: 'var(--color-blue)',   color: 'var(--color-blue)',   bg: 'var(--color-blue-bg)'   },
  upsell:           { label: 'Upsell',      border: 'var(--color-accent)', color: 'var(--color-accent)', bg: 'var(--color-accent-bg)' },
  low_stock:        { label: 'Low Stock',   border: 'var(--color-amber)',  color: 'var(--color-amber)',  bg: 'var(--color-amber-bg)'  },
  supplier_message: { label: 'Supplier',    border: 'var(--color-green)',  color: 'var(--color-green)',  bg: 'rgba(34,197,94,0.1)'   },
  menu_disable:     { label: 'Menu Change', border: 'var(--color-red)',    color: 'var(--color-red)',    bg: 'var(--color-red-bg)'    },
}

function buildMessage(type: string, payload: Record<string, any>): string {
  if (type === 'low_stock')        return `${payload.ingredient_name || 'Ingredient'} is running low — ${payload.current_stock ?? 0} ${payload.unit ?? ''} remaining.`
  if (type === 'win_back')         return `Send win-back offer (last order: ${payload.last_order_date || 'unknown'}, discount: ${payload.discount || '10%'}).`
  if (type === 'upsell')           return `Suggest ${payload.item_name || 'an item'} based on order history.`
  if (type === 'menu_disable')     return `Disable ${payload.item_name || 'a menu item'}${payload.reason ? ': ' + payload.reason : '.'}`
  if (type === 'supplier_message') return payload.message_preview || 'Auto-generated reorder message.'
  return payload.message || 'Action requires approval.'
}

function getNameContact(type: string, payload: Record<string, any>): { name: string; contact: string } {
  if (['win_back', 'upsell'].includes(type)) {
    const contact = payload.customer_phone || payload.customer_email || '—'
    return { name: payload.customer_name || '—', contact }
  }
  if (['low_stock', 'supplier_message'].includes(type)) {
    const contact = payload.supplier_phone || payload.supplier_email || '—'
    return { name: payload.supplier_name || '—', contact }
  }
  return { name: '—', contact: '—' }
}

const PAGE_SIZE = 10

export function PendingApprovalsTable({
  initialApprovals,
  kitchenId,
  title = 'Pending Approvals',
}: {
  initialApprovals: NotificationLog[]
  kitchenId: string
  title?: string
}) {
  const [approvals, setApprovals] = useState<NotificationLog[]>(initialApprovals)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`approvals-table-${kitchenId}-${title}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications_log', filter: `kitchen_id=eq.${kitchenId}` },
        (p) => {
          const row = p.new as NotificationLog
          if (row.status === 'pending' && row.type in TYPE_META) {
            setApprovals(prev => prev.some(a => a.notification_id === row.notification_id) ? prev : [row, ...prev])
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [kitchenId, title])

  const handleAction = async (item: NotificationLog, action: 'approve' | 'reject') => {
    const id = item.notification_id
    setProcessing(prev => new Set(prev).add(id))
    setErrors(prev => { const c = { ...prev }; delete c[id]; return c })
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: [item.approval_token], action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setApprovals(prev => {
        const next = prev.filter(a => a.notification_id !== id)
        setPage(p => Math.min(p, Math.max(0, Math.ceil(next.length / PAGE_SIZE) - 1)))
        return next
      })
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [id]: err.message }))
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const totalPages = Math.ceil(approvals.length / PAGE_SIZE)
  const pageItems = approvals.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div style={{ marginTop: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '16px', color: 'var(--color-ink)' }}>{title}</h2>
          {approvals.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
              {approvals.length}
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} color="var(--color-ink-2)" />
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', padding: '0 8px' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            >
              <ChevronRight size={14} color="var(--color-ink-2)" />
            </button>
          </div>
        )}
      </div>

      {approvals.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--color-border)', color: 'var(--color-ink-3)', fontSize: '13px' }}>
          No pending actions right now.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Action</th>
                <th style={{ textAlign: 'right' }}>Age</th>
                <th style={{ width: '140px' }}></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => {
                const meta = TYPE_META[item.type] ?? { label: item.type, border: 'var(--color-border)', color: 'var(--color-ink-3)', bg: 'var(--color-surface-2)' }
                const payload = item.payload as Record<string, any>
                const { name, contact } = getNameContact(item.type, payload)
                const isProcessing = processing.has(item.notification_id)
                const err = errors[item.notification_id]
                return (
                  <tr key={item.notification_id} style={{ opacity: isProcessing ? 0.5 : 1, transition: 'opacity 200ms' }}>
                    <td style={{ width: '110px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '100px', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
                      {name}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', whiteSpace: 'nowrap' }}>
                      {contact}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                        {buildMessage(item.type, payload)}
                      </span>
                      {err && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>{err}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', whiteSpace: 'nowrap' }}>
                      {timeAgo(item.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleAction(item, 'reject')}
                          disabled={isProcessing}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-2)', fontSize: '12px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                        >
                          <X size={12} /> Reject
                        </button>
                        <button
                          onClick={() => handleAction(item, 'approve')}
                          disabled={isProcessing}
                          className="btn-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 10px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                        >
                          <Check size={12} /> Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
