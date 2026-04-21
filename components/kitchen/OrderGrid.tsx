'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/lib/types'
import { shortId, timeAgo } from '@/lib/utils'

// Defined explicitly matching visual state transitions for the kitchen.
const STATE_MAP: Record<string, { nextState: OrderStatus | null, label: string, color: string, hover: string }> = {
  pending: { nextState: 'confirmed', label: 'Confirm Order', color: '#EAB308', hover: '#CA8A04' },
  confirmed: { nextState: 'preparing', label: 'Start Preparing', color: '#3B82F6', hover: '#2563EB' },
  preparing: { nextState: 'out_for_delivery', label: 'Ready for Delivery', color: '#F97316', hover: '#EA580C' },
  out_for_delivery: { nextState: 'delivered', label: 'Mark Delivered', color: '#10B981', hover: '#059669' },
  delivered: { nextState: null, label: 'Delivered', color: 'var(--kds-border)', hover: 'var(--kds-border)' },
  cancelled: { nextState: null, label: 'Cancelled', color: 'var(--kds-border)', hover: 'var(--kds-border)' }
}

export function OrderGrid({ initialOrders, kitchenId }: { initialOrders: Order[], kitchenId: string }) {
  // Hide delivered and cancelled from the primary grid array.
  const [activeOrders, setActiveOrders] = useState<Order[]>(
    initialOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
  )
  
  const [historyOrders, setHistoryOrders] = useState<Order[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const supabase = createClient()
  const audioCtxRef = useRef<AudioContext | null>(null)

  // 1. AudioContext synthetic beep init mechanism
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      setIsAudioReady(true)
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }

    window.addEventListener('click', unlockAudio)
    window.addEventListener('touchstart', unlockAudio)

    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  const playPing = () => {
    if (!audioCtxRef.current || !isAudioReady) return
    const oscillator = audioCtxRef.current.createOscillator()
    const gainNode = audioCtxRef.current.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1046.50, audioCtxRef.current.currentTime) // High C note
    
    gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtxRef.current.currentTime + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.5)

    oscillator.connect(gainNode)
    gainNode.connect(audioCtxRef.current.destination)

    oscillator.start(audioCtxRef.current.currentTime)
    oscillator.stop(audioCtxRef.current.currentTime + 0.5)
  }

  // 2. Localized fetch for Historical "Delivered" drawer
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('kitchen_id', kitchenId)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false })
        .limit(5)
      if (data) setHistoryOrders(data as Order[])
    }
    fetchHistory()
  }, [kitchenId, supabase])

  // 3. Grid Subscription matching inserts cleanly
  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-queue-${kitchenId}`)
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'orders',
        filter: `kitchen_id=eq.${kitchenId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          playPing()
          // Inject missing relationships automatically via fetching
          const { data } = await supabase.from('orders')
            .select('*, customers(name, phone), order_items(*, menu_items(name))')
            .eq('order_id', payload.new.order_id).single()
            
          if (data && data.status !== 'delivered' && data.status !== 'cancelled') {
            setActiveOrders(prev => [...prev, data as Order])
          }
        } 
        else if (payload.eventType === 'UPDATE') {
          const newStatus = payload.new.status
          if (newStatus === 'delivered' || newStatus === 'cancelled') {
            // Eject from the grid instantly with animate boundary
            setActiveOrders(prev => prev.filter(o => o.order_id !== payload.new.order_id))
            
            // Move cleanly to history locally for instant review if delivered
            if (newStatus === 'delivered') {
              const { data } = await supabase.from('orders')
                .select('*')
                .eq('order_id', payload.new.order_id).single()
              if (data) setHistoryOrders(prev => [data as Order, ...prev].slice(0,5))
            }
          } else {
             setActiveOrders(prev => prev.map(o => o.order_id === payload.new.order_id ? { ...o, status: newStatus } : o))
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [kitchenId, supabase, isAudioReady])

  // Explicit status forward propagation triggered exclusively via structural grid button
  const advanceState = async (order: Order) => {
    const rules = STATE_MAP[order.status]
    const nextState = rules.nextState
    if (!nextState) return

    if (nextState === 'delivered') {
       setActiveOrders(prev => prev.filter(o => o.order_id !== order.order_id))
       setHistoryOrders(prev => [{ ...order, status: nextState, updated_at: new Date().toISOString() }, ...prev].slice(0,5))
    } else {
       setActiveOrders(prev => prev.map(o => o.order_id === order.order_id ? { ...o, status: nextState } : o))
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: nextState, updated_at: new Date().toISOString() })
      .eq('order_id', order.order_id)
      
    if (error) {
      console.error("Critical: Failed to explicitly march status natively", error)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '16px', position: 'relative' }}>
      {!isAudioReady && (
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', color: '#F59E0B', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', fontWeight: 500, flexShrink: 0, width: '100%' }}>
          Touch screen anywhere to enable ping alerts.
        </div>
      )}

      {/* Grid Container */}
      <div style={{ flex: 1, overflowY: 'auto', width: '100%', maxHeight: 'min-content' }}>
        {activeOrders.length === 0 ? (
          <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--kds-muted)', border: '2px dashed var(--kds-border)', borderRadius: '16px', background: 'var(--kds-surface)', opacity: 0.7 }}>
            <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--kds-text)', opacity: 0.8 }}>Kitchen is Clear</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Listening for incoming orders...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', gridAutoRows: 'max-content', overflowY: 'visible' }}>
            {activeOrders.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(order => {
              const rule = STATE_MAP[order.status]
              const isHovered = hoveredButton === order.order_id
              
              return (
                <div key={order.order_id} style={{ backgroundColor: 'var(--kds-surface)', border: '2px solid var(--kds-border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--kds-bg)', borderBottom: '1px solid var(--kds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div>
                      <h3 className="font-mono" style={{ fontWeight: 700, fontSize: '20px', color: 'var(--kds-text)', margin: 0 }}>#{shortId(order.order_id)}</h3>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--kds-muted)', margin: 0 }}>{timeAgo(order.created_at)}</p>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--kds-muted)', backgroundColor: 'var(--kds-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--kds-border)' }}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                      <p style={{ fontWeight: 700, color: 'var(--kds-text)', fontSize: '20px', marginBottom: '4px' }}>{order.customers?.name || 'Guest'}</p>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--kds-muted)', lineHeight: 1.4 }}>{order.delivery_address}</p>
                    </div>

                    <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--kds-border)', borderRadius: '12px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', flexGrow: 1 }}>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {order.order_items?.map(oi => (
                          <li key={oi.order_item_id} style={{ display: 'flex', fontSize: '16px' }}>
                            <span className="font-mono" style={{ fontWeight: 700, marginRight: '12px', width: '24px', flexShrink: 0, color: '#4ADE80' }}>{oi.quantity}x</span>
                            <span style={{ fontWeight: 700, color: 'var(--kds-text)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{oi.menu_items?.name || 'Item'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.notes && (
                      <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #F59E0B', borderTop: '1px solid rgba(245, 158, 11, 0.2)', borderRight: '1px solid rgba(245, 158, 11, 0.2)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', color: '#FCD34D', padding: '12px', borderRadius: '0 8px 8px 0', fontSize: '14px', fontWeight: 600, marginBottom: '20px', flexShrink: 0 }}>
                        "{order.notes}"
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => advanceState(order)}
                    disabled={!rule.nextState}
                    onMouseEnter={() => setHoveredButton(order.order_id)}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{
                      width: '100%',
                      padding: '24px 0',
                      textAlign: 'center',
                      fontWeight: 900,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      fontSize: '18px',
                      cursor: rule.nextState ? 'pointer' : 'not-allowed',
                      backgroundColor: isHovered ? rule.hover : rule.color,
                      color: !rule.nextState ? 'var(--kds-muted)' : '#FFFFFF',
                      border: 'none',
                      outline: 'none'
                    }}
                  >
                    {rule.label}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* History Drawer */}
      <div style={{ borderTop: '3px solid var(--kds-border)', paddingTop: '16px', flexShrink: 0, backgroundColor: 'var(--kds-bg)', position: 'sticky', bottom: 0, zIndex: 20 }}>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          style={{ width: '100%', backgroundColor: 'var(--kds-surface)', color: 'var(--kds-text)', padding: '16px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px', border: '1px solid var(--kds-border)', cursor: 'pointer', outline: 'none' }}
        >
          {showHistory ? 'Hide History' : 'Show Last 5 Delivered Orders'}
        </button>

        {showHistory && (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', paddingBottom: '8px' }}>
            {historyOrders.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: 'var(--kds-muted)', padding: '24px 0', backgroundColor: 'var(--kds-surface)', borderRadius: '12px' }}>
                No delivered orders isolated.
              </div>
            ) : (
              historyOrders.map(o => (
                <div key={o.order_id} style={{ backgroundColor: 'var(--kds-surface)', border: '1px solid var(--kds-border)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="font-mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--kds-text)' }}>#{shortId(o.order_id)}</span>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--kds-muted)' }}>{timeAgo(o.updated_at)}</span>
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }}></div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
