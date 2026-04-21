'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from './CartContext'
import { CartSheet } from './CartSheet'
import { MenuItem, Kitchen } from '@/lib/types'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { ArrowLeft, ShoppingBag, Search, Heart, Plus, Star, X, Package } from 'lucide-react'
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

const ORDER_STEPS = ['pending', 'confirmed', 'preparing', 'ready'] as const
const STEP_LABELS: Record<string, string> = {
  pending: 'Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Dispatched',
}

export function MenuPageClient({ kitchen, menuItems, feedbacks, categories, slug, showDashboardButton }: Props) {
  const router = useRouter()
  const { cartItems, itemCount, addToCart, updateQuantity } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [isReviewsOpen, setIsReviewsOpen] = useState(false)
  const [isTrackOpen, setIsTrackOpen] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewRatingHover, setReviewRatingHover] = useState(0)
  const [trackInput, setTrackInput] = useState('')
  const [trackedOrder, setTrackedOrder] = useState<any>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(categories[0] || '')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [activeOrder, setActiveOrder] = useState<{ orderId: string; status: string } | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const stored = localStorage.getItem(`favorites_${kitchen.kitchen_id}`)
    if (stored) {
      try { setFavorites(new Set(JSON.parse(stored))) } catch {}
    }
  }, [kitchen.kitchen_id])

  useEffect(() => {
    const stored = localStorage.getItem(`last_order_${slug}`)
    if (stored) {
      try { setActiveOrder(JSON.parse(stored)) } catch {}
    }
  }, [slug])

  useEffect(() => {
    if (!mainRef.current || categories.length === 0) return
    const observers: IntersectionObserver[] = []
    categories.forEach(cat => {
      const el = sectionRefs.current[cat]
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat) },
        { root: mainRef.current, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [categories])

  const openCart = () => { setCartOpen(true); setIsReviewsOpen(false); setIsTrackOpen(false) }
  const openReviews = () => { setIsReviewsOpen(true); setCartOpen(false); setIsTrackOpen(false) }
  const openTrack = () => { setIsTrackOpen(true); setCartOpen(false); setIsReviewsOpen(false) }

  const handleTrackOrder = async () => {
    const id = trackInput.trim().toLowerCase()
    if (!id) return
    setTrackLoading(true)
    setTrackError('')
    setTrackedOrder(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .filter('order_id::text', 'ilike', `${id}%`)
      .eq('kitchen_id', kitchen.kitchen_id)
      .single()
    setTrackLoading(false)
    if (error || !data) {
      setTrackError('No order found with that ID for this restaurant.')
    } else {
      setTrackedOrder(data)
    }
  }

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      localStorage.setItem(`favorites_${kitchen.kitchen_id}`, JSON.stringify(Array.from(next)))
      return next
    })
  }

  const scrollToCategory = (cat: string) => {
    sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveCategory(cat)
  }

  const getCartQty = (itemId: string) => cartItems.find(i => i.item_id === itemId)?.quantity ?? 0

  const kitchenInitials = kitchen.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const filteredItems = search.trim()
    ? menuItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase())
      )
    : menuItems

  const visibleCategories = search.trim()
    ? categories.filter(cat => filteredItems.some(i => i.category === cat))
    : categories

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, var(--bg-start), var(--bg-end))',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
    }}>
      {/* ─── PANEL 1: LEFT SIDEBAR ─────────────────────────── */}
      <aside style={{
        width: '240px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: '0 18px 18px 0',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '56px', marginBottom: '32px', flexShrink: 0 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', color: 'var(--accent)' }}>{kitchenInitials}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.3 }}>{kitchen.name}</span>
        </div>

        {showDashboardButton && (
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', height: '38px',
              borderRadius: '10px', padding: '0 12px', marginBottom: '24px',
              background: 'var(--bg-start)', border: '1px solid var(--border)',
              cursor: 'pointer', width: '100%', transition: 'background var(--transition)',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-start)')}
          >
            <ArrowLeft size={16} strokeWidth={1.5} color="var(--text-secondary)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)' }}>Back to Dashboard</span>
          </button>
        )}

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>Menu</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {categories.map(cat => {
              const isActive = activeCategory === cat
              const count = menuItems.filter(i => i.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', height: '40px',
                    borderRadius: '10px', padding: '0 12px', cursor: 'pointer', width: '100%',
                    background: isActive ? 'var(--accent-surface)' : 'transparent',
                    border: 'none', transition: 'background var(--transition)',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--border)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400, flex: 1, textAlign: 'left' }}>
                    {cat}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: 'auto', flexShrink: 0, paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', background: 'var(--bg-start)', border: '1px solid var(--border)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)' }}>Open Now</span>
          </div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>Powered by Cloud Kitchen</p>
        </div>
      </aside>

      {/* ─── PANEL 2: MAIN CONTENT ─────────────────────────── */}
      <main
        ref={mainRef}
        style={{ flex: 1, overflowY: 'auto', padding: '0 24px 48px', minWidth: 0 }}
      >
        {/* Row 1 — Utility bar (sticky) */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'linear-gradient(135deg, var(--bg-start), var(--bg-end))',
          borderBottom: '1px solid var(--border)',
          padding: '12px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '280px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Search size={16} strokeWidth={1.5} color="var(--text-muted)" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search menu..."
              style={{
                width: '100%', height: '40px', borderRadius: '100px',
                border: '1px solid var(--border)', background: 'var(--surface)',
                paddingLeft: '40px', paddingRight: '16px', fontSize: '14px',
                color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
              }}
            />
          </div>

          {/* Icon buttons */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {/* Reviews */}
            <button
              onClick={openReviews}
              title="Reviews"
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            >
              <Star size={18} strokeWidth={1.5} color="var(--text-secondary)" />
            </button>

            {/* Track Order */}
            <button
              onClick={openTrack}
              title="Track Order"
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            >
              <Package size={18} strokeWidth={1.5} color="var(--text-secondary)" />
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              title="View Cart"
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--accent)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', transition: 'opacity var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <ShoppingBag size={18} strokeWidth={1.5} color="white" />
              {itemCount > 0 && (
                <div style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '18px', height: '18px',
                  background: '#1A1820', borderRadius: '50%',
                  fontSize: '11px', fontFamily: 'var(--font-ui)', fontWeight: 700,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {itemCount}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Row 2 — Welcome banner */}
        <div style={{ padding: '24px 0 20px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
            color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
          }}>
            {kitchen.welcome_banner || `Welcome to ${kitchen.name}!`}
          </h1>
          {search.trim() && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Showing results for &ldquo;{search}&rdquo;
            </p>
          )}
        </div>

        {/* Menu sections */}
        {filteredItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', margin: '0 0 8px' }}>Menu coming soon.</p>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>No items available right now.</p>
          </div>
        ) : (
          visibleCategories.map((cat, catIdx) => {
            const items = filteredItems.filter(i => i.category === cat)
            return (
              <section
                key={cat}
                id={`category-${cat}`}
                ref={el => { sectionRefs.current[cat] = el }}
                style={{ marginTop: catIdx === 0 ? 0 : '36px' }}
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)', margin: '0 0 16px' }}>{cat}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {items.map(item => {
                    const qty = getCartQty(item.item_id)
                    const isFav = favorites.has(item.item_id)
                    const initials = item.name.split(' ').map(w => w[0]).join('').substring(0, 2)
                    return (
                      <div
                        key={item.item_id}
                        className="card"
                        style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', cursor: 'pointer', opacity: item.is_active ? 1 : 0.5 }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '160px', background: 'var(--bg-start)', overflow: 'hidden', flexShrink: 0 }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-muted)' }}>{initials}</span>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); toggleFavorite(item.item_id) }}
                            style={{
                              position: 'absolute', top: '10px', right: '10px',
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: 'white', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                            }}
                          >
                            <Heart
                              size={16}
                              strokeWidth={1.5}
                              color={isFav ? '#E74C3C' : 'var(--text-muted)'}
                              fill={isFav ? '#E74C3C' : 'none'}
                            />
                          </button>
                        </div>

                        <div style={{ padding: '14px' }}>
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                          {item.description && (
                            <p style={{
                              fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--text-muted)',
                              margin: '0 0 12px', lineHeight: 1.5,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>{item.description}</p>
                          )}
                          {!item.description && <div style={{ marginBottom: '12px' }} />}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(item.price)}</span>

                            {!item.is_active ? (
                              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--text-muted)' }}>Unavailable</span>
                            ) : qty === 0 ? (
                              <button
                                onClick={() => addToCart(item)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  background: 'var(--accent)', color: 'white',
                                  borderRadius: '100px', height: '32px', padding: '0 14px',
                                  fontSize: '13px', fontFamily: 'var(--font-ui)', fontWeight: 600,
                                  border: 'none', cursor: 'pointer', transition: 'opacity var(--transition)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                              >
                                <Plus size={14} strokeWidth={2} color="white" />
                                Add
                              </button>
                            ) : (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--accent-surface)', color: 'var(--accent)',
                                borderRadius: '100px', height: '32px', padding: '0 10px',
                              }}>
                                <button
                                  onClick={() => updateQuantity(item.item_id, qty - 1)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: '18px', padding: 0, width: '20px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >−</button>
                                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                                <button
                                  onClick={() => updateQuantity(item.item_id, qty + 1)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: '18px', padding: 0, width: '20px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </main>

      {/* ─── REVIEWS SLIDE-OVER ────────────────────────────── */}
      {isReviewsOpen && (
        <div
          onClick={() => setIsReviewsOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 90 }}
        />
      )}

      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '400px',
        height: '100vh',
        background: 'var(--surface)',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
        borderRadius: '18px 0 0 18px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transform: isReviewsOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Reviews</h2>
          <button
            onClick={() => setIsReviewsOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color var(--transition)', borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {/* Write a review */}
          <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>Leave a Review</p>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(star => {
                  const active = star <= (reviewRatingHover || reviewRating)
                  return (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewRatingHover(star)}
                      onMouseLeave={() => setReviewRatingHover(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    >
                      <Star
                        size={20}
                        strokeWidth={1.5}
                        color={active ? 'var(--accent)' : 'var(--border)'}
                        fill={active ? 'var(--accent)' : 'none'}
                      />
                    </button>
                  )
                })}
              </div>
              <button
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '100px' }}
                onClick={() => { setReviewText(''); setReviewRating(0) }}
              >
                Submit
              </button>
            </div>
          </div>

          {/* Reviews list */}
          <div style={{ paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>All Reviews</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-muted)' }}>
                {feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {feedbacks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
                <Star size={40} strokeWidth={1.5} color="var(--text-muted)" />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-muted)', margin: '12px 0 4px' }}>No reviews yet.</p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Be the first to leave one.</p>
              </div>
            ) : (
              feedbacks.map((fb, idx) => {
                const name = fb.customers?.name || 'Guest'
                const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
                return (
                  <div key={fb.feedback_id} style={{ padding: '14px 0', borderBottom: idx < feedbacks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '12px', color: 'var(--accent)' }}>{initials}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{name}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(fb.created_at)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={12}
                          strokeWidth={1.5}
                          color={star <= fb.rating ? 'var(--accent)' : 'var(--border)'}
                          fill={star <= fb.rating ? 'var(--accent)' : 'none'}
                        />
                      ))}
                    </div>

                    {fb.comment && (
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                        {fb.comment}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── TRACK ORDER SLIDE-OVER ───────────────────────── */}
      {isTrackOpen && (
        <div
          onClick={() => setIsTrackOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 90 }}
        />
      )}

      <div style={{
        position: 'fixed', right: 0, top: 0, width: '400px', height: '100vh',
        background: 'var(--surface)', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
        borderRadius: '18px 0 0 18px', zIndex: 100,
        display: 'flex', flexDirection: 'column',
        transform: isTrackOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Track Order</h2>
          <button
            onClick={() => setIsTrackOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color var(--transition)', borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Search input */}
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
            Enter the Order ID you received after placing your order.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              value={trackInput}
              onChange={e => { setTrackInput(e.target.value); setTrackError('') }}
              onKeyDown={e => e.key === 'Enter' && handleTrackOrder()}
              placeholder="e.g. 7A7DDD63..."
              style={{ flex: 1, height: '40px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
            />
            <button
              onClick={handleTrackOrder}
              disabled={trackLoading}
              className="btn-primary"
              style={{ height: '40px', padding: '0 18px', fontSize: '13px', flexShrink: 0 }}
            >
              {trackLoading ? '...' : 'Find'}
            </button>
          </div>

          {/* Error */}
          {trackError && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>{trackError}</p>
          )}

          {/* Result */}
          {trackedOrder && (() => {
            const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'out_for_delivery', 'delivered']
            const STATUS_LABELS: Record<string, string> = {
              pending: 'Received', confirmed: 'Confirmed', preparing: 'Preparing',
              ready: 'Ready', dispatched: 'Dispatched', out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
            }
            const currentIdx = STATUS_STEPS.indexOf(trackedOrder.status)
            const isCancelled = trackedOrder.status === 'cancelled'

            return (
              <div>
                {/* Order ID + status badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    #{trackedOrder.order_id.substring(0, 8).toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
                    padding: '4px 10px', borderRadius: '100px',
                    background: isCancelled ? '#fee2e2' : 'var(--accent-surface)',
                    color: isCancelled ? '#dc2626' : 'var(--accent)',
                  }}>
                    {STATUS_LABELS[trackedOrder.status] || trackedOrder.status}
                  </span>
                </div>

                {/* Progress steps */}
                {!isCancelled && (
                  <div style={{ marginBottom: '24px' }}>
                    {STATUS_STEPS.filter(s => s !== 'cancelled').map((step, idx) => {
                      const done = idx <= currentIdx
                      const isNow = idx === currentIdx
                      return (
                        <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: idx < STATUS_STEPS.length - 2 ? '4px' : '0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                              background: done ? 'var(--accent)' : 'var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: isNow ? '0 0 0 3px var(--accent-surface)' : 'none',
                              transition: 'background 300ms',
                            }}>
                              {done && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                            </div>
                            {idx < STATUS_STEPS.length - 2 && (
                              <div style={{ width: '2px', height: '20px', background: done ? 'var(--accent)' : 'var(--border)', transition: 'background 300ms' }} />
                            )}
                          </div>
                          <span style={{
                            fontFamily: 'var(--font-ui)', fontSize: '13px', paddingTop: '2px',
                            fontWeight: isNow ? 600 : 400,
                            color: done ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}>
                            {STATUS_LABELS[step]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Order items */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>Items</p>
                  {(trackedOrder.order_items || []).map((oi: any) => (
                    <div key={oi.order_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {oi.quantity}× {oi.menu_items?.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {formatCurrency(oi.unit_price * oi.quantity)}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(trackedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Cart sheet */}
      <CartSheet
        kitchenId={kitchen.kitchen_id}
        slug={slug}
        open={cartOpen}
        onOpenChange={setCartOpen}
      />
    </div>
  )
}
