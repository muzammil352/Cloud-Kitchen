'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from './CartContext'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone, formatCurrency } from '@/lib/utils'
import { X, ShoppingBag } from 'lucide-react'

export function CartSheet({
  kitchenId,
  slug,
  open,
  onOpenChange,
}: {
  kitchenId: string
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { cartItems, cartTotal, itemCount, updateQuantity, removeFromCart, clearCart } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onPlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPlacingOrder(true)
    setError(null)
    const supabase = createClient()

    try {
      // Step 1: Normalize phone
      const normalizedPhone = normalizePhone(customerPhone)

      // Step 2: Check if customer already exists (by phone + kitchen_id)
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('kitchen_id', kitchenId)
        .eq('phone', normalizedPhone)
        .maybeSingle()

      // Step 3: Insert customer if new
      let customerId = existingCustomer?.customer_id
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            kitchen_id: kitchenId,
            name: customerName,
            email: customerEmail,
            phone: normalizedPhone,
            total_orders: 0,
            total_spend: 0,
          })
          .select('customer_id')
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.customer_id
      }

      // Step 4: Insert the order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          kitchen_id: kitchenId,
          customer_id: customerId,
          status: 'pending',
          total_amount: cartTotal,
          delivery_address: deliveryAddress,
          notes: orderNotes || null,
        })
        .select('order_id')
        .single()

      if (orderError) throw orderError

      // Step 5: Insert order items
      const orderItems = cartItems.map((item) => ({
        order_id: newOrder.order_id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.price,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // Step 6: Clear cart from localStorage (and context)
      clearCart()

      // Step 7: Redirect to tracking page
      router.push(`/${slug}/track?order_id=${newOrder.order_id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to place order.')
      setIsPlacingOrder(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => onOpenChange(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '100vh',
        background: 'var(--surface)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
        borderRadius: '18px 0 0 18px',
        zIndex: 51,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Your Order</h2>
          <button
            onClick={() => onOpenChange(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color var(--transition)', borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {itemCount === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <ShoppingBag size={40} strokeWidth={1.5} color="var(--text-muted)" />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-muted)', margin: 0 }}>Your cart is empty.</p>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Add items from the menu.</p>
          </div>
        ) : (
          <>
            {/* Scrollable items + form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {/* Cart items */}
              <div>
                {cartItems.map((item, idx) => (
                  <div key={item.item_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 0',
                    borderBottom: idx < cartItems.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'var(--bg-start)', overflow: 'hidden', flexShrink: 0 }}>
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{formatCurrency(item.price)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-surface)', borderRadius: '100px', height: '30px', padding: '0 10px', flexShrink: 0 }}>
                      <button type="button" onClick={() => updateQuantity(item.item_id, item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: '16px', padding: 0, width: '20px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, color: 'var(--accent)', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.item_id, item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: '16px', padding: 0, width: '20px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.item_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', padding: '4px', lineHeight: 1, transition: 'color var(--transition)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#C0392B')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >×</button>
                  </div>
                ))}
              </div>

              {/* Checkout form */}
              <form id="checkout-form" onSubmit={onPlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', paddingBottom: '8px' }}>
                <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '8px', margin: '0 0 4px' }}>Delivery Details</h3>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Name</label>
                  <input required value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Phone (Pakistan)</label>
                  <input required placeholder="03XXXXXXXXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Email (optional)</label>
                  <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} style={{ marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Full Address</label>
                  <textarea required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} style={{ marginTop: '4px', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Notes to Kitchen</label>
                  <input placeholder="e.g. Extra spicy" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} style={{ marginTop: '4px' }} />
                </div>
                {error && <p style={{ color: '#C0392B', fontSize: '13px', margin: 0 }}>{error}</p>}
              </form>
            </div>

            {/* Sticky footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-secondary)' }}>Subtotal</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)' }}>{formatCurrency(cartTotal)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)' }}>{formatCurrency(cartTotal)}</span>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={isPlacingOrder}
                className="btn-primary"
                style={{ width: '100%', height: '50px', fontSize: '15px', fontWeight: 600, marginTop: '16px', borderRadius: '14px' }}
              >
                {isPlacingOrder ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
