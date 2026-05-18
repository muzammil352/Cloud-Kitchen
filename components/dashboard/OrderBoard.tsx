'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/lib/types'
import { formatCurrency, shortId } from '@/lib/utils'
import { updateOrderStatus } from '@/app/dashboard/orders/actions'

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'ready',
  'dispatched', 'out_for_delivery', 'delivered', 'cancelled',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  ready: 'Ready', dispatched: 'Dispatched', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string; border: string }> = {
  pending:          { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  confirmed:        { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' },
  preparing:        { bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE' },
  ready:            { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
  dispatched:       { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
  out_for_delivery: { bg: '#FEF9C3', color: '#713F12', border: '#FEF08A' },
  delivered:        { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
  cancelled:        { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
}

export function OrderBoard({ initialOrders, kitchenId }: { initialOrders: Order[], kitchenId: string }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>('confirmed')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-orders-${kitchenId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `kitchen_id=eq.${kitchenId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const { data: newOrder } = await supabase
            .from('orders')
            .select('*, customers(name, phone, email), order_items(*, menu_items(name))')
            .eq('order_id', payload.new.order_id)
            .single()

          if (newOrder) {
            setOrders(prev => {
              const existing = prev.findIndex(o => o.order_id === newOrder.order_id)
              if (existing > -1) {
                const updated = [...prev]
                updated[existing] = newOrder as Order
                return updated
              }
              return [newOrder as Order, ...prev]
            })
          }
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.order_id !== payload.old.order_id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [kitchenId, supabase])

  const pushN8NStatus = (order: Order, oldStatus: OrderStatus, newStatus: OrderStatus) => {
    const statusUrl = process.env.NEXT_PUBLIC_N8N_STATUS_UPDATE
    if (!statusUrl) return
    fetch(statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.order_id,
        kitchen_id: order.kitchen_id,
        customer_id: order.customer_id,
        old_status: oldStatus,
        new_status: newStatus,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error)
  }

  const handleUpdateStatusSingle = async (order: Order, newStatus: OrderStatus) => {
    if (newStatus === order.status) return
    const oldStatus = order.status

    setUpdatingIds(prev => new Set(prev).add(order.order_id))
    setOrders(prev => prev.map(o => o.order_id === order.order_id ? { ...o, status: newStatus } : o))

    const { error } = await updateOrderStatus(order.order_id, newStatus)

    setUpdatingIds(prev => { const s = new Set(prev); s.delete(order.order_id); return s })

    if (error) {
      console.error('Order update failed:', order.order_id, error)
      setOrders(prev => prev.map(o => o.order_id === order.order_id ? { ...o, status: oldStatus } : o))
      alert(`Failed to update order status: ${error}`)
    } else {
      pushN8NStatus(order, oldStatus, newStatus)
    }
  }

  const handleUpdateStatusBulk = async (newStatus: OrderStatus) => {
    const ids = Array.from(selectedIds)
    const previousOrders = orders
    const bulkUpdating = new Set(ids)

    setUpdatingIds(prev => new Set(Array.from(prev).concat(Array.from(bulkUpdating))))
    setOrders(prev => prev.map(o => ids.includes(o.order_id) ? { ...o, status: newStatus } : o))

    let failed = 0
    for (const orderId of ids) {
      const order = previousOrders.find(o => o.order_id === orderId)
      const { error } = await updateOrderStatus(orderId, newStatus)

      if (error) {
        console.error('Bulk update failed:', orderId, error)
        failed++
      } else if (order) {
        pushN8NStatus(order, order.status, newStatus)
      }
    }

    setUpdatingIds(prev => { const s = new Set(prev); ids.forEach(id => s.delete(id)); return s })

    if (failed > 0) {
      alert(`${failed} order(s) failed to update. Make sure the RLS UPDATE policy is added in Supabase.`)
      setOrders(previousOrders)
    }
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (filteredIds: string[]) => {
    if (selectedIds.size === filteredIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredIds))
    }
  }

  const filteredOrders = orders.filter(o => filterStatus === 'all' || o.status === filterStatus)

  return (
    <div>
      {/* Filter Tabs / Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', minHeight: '36px' }}>
        {selectedIds.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', padding: '6px 14px', borderRadius: '100px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {selectedIds.size} selected
            </span>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>Set status to</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as OrderStatus)}
              style={{
                padding: '4px 10px', borderRadius: '100px', border: '1px solid var(--border)',
                fontSize: '13px', fontFamily: 'var(--font-ui)', color: 'var(--text-primary)',
                background: 'var(--surface)', cursor: 'pointer', outline: 'none', width: 'auto',
              }}
            >
              {ALL_STATUSES.filter(s => s !== 'pending').map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => handleUpdateStatusBulk(bulkStatus)}
              style={{
                padding: '5px 14px', borderRadius: '100px', border: 'none',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-ui)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: '0 2px' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {(['all', ...ALL_STATUSES] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as OrderStatus | 'all')}
                style={{
                  background: 'none', border: 'none', padding: '8px 0', fontSize: '14px',
                  cursor: 'pointer',
                  borderBottom: filterStatus === status ? '2px solid var(--color-accent)' : '2px solid transparent',
                  fontWeight: filterStatus === status ? 600 : 400,
                  color: filterStatus === status ? 'var(--text-primary)' : 'var(--text-muted)',
                  textTransform: 'capitalize', fontFamily: 'var(--font-ui)',
                }}
              >
                {status === 'out_for_delivery' ? 'Out for Delivery' : status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', background: '#fff' }}>
        <table style={{ minWidth: '800px', background: '#fff' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', paddingLeft: '24px' }}>
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                  onChange={() => toggleSelectAll(filteredOrders.map(o => o.order_id))}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
              </th>
              <th>Order #</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Items</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'center' }}>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const timeString = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                const isUpdating = updatingIds.has(order.order_id)
                const colors = STATUS_COLORS[order.status]

                return (
                  <tr key={order.order_id} style={{ opacity: isUpdating ? 0.6 : 1, transition: 'opacity 150ms' }}>
                    <td style={{ paddingLeft: '24px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.order_id)}
                        onChange={() => toggleSelect(order.order_id)}
                        style={{ width: 'auto', cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <a href="#" className="font-mono" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                        #{shortId(order.order_id)}
                      </a>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{timeString}</td>
                    <td>{order.customers?.name || 'Guest'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {order.order_items?.reduce((acc: any, i: any) => acc + i.quantity, 0) || 0} items
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>{formatCurrency(order.total_amount)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-green">Paid</span>
                    </td>
                    <td>
                      <select
                        value={order.status}
                        disabled={isUpdating}
                        onChange={e => handleUpdateStatusSingle(order, e.target.value as OrderStatus)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          border: `1px solid ${colors.border}`,
                          background: colors.bg,
                          color: colors.color,
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: 'var(--font-ui)',
                          cursor: isUpdating ? 'wait' : 'pointer',
                          outline: 'none',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          paddingRight: '24px',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='${encodeURIComponent(colors.color)}' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 8px center',
                        }}
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing 1–{filteredOrders.length} of {orders.length} orders
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>Previous</button>
          <button className="btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>Next</button>
        </div>
      </div>
    </div>
  )
}
