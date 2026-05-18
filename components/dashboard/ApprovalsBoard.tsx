'use client'

import { useState, useEffect } from 'react'
import { NotificationLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { CheckCircle, Trash2, CheckCheck } from 'lucide-react'

const SECTIONS: { type: string; label: string; border: string; color: string; bg: string }[] = [
  { type: 'win_back',         label: 'Win-Back Campaign',  border: 'var(--color-blue)',   color: 'var(--color-blue)',   bg: 'var(--color-blue-bg)'   },
  { type: 'low_stock',        label: 'Low Stock Alerts',   border: 'var(--color-amber)',  color: 'var(--color-amber)',  bg: 'var(--color-amber-bg)'  },
  { type: 'upsell',           label: 'Upsell Suggestions', border: 'var(--color-accent)', color: 'var(--color-accent)', bg: 'var(--color-accent-bg)' },
  { type: 'menu_disable',     label: 'Menu Changes',       border: 'var(--color-red)',    color: 'var(--color-red)',    bg: 'var(--color-red-bg)'    },
  { type: 'supplier_message', label: 'Supplier Messages',  border: 'var(--color-green)',  color: 'var(--color-green)',  bg: 'rgba(34,197,94,0.1)'   },
]

function buildMessage(type: string, payload: Record<string, any>): { main: string; detail: string } {
  if (type === 'low_stock') return {
    main: `${payload.ingredient_name || 'An ingredient'} is running low.`,
    detail: `Stock: ${payload.current_stock ?? 0} ${payload.unit ?? ''}  ·  Reorder at: ${payload.reorder_level ?? 0} ${payload.unit ?? ''}  ·  Supplier: ${payload.supplier_name || 'N/A'} ${payload.supplier_phone ? '(' + payload.supplier_phone + ')' : ''}`,
  }
  if (type === 'win_back') return {
    main: `Send a win-back offer to ${payload.customer_name || 'a customer'}.`,
    detail: `Last order: ${payload.last_order_date || 'unknown'}  ·  Discount: ${payload.discount || '10%'}`,
  }
  if (type === 'upsell') return {
    main: `Suggest ${payload.item_name || 'an item'} to ${payload.customer_name || 'a customer'}.`,
    detail: `Based on order history  ·  Item price: ${payload.item_price || 'N/A'}`,
  }
  if (type === 'menu_disable') return {
    main: `Disable ${payload.item_name || 'a menu item'}.`,
    detail: payload.reason || 'Low stock or quality issue detected.',
  }
  if (type === 'supplier_message') return {
    main: `Message ${payload.supplier_name || 'a supplier'}.`,
    detail: payload.message_preview || 'Auto-generated reorder message.',
  }
  return { main: payload.message || 'Automation action requires your approval.', detail: '' }
}

export function ApprovalsBoard({ initialApprovals, kitchenId }: { initialApprovals: NotificationLog[]; kitchenId: string }) {
  const [approvals, setApprovals]     = useState<NotificationLog[]>(initialApprovals)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [processing, setProcessing]   = useState<Set<string>>(new Set())
  const [errorMap, setErrorMap]       = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('approvals_live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications_log', filter: `kitchen_id=eq.${kitchenId}` },
        (p) => {
          const row = p.new as NotificationLog
          if (row.status === 'pending') {
            setApprovals(prev => prev.some(a => a.notification_id === row.notification_id) ? prev : [row, ...prev])
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [kitchenId])

  const callApi = async (tokens: string[], action: 'approve' | 'reject') => {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  }

  const handleAction = async (notification: NotificationLog, action: 'approve' | 'reject') => {
    const id = notification.notification_id
    setProcessing(prev => new Set(prev).add(id))
    setErrorMap(prev => { const c = { ...prev }; delete c[id]; return c })
    try {
      await callApi([notification.approval_token], action)
      setApprovals(prev => prev.filter(a => a.notification_id !== id))
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    } catch (err: any) {
      setErrorMap(prev => ({ ...prev, [id]: err.message }))
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const handleBulk = async (action: 'approve' | 'reject') => {
    if (selected.size === 0) return
    const ids = [...selected]
    ids.forEach(id => setProcessing(prev => new Set(prev).add(id)))
    const tokens = approvals.filter(a => ids.includes(a.notification_id)).map(a => a.approval_token)
    try {
      await callApi(tokens, action)
      setApprovals(prev => prev.filter(a => !ids.includes(a.notification_id)))
      setSelected(new Set())
    } catch (err: any) {
      ids.forEach(id => setErrorMap(prev => ({ ...prev, [id]: err.message })))
    } finally {
      ids.forEach(id => setProcessing(prev => { const s = new Set(prev); s.delete(id); return s }))
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  const toggleSection = (ids: string[]) => {
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const s = new Set(prev)
      ids.forEach(id => allSelected ? s.delete(id) : s.add(id))
      return s
    })
  }

  if (approvals.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <CheckCircle size={40} color="var(--color-green)" style={{ marginBottom: '16px' }} />
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>No pending approvals</p>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>All systems running.</p>
      </div>
    )
  }

  const visibleSections = SECTIONS.filter(s => approvals.some(a => a.type === s.type))
  const otherApprovals  = approvals.filter(a => !SECTIONS.some(s => s.type === a.type))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', position: 'sticky', top: '16px', zIndex: 10 }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', flex: 1 }}>
            {selected.size} selected
          </span>
          <button
            onClick={() => handleBulk('approve')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', borderRadius: '100px', border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
          >
            <CheckCheck size={14} /> Approve Selected
          </button>
          <button
            onClick={() => handleBulk('reject')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 14px', borderRadius: '100px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
          >
            <Trash2 size={14} /> Delete Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ height: '32px', padding: '0 12px', borderRadius: '100px', border: '1px solid var(--color-border-mid)', background: 'transparent', color: 'var(--color-ink-3)', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Typed sections */}
      {visibleSections.map(section => {
        const items = approvals.filter(a => a.type === section.type)
        const sectionIds = items.map(a => a.notification_id)
        const allChecked = sectionIds.every(id => selected.has(id))

        return (
          <div key={section.type}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => toggleSection(sectionIds)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                title="Select all in section"
              />
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--color-ink)' }}>{section.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: section.bg, color: section.color, fontWeight: 600 }}>
                {items.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map(a => {
                const payload    = a.payload as Record<string, any>
                const { main, detail } = buildMessage(a.type, payload)
                const isProcessing = processing.has(a.notification_id)
                const isSelected   = selected.has(a.notification_id)
                const cardError    = errorMap[a.notification_id]

                return (
                  <div
                    key={a.notification_id}
                    style={{
                      display: 'flex', gap: '14px', alignItems: 'flex-start',
                      background: 'var(--color-surface)',
                      border: `1px solid ${isSelected ? section.border : 'var(--color-border)'}`,
                      borderLeft: `4px solid ${section.border}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px 20px',
                      boxShadow: 'var(--shadow-sm)',
                      opacity: isProcessing ? 0.5 : 1,
                      pointerEvents: isProcessing ? 'none' : 'auto',
                      transition: 'opacity 200ms, border-color 150ms',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(a.notification_id)}
                      style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: section.bg, color: section.color }}>
                          {section.type.replace('_', '-').toUpperCase()}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
                          {timeAgo(a.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>{main}</p>
                      {detail && (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.6 }}>{detail}</p>
                      )}
                      {cardError && (
                        <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>Error: {cardError}</p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                        <button
                          onClick={() => handleAction(a, 'reject')}
                          style={{ background: 'transparent', border: '1px solid var(--color-border-mid)', color: 'var(--color-ink-2)', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500, padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction(a, 'approve')}
                          className="btn-primary"
                          style={{ fontSize: '13px', padding: '6px 18px' }}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Catch-all for unknown types */}
      {otherApprovals.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--color-ink)' }}>Other</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'var(--color-surface-2)', color: 'var(--color-ink-3)', fontWeight: 600 }}>{otherApprovals.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {otherApprovals.map(a => {
              const payload = a.payload as Record<string, any>
              const { main, detail } = buildMessage(a.type, payload)
              const isProcessing = processing.has(a.notification_id)
              const isSelected   = selected.has(a.notification_id)
              const cardError    = errorMap[a.notification_id]
              return (
                <div key={a.notification_id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'var(--color-surface)', border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`, borderLeft: '4px solid var(--color-border-mid)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', opacity: isProcessing ? 0.5 : 1, pointerEvents: isProcessing ? 'none' : 'auto', transition: 'opacity 200ms' }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(a.notification_id)} style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface-2)', color: 'var(--color-ink-3)' }}>{a.type.toUpperCase()}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>{timeAgo(a.created_at)}</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>{main}</p>
                    {detail && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.6 }}>{detail}</p>}
                    {cardError && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>Error: {cardError}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                      <button onClick={() => handleAction(a, 'reject')} style={{ background: 'transparent', border: '1px solid var(--color-border-mid)', color: 'var(--color-ink-2)', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500, padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer' }}>Reject</button>
                      <button onClick={() => handleAction(a, 'approve')} className="btn-primary" style={{ fontSize: '13px', padding: '6px 18px' }}>Approve</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
