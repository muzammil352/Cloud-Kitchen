'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/lib/types'
import { shortId, timeAgo } from '@/lib/utils'

const COLUMNS: { status: OrderStatus[]; label: string; accent: string; bg: string }[] = [
  { status: ['pending'],                        label: 'Pending',         accent: '#F59E0B', bg: 'rgba(245,158,11,0.07)'  },
  { status: ['confirmed'],                      label: 'Confirmed',       accent: '#3B82F6', bg: 'rgba(59,130,246,0.07)'  },
  { status: ['preparing', 'ready'],             label: 'Preparing',       accent: '#D4531A', bg: 'rgba(212,83,26,0.07)'   },
  { status: ['dispatched', 'out_for_delivery'], label: 'Out for Delivery',accent: '#8B5CF6', bg: 'rgba(139,92,246,0.07)'  },
  { status: ['delivered'],                      label: 'Delivered',       accent: '#10B981', bg: 'rgba(16,185,129,0.07)'  },
]

const STATUS_DOT: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', preparing: '#D4531A',
  ready: '#F97316', dispatched: '#8B5CF6', out_for_delivery: '#8B5CF6',
  delivered: '#10B981', cancelled: '#6B7280',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function AvatarCircle({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color }}>{initials(name)}</span>
    </div>
  )
}

export function KitchenBoard({
  initialOrders,
  kitchenId,
  lowStockCount,
}: {
  initialOrders: Order[]
  kitchenId: string
  lowStockCount: number
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-board-${kitchenId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `kitchen_id=eq.${kitchenId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase
            .from('orders')
            .select('*, customers(name, phone), order_items(quantity, unit_price, menu_items(name))')
            .eq('order_id', payload.new.order_id)
            .single()
          if (data) setOrders(prev => [...prev, data as Order])
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.order_id === payload.new.order_id ? { ...o, ...payload.new } : o))
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.order_id !== payload.old.order_id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [kitchenId, supabase])

  const pendingCount    = orders.filter(o => o.status === 'pending').length
  const preparingCount  = orders.filter(o => o.status === 'preparing' || o.status === 'ready').length

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          label="Pending Orders"
          value={String(pendingCount)}
          sub={pendingCount > 0 ? 'Need confirmation' : 'All confirmed'}
          accent={pendingCount > 0 ? '#F59E0B' : '#10B981'}
          leftBorder={pendingCount > 0 ? '#F59E0B' : undefined}
        />
        <StatCard
          label="Preparing"
          value={String(preparingCount)}
          sub={preparingCount > 0 ? 'In the kitchen' : 'Kitchen clear'}
          accent={preparingCount > 0 ? '#D4531A' : '#10B981'}
          leftBorder={preparingCount > 0 ? '#D4531A' : undefined}
        />
        <StatCard
          label="Low Stock"
          value={String(lowStockCount)}
          sub={lowStockCount > 0 ? 'Items below reorder level' : 'Inventory healthy'}
          accent={lowStockCount > 0 ? '#F59E0B' : '#10B981'}
          leftBorder={lowStockCount > 0 ? '#F59E0B' : undefined}
        />
      </div>

      {/* Kanban board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '14px', alignItems: 'start', overflowX: 'auto' }}>
        {COLUMNS.map(col => {
          const colOrders = orders
            .filter(o => col.status.includes(o.status as OrderStatus))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

          return (
            <div key={col.label}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px', padding: '0 4px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: colOrders.length > 0 ? col.accent : 'var(--color-ink-3)',
                }}>
                  {col.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700,
                  padding: '1px 7px', borderRadius: '100px',
                  background: colOrders.length > 0 ? col.bg : 'var(--color-surface-2)',
                  color: colOrders.length > 0 ? col.accent : 'var(--color-ink-3)',
                  border: `1px solid ${colOrders.length > 0 ? col.accent + '33' : 'transparent'}`,
                }}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '120px' }}>
                {colOrders.length === 0 ? (
                  <div style={{
                    padding: '20px 12px', borderRadius: '12px', textAlign: 'center',
                    border: '1.5px dashed var(--color-border)',
                    fontSize: '12px', color: 'var(--color-ink-3)',
                  }}>
                    Empty
                  </div>
                ) : (
                  colOrders.map(order => {
                    const name = (order.customers as any)?.name || 'Guest'
                    const dotColor = STATUS_DOT[order.status] ?? '#6B7280'
                    const items = order.order_items || []

                    return (
                      <div
                        key={order.order_id}
                        className="card"
                        style={{
                          padding: '14px',
                          borderLeft: `3px solid ${col.accent}`,
                          display: 'flex', flexDirection: 'column', gap: '10px',
                        }}
                      >
                        {/* Header: avatar + name + status dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <AvatarCircle name={name} color={col.accent} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {name}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', marginTop: '1px' }}>
                              #{shortId(order.order_id)}
                            </div>
                          </div>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 0 3px ${dotColor}22` }} />
                        </div>

                        {/* Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {items.slice(0, 4).map((oi: any, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: col.accent, flexShrink: 0 }}>
                                {oi.quantity}×
                              </span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-ink-2)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {oi.menu_items?.name || 'Item'}
                              </span>
                            </div>
                          ))}
                          {items.length > 4 && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>
                              +{items.length - 4} more
                            </span>
                          )}
                        </div>

                        {/* Footer: time */}
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                          {timeAgo(order.created_at)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent, leftBorder }: {
  label: string; value: string; sub: string; accent: string; leftBorder?: string
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined }}>
      <div style={{ fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-3)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '32px', color: accent, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontFamily: 'var(--font-body)' }}>
        {sub}
      </div>
    </div>
  )
}
