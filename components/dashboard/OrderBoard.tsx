'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/lib/types'
import { formatCurrency, shortId } from '@/lib/utils'

export function OrderBoard({ initialOrders, kitchenId }: { initialOrders: Order[], kitchenId: string }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [kitchenId, supabase])

  const handleUpdateStatusBulk = async (newStatus: OrderStatus) => {
    const ids = Array.from(selectedIds);
    setOrders(prev => prev.map(o => ids.includes(o.order_id) ? { ...o, status: newStatus } : o))
    
    for (const orderId of ids) {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
    }
    setSelectedIds(new Set());
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const toggleSelectAll = (filteredIds: string[]) => {
    if (selectedIds.size === filteredIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  }

  const filteredOrders = orders.filter(o => filterStatus === 'all' || o.status === filterStatus)

  return (
    <div>
      {/* Filter Tabs / Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', minHeight: '36px' }}>
        {selectedIds.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface)', padding: '6px 16px', borderRadius: '100px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
              {selectedIds.size} orders selected
            </span>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <button 
              onClick={() => handleUpdateStatusBulk('ready')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Mark Ready
            </button>
            <button 
              onClick={() => handleUpdateStatusBulk('cancelled')}
              style={{ background: 'none', border: 'none', color: '#C0392B', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Cancel Orders
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '24px' }}>
            {['all', 'pending', 'preparing', 'ready', 'dispatched', 'cancelled'].map(status => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status as any)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  fontSize: '14px',
                  cursor: 'pointer',
                  borderBottom: filterStatus === status ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: filterStatus === status ? 600 : 400,
                  color: filterStatus === status ? 'var(--text-primary)' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-ui)'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ minWidth: '800px' }}>
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
                 const timeString = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                 
                 // Fake payment status logic since db doesn't have it natively right now in this context
                 const paymentBadge = 'badge-green';
                 const paymentText = 'Paid';

                 return (
                   <tr key={order.order_id}>
                     <td style={{ paddingLeft: '24px' }}>
                       <input 
                         type="checkbox"
                         checked={selectedIds.has(order.order_id)}
                         onChange={() => toggleSelect(order.order_id)}
                         style={{ width: 'auto', cursor: 'pointer' }}
                       />
                     </td>
                     <td>
                       <a href="#" className="font-mono" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
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
                       <span className={`badge ${paymentBadge}`}>{paymentText}</span>
                     </td>
                     <td>
                       <span className={`badge ${
                         order.status === 'ready' ? 'badge-green' : 
                         order.status === 'cancelled' ? 'badge-red' : 
                         order.status === 'preparing' ? 'badge-purple' : 
                         order.status === 'dispatched' ? 'badge-muted' : 
                         'badge-amber'
                       }`}>
                         {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                       </span>
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
