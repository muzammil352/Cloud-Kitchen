'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from './CartContext'
import { MenuItem, Kitchen } from '@/lib/types'
import { formatCurrency, normalizePhone, timeAgo } from '@/lib/utils'
import { ShoppingBag, Search, X, Plus, Minus, Package, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Feedback {
  feedback_id: string
  rating: number
  comment: string | null
  created_at: string
  customers?: { name: string } | null
}

interface Props {
  kitchen: Kitchen
  menuItems: MenuItem[]
  feedbacks: Feedback[]
  categories: string[]
  slug: string
  showDashboardButton: boolean
}

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery', 'delivered']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Received', confirmed: 'Confirmed', preparing: 'Preparing',
  ready: 'Ready', dispatched: 'Dispatched', out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');`

const STYLES = `
  .mc-root { box-sizing: border-box; }
  .mc-root *, .mc-root *::before, .mc-root *::after { box-sizing: border-box; }
  .mc-input {
    background: #242220; border: 1px solid #2A2722; border-radius: 12px;
    color: #F2EDE4; font-family: 'DM Sans', sans-serif; font-size: 14px;
    padding: 12px 16px; width: 100%; outline: none;
    transition: border-color 150ms ease;
  }
  .mc-input:focus { border-color: #E8622A; }
  .mc-input::placeholder { color: #8C8479; }
  .mc-textarea {
    background: #242220; border: 1px solid #2A2722; border-radius: 12px;
    color: #F2EDE4; font-family: 'DM Sans', sans-serif; font-size: 14px;
    padding: 12px 16px; width: 100%; outline: none; resize: vertical; min-height: 72px;
    transition: border-color 150ms ease;
  }
  .mc-textarea:focus { border-color: #E8622A; }
  .mc-textarea::placeholder { color: #8C8479; }
  .hide-scroll::-webkit-scrollbar { display: none; }
  .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  @keyframes mc-fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mc-slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .mc-card {
    opacity: 0; transform: translateY(16px);
    animation: mc-fadeUp 400ms ease forwards;
  }
  .mc-card:nth-child(1) { animation-delay: 0ms }
  .mc-card:nth-child(2) { animation-delay: 60ms }
  .mc-card:nth-child(3) { animation-delay: 120ms }
  .mc-card:nth-child(4) { animation-delay: 180ms }
  .mc-card:nth-child(5) { animation-delay: 240ms }
  .mc-card:nth-child(6) { animation-delay: 300ms }
  .mc-card:nth-child(7) { animation-delay: 360ms }
  .mc-card:nth-child(8) { animation-delay: 420ms }
  .mc-card:nth-child(9) { animation-delay: 480ms }
  .mc-cart-bar { animation: mc-slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .mc-menu-card {
    background: #161512; border: 1px solid #2A2722; border-radius: 16px;
    overflow: hidden; transition: border-color 200ms ease, transform 200ms ease;
  }
  .mc-menu-card:hover { border-color: #E8622A; transform: translateY(-3px); }
  .mc-menu-card.unavailable:hover { border-color: #2A2722; transform: none; }
  .mc-add-btn {
    width: 32px; height: 32px; border-radius: 50%; background: #E8622A; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform 150ms ease; flex-shrink: 0;
  }
  .mc-add-btn:hover { transform: scale(1.15); }
  .mc-chip-btn {
    background: #1E1C18; border: 1px solid #2A2722; border-radius: 100px;
    padding: 4px 12px; font-family: 'DM Sans', sans-serif; font-size: 12px;
    color: #8C8479; cursor: pointer; display: flex; align-items: center; gap: 4px;
    transition: background 150ms ease;
    white-space: nowrap; flex-shrink: 0;
  }
  .mc-chip-btn:hover { background: #2A2722; }
`

export function MenuPageClient({ kitchen, menuItems, feedbacks, categories, slug, showDashboardButton }: Props) {
  const router = useRouter()
  const { cartItems, itemCount, cartTotal, addToCart, updateQuantity, clearCart } = useCart()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(categories[0] || '')
  const [cartOpen, setCartOpen] = useState(false)
  const [isTrackOpen, setIsTrackOpen] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')

  const [trackInput, setTrackInput] = useState('')
  const [trackedOrder, setTrackedOrder] = useState<any>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState('')

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const mainRef = useRef<HTMLDivElement>(null)

  const heroImage = (kitchen.settings as any)?.hero_image_url as string | null
  const kitchenInitials = kitchen.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : null
  const deliveryFee = 150

  useEffect(() => {
    if (!mainRef.current || categories.length === 0) return
    const observers: IntersectionObserver[] = []
    categories.forEach(cat => {
      const el = sectionRefs.current[cat]
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat) },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [categories])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`last_order_${slug}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.orderId) setTrackInput(parsed.orderId)
      }
    } catch {}
  }, [slug])

  const scrollToCategory = (cat: string) => {
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveCategory(cat)
  }

  const getCartQty = (itemId: string) => cartItems.find(i => i.item_id === itemId)?.quantity ?? 0

  const filteredItems = search.trim()
    ? menuItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase())
      )
    : menuItems

  const visibleCategories = search.trim()
    ? categories.filter(cat => filteredItems.some(i => i.category === cat))
    : categories

  const handlePlaceOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setOrderError('Please fill in your name, phone, and delivery address.')
      return
    }
    setIsPlacingOrder(true)
    setOrderError('')
    try {
      const supabase = createClient()
      const normalizedPhone = normalizePhone(customerPhone)
      const { data: existingCustomer } = await supabase
        .from('customers').select('customer_id')
        .eq('kitchen_id', kitchen.kitchen_id).eq('phone', normalizedPhone).maybeSingle()
      let customerId = existingCustomer?.customer_id
      if (!customerId) {
        const { data: newCustomer, error: ce } = await supabase
          .from('customers')
          .insert({ kitchen_id: kitchen.kitchen_id, name: customerName.trim(), email: customerEmail.trim() || null, phone: normalizedPhone, total_orders: 0, total_spend: 0 })
          .select('customer_id').single()
        if (ce) throw ce
        customerId = newCustomer.customer_id
      }
      const { data: newOrder, error: oe } = await supabase
        .from('orders')
        .insert({ kitchen_id: kitchen.kitchen_id, customer_id: customerId, status: 'pending', total_amount: cartTotal + deliveryFee, delivery_address: deliveryAddress.trim(), notes: orderNotes.trim() || null })
        .select('order_id').single()
      if (oe) throw oe
      const { error: ie } = await supabase.from('order_items').insert(
        cartItems.map(item => ({ order_id: newOrder.order_id, item_id: item.item_id, quantity: item.quantity, unit_price: item.price }))
      )
      if (ie) throw ie
      clearCart()
      localStorage.setItem(`last_order_${slug}`, JSON.stringify({ orderId: newOrder.order_id, status: 'pending' }))
      router.push(`/${slug}/track?order_id=${newOrder.order_id}`)
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order.')
      setIsPlacingOrder(false)
    }
  }

  const handleTrackOrder = async () => {
    const raw = trackInput.trim()
    if (!raw) return
    setTrackLoading(true)
    setTrackError('')
    setTrackedOrder(null)
    const supabase = createClient()
    const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
    let orderId: string | null = null
    if (isFullUuid) {
      orderId = raw.toLowerCase()
    } else {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('find_order_by_prefix', { p_prefix: raw.toLowerCase(), p_kitchen_id: kitchen.kitchen_id })
      if (rpcError || !rpcData?.length) {
        setTrackLoading(false)
        setTrackError('No order found with that ID.')
        return
      }
      orderId = rpcData[0].order_id
    }
    const { data, error } = await supabase
      .from('orders').select('*, order_items(*, menu_items(name))')
      .eq('order_id', orderId!).eq('kitchen_id', kitchen.kitchen_id).single()
    setTrackLoading(false)
    if (error || !data) {
      setTrackError('No order found with that ID for this restaurant.')
    } else {
      setTrackedOrder(data)
    }
  }

  return (
    <div className="mc-root" style={{ minHeight: '100vh', backgroundColor: '#0D0C0A', color: '#F2EDE4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{FONTS + STYLES}</style>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <header style={{ position: 'relative', height: '280px', overflow: 'hidden', flexShrink: 0 }}>
        {heroImage
          ? <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) brightness(0.65)', transform: 'scale(1.06)' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1E1C18 0%, #2D2620 50%, #1A1510 100%)' }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,12,10,0.25) 0%, rgba(13,12,10,0.8) 55%, #0D0C0A 100%)' }} />

        <div style={{ position: 'relative', height: '100%', padding: '20px 48px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {showDashboardButton
              ? (
                <button onClick={() => router.push('/dashboard')} className="mc-chip-btn" style={{ backdropFilter: 'blur(8px)' }}>
                  <ArrowLeft size={12} strokeWidth={1.5} /> Dashboard
                </button>
              )
              : <div />
            }
            <button
              onClick={() => setCartOpen(true)}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(30,28,24,0.85)', border: '1px solid #2A2722', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', backdropFilter: 'blur(8px)' }}
            >
              <ShoppingBag size={18} strokeWidth={1.5} color="#F2EDE4" />
              {itemCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#E8622A', fontSize: '10px', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Bottom: kitchen info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(30,28,24,0.9)', border: '1px solid #2A2722', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '14px', color: '#E8622A' }}>{kitchenInitials}</span>
              </div>
              <div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: '52px', lineHeight: 1, color: '#F2EDE4', letterSpacing: '-0.5px', margin: 0 }}>
                  {kitchen.name}
                </h1>
                {kitchen.city && (
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '11px', color: '#8C8479', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '4px 0 0' }}>
                    {kitchen.city}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="mc-chip-btn" style={{ cursor: 'default' }}>⏱ 25–35 min</span>
              {avgRating && (
                <span className="mc-chip-btn" style={{ cursor: 'default' }}>★ {avgRating} ({feedbacks.length} reviews)</span>
              )}
              <button className="mc-chip-btn" onClick={() => setIsTrackOpen(true)}>
                <Package size={12} strokeWidth={1.5} /> Track Order
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── STICKY CATEGORY NAV ──────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(13,12,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #2A2722', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 48px', height: '56px' }}>
        <div className="hide-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1 }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat && !search.trim()
            return (
              <button
                key={cat}
                onClick={() => { setSearch(''); scrollToCategory(cat) }}
                style={{
                  flexShrink: 0, padding: '6px 16px', borderRadius: '100px',
                  border: `1px solid ${isActive ? 'transparent' : '#2A2722'}`,
                  background: isActive ? '#E8622A' : '#1E1C18',
                  color: isActive ? '#F2EDE4' : '#8C8479',
                  fontFamily: "'DM Sans',sans-serif", fontSize: '13px', fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer', transition: 'all 200ms ease', whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
        <div style={{ position: 'relative', flexShrink: 0, width: '200px' }}>
          <input
            className="mc-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the menu..."
            style={{ height: '36px', borderRadius: '100px', padding: '0 36px 0 16px', fontSize: '13px' }}
          />
          <Search size={14} strokeWidth={1.5} color="#8C8479" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ── MENU SECTIONS ────────────────────────────────────── */}
      <div ref={mainRef} style={{ padding: '0 48px', paddingBottom: itemCount > 0 ? '120px' : '64px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', color: '#F2EDE4', marginBottom: '8px' }}>Nothing here.</p>
            <p style={{ fontSize: '14px', color: '#8C8479' }}>Try a different search.</p>
          </div>
        ) : (
          visibleCategories.map((cat, catIdx) => {
            const items = filteredItems.filter(i => i.category === cat)
            return (
              <section
                key={cat}
                id={`category-${cat}`}
                ref={el => { sectionRefs.current[cat] = el }}
                style={{ marginTop: catIdx === 0 ? '40px' : '64px' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: '32px', color: '#F2EDE4', margin: 0 }}>{cat}</h2>
                  <span style={{ fontSize: '13px', color: '#8C8479' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {items.map((item) => {
                    const qty = getCartQty(item.item_id)
                    const isFeatured = (item as any).is_featured as boolean | undefined
                    return (
                      <div
                        key={item.item_id}
                        className={`mc-card mc-menu-card${!item.is_active ? ' unavailable' : ''}`}
                      >
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#1E1C18', overflow: 'hidden' }}>
                          {item.image_url
                            ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: item.is_active ? 1 : 0.45 }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', color: '#3D3A34' }}>{item.name.substring(0, 2)}</span>
                              </div>
                          }
                          {!item.is_active && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,12,10,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3D3A34' }}>Unavailable</span>
                            </div>
                          )}
                          {isFeatured && (
                            <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#C9A84C', color: '#0D0C0A', borderRadius: '100px', padding: '2px 8px', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              ✦ Popular
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: '14px 16px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 500, fontSize: '15px', color: '#F2EDE4', lineHeight: 1.3, flex: 1, margin: 0 }}>
                              {item.name}
                            </p>
                            {item.is_active && (
                              qty === 0
                                ? (
                                  <button className="mc-add-btn" onClick={() => addToCart(item)}>
                                    <Plus size={16} strokeWidth={2.5} color="white" />
                                  </button>
                                )
                                : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1E1C18', borderRadius: '100px', padding: '3px 6px', flexShrink: 0 }}>
                                    <button
                                      onClick={() => updateQuantity(item.item_id, qty - 1)}
                                      style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2A2722', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Minus size={11} strokeWidth={2} color="#F2EDE4" />
                                    </button>
                                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', fontWeight: 500, color: '#F2EDE4', minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                                    <button
                                      onClick={() => updateQuantity(item.item_id, qty + 1)}
                                      style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E8622A', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Plus size={11} strokeWidth={2.5} color="white" />
                                    </button>
                                  </div>
                                )
                            )}
                          </div>
                          {item.description && (
                            <p style={{ fontSize: '12px', color: '#8C8479', marginTop: '5px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.description}
                            </p>
                          )}
                          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '15px', fontWeight: 500, color: '#C9A84C', marginTop: '10px', marginBottom: 0 }}>
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}

        {/* ── REVIEWS STRIP ──────────────────────────────────── */}
        {feedbacks.length > 0 && (
          <section style={{ marginTop: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '36px' }}>
              {/* Pinned rating */}
              <div style={{ flexShrink: 0, paddingTop: '4px' }}>
                <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '56px', lineHeight: 1, color: '#C9A84C', margin: 0 }}>{avgRating}</p>
                <div style={{ display: 'flex', gap: '2px', marginTop: '6px' }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ color: parseFloat(avgRating || '0') >= s ? '#C9A84C' : '#2A2722', fontSize: '14px' }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#8C8479', marginTop: '4px' }}>{feedbacks.length} reviews</p>
              </div>

              {/* Scrollable cards */}
              <div className="hide-scroll" style={{ display: 'flex', gap: '16px', overflowX: 'auto', flex: 1, paddingBottom: '8px' }}>
                {feedbacks.map(fb => {
                  const name = fb.customers?.name || 'Guest'
                  return (
                    <div key={fb.feedback_id} style={{ width: '280px', flexShrink: 0, background: '#161512', border: '1px solid #2A2722', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ color: s <= fb.rating ? '#C9A84C' : '#2A2722', fontSize: '14px' }}>★</span>
                        ))}
                      </div>
                      {fb.comment && (
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontStyle: 'italic', fontSize: '14px', color: '#F2EDE4', lineHeight: 1.6, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          &ldquo;{fb.comment}&rdquo;
                        </p>
                      )}
                      <p style={{ fontSize: '12px', color: '#8C8479' }}>— {name} · {timeAgo(fb.created_at)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer style={{ marginTop: '72px', borderTop: '1px solid #2A2722', padding: '32px 0' }}>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: '20px', color: '#F2EDE4', marginBottom: '4px' }}>{kitchen.name}</p>
          {kitchen.city && (
            <p style={{ fontSize: '12px', color: '#8C8479', marginBottom: '4px' }}>{kitchen.city} · Est. 2024</p>
          )}
          <p style={{ fontSize: '11px', color: '#3D3A34' }}>Powered by CloudKitchen</p>
        </footer>
      </div>

      {/* ── STICKY BOTTOM CART BAR ───────────────────────────── */}
      {itemCount > 0 && (
        <div className="mc-cart-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(30,28,24,0.95)', borderTop: '1px solid #2A2722', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center' }}>
          <div style={{ margin: '10px 12px 10px 16px', padding: '6px 14px', background: '#E8622A', borderRadius: '100px', fontFamily: "'DM Sans',sans-serif", fontSize: '12px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <ShoppingBag size={13} strokeWidth={2} color="white" />
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            style={{ flex: 1, height: '56px', background: '#E8622A', border: 'none', color: '#F2EDE4', fontFamily: "'DM Sans',sans-serif", fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}
          >
            <span>View Cart</span>
            <span style={{ fontFamily: "'DM Mono',monospace" }}>{formatCurrency(cartTotal)} →</span>
          </button>
        </div>
      )}

      {/* ── CART BOTTOM SHEET ────────────────────────────────── */}
      {cartOpen && (
        <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60 }} />
      )}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, height: '88vh', background: '#161512', borderRadius: '24px 24px 0 0', transform: cartOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', background: '#2A2722', borderRadius: '100px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 16px', flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: '28px', color: '#F2EDE4', margin: 0 }}>Your Order</h2>
          <button onClick={() => setCartOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1E1C18', border: '1px solid #2A2722', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} strokeWidth={1.5} color="#8C8479" />
          </button>
        </div>

        <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 32px' }}>
          {/* Cart items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {cartItems.map(item => (
              <div key={item.item_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#1E1C18', borderRadius: '12px', border: '1px solid #2A2722' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: '#242220', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: '16px', color: '#3D3A34' }}>{item.name.substring(0, 2)}</span>
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 500, fontSize: '14px', color: '#F2EDE4', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', color: '#C9A84C', margin: '2px 0 0' }}>{formatCurrency(item.price * item.quantity)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => updateQuantity(item.item_id, item.quantity - 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2A2722', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={11} strokeWidth={2} color="#F2EDE4" />
                  </button>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', fontWeight: 500, color: '#F2EDE4', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.item_id, item.quantity + 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E8622A', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={11} strokeWidth={2.5} color="white" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: '16px 0', borderTop: '1px solid #2A2722', borderBottom: '1px solid #2A2722', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#8C8479' }}>Subtotal</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', color: '#8C8479' }}>{formatCurrency(cartTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: '#8C8479' }}>Delivery fee</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', color: '#8C8479' }}>{formatCurrency(deliveryFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#F2EDE4' }}>Total</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '18px', fontWeight: 500, color: '#F2EDE4' }}>{formatCurrency(cartTotal + deliveryFee)}</span>
            </div>
          </div>

          {/* Checkout form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <input className="mc-input" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Delivery address" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input className="mc-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name" />
              <input className="mc-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" type="tel" />
            </div>
            <input className="mc-input" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Email (optional)" type="email" />
            <textarea className="mc-textarea" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Any special requests?" />
          </div>

          {orderError && <p style={{ fontSize: '13px', color: '#D95F5F', marginBottom: '12px' }}>{orderError}</p>}

          <button
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder}
            style={{ width: '100%', padding: '16px', background: isPlacingOrder ? '#2A2722' : '#E8622A', border: 'none', borderRadius: '16px', color: '#F2EDE4', fontFamily: "'DM Sans',sans-serif", fontSize: '16px', fontWeight: 600, cursor: isPlacingOrder ? 'not-allowed' : 'pointer', transition: 'background 150ms ease' }}
          >
            {isPlacingOrder ? 'Placing Order...' : `Place Order · ${formatCurrency(cartTotal + deliveryFee)}`}
          </button>
        </div>
      </div>

      {/* ── TRACK ORDER PANEL ────────────────────────────────── */}
      {isTrackOpen && (
        <div onClick={() => setIsTrackOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60 }} />
      )}
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px', background: '#161512', borderLeft: '1px solid #2A2722', zIndex: 70, display: 'flex', flexDirection: 'column', transform: isTrackOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #2A2722', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: '24px', color: '#F2EDE4', margin: 0 }}>Track Order</h2>
          <button onClick={() => setIsTrackOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={20} strokeWidth={1.5} color="#8C8479" />
          </button>
        </div>
        <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <p style={{ fontSize: '13px', color: '#8C8479', marginBottom: '12px', lineHeight: 1.5 }}>Enter your Order ID from your confirmation.</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              className="mc-input"
              value={trackInput}
              onChange={e => { setTrackInput(e.target.value); setTrackError('') }}
              onKeyDown={e => e.key === 'Enter' && handleTrackOrder()}
              placeholder="e.g. B91D44AA"
              style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px' }}
            />
            <button
              onClick={handleTrackOrder}
              disabled={trackLoading}
              style={{ flexShrink: 0, height: '44px', padding: '0 20px', background: '#E8622A', border: 'none', borderRadius: '12px', color: '#F2EDE4', fontFamily: "'DM Sans',sans-serif", fontSize: '13px', fontWeight: 600, cursor: trackLoading ? 'not-allowed' : 'pointer' }}
            >
              {trackLoading ? '...' : 'Find'}
            </button>
          </div>
          {trackError && <p style={{ fontSize: '13px', color: '#D95F5F', marginBottom: '16px' }}>{trackError}</p>}
          {trackedOrder && (() => {
            const currentIdx = STATUS_STEPS.indexOf(trackedOrder.status)
            const isCancelled = trackedOrder.status === 'cancelled'
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', color: '#8C8479' }}>#{trackedOrder.order_id.substring(0, 8).toUpperCase()}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: isCancelled ? 'rgba(217,95,95,0.15)' : 'rgba(76,175,125,0.15)', color: isCancelled ? '#D95F5F' : '#4CAF7D' }}>
                    {STATUS_LABELS[trackedOrder.status] || trackedOrder.status}
                  </span>
                </div>
                {!isCancelled && (
                  <div style={{ marginBottom: '24px' }}>
                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx <= currentIdx
                      const isNow = idx === currentIdx
                      return (
                        <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '2px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: done ? '#E8622A' : '#2A2722', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isNow ? '0 0 0 3px rgba(232,98,42,0.2)' : 'none' }}>
                              {done && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                            </div>
                            {idx < STATUS_STEPS.length - 1 && <div style={{ width: '2px', height: '18px', background: done ? '#E8622A' : '#2A2722' }} />}
                          </div>
                          <span style={{ fontSize: '13px', paddingTop: '1px', fontWeight: isNow ? 600 : 400, color: done ? '#F2EDE4' : '#3D3A34' }}>{STATUS_LABELS[step]}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ borderTop: '1px solid #2A2722', paddingTop: '16px' }}>
                  <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C8479', marginBottom: '10px' }}>Items</p>
                  {(trackedOrder.order_items || []).map((oi: any) => (
                    <div key={oi.order_item_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ fontSize: '13px', color: '#F2EDE4' }}>{oi.quantity}× {oi.menu_items?.name}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', color: '#C9A84C' }}>{formatCurrency(oi.unit_price * oi.quantity)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2A2722', marginTop: '8px', paddingTop: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F2EDE4' }}>Total</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', color: '#F2EDE4' }}>{formatCurrency(trackedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
