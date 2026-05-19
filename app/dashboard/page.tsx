import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, shortId } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'

export const revalidate = 0

function getPKTStartOfDayISO() {
  const now = new Date()
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  const utcYear = pktTime.getUTCFullYear()
  const utcMonth = pktTime.getUTCMonth()
  const utcDate = pktTime.getUTCDate()
  const pktStartOfDayUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate, -5, 0, 0, 0))
  return pktStartOfDayUTC.toISOString()
}

function calcAvg(list: { rating: number }[]) {
  if (list.length === 0) return 0
  return list.reduce((acc, f) => acc + f.rating, 0) / list.length
}

export default async function DashboardOverview() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isOwner = profile.role === 'owner'
  const kitchenId = profile.kitchen_id
  const pktStartOfDay = getPKTStartOfDayISO()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { data: todayOrders },
    { data: deliveredOrders30 },
    { data: feedbacks },
    { count: approvalsCount },
    { count: lowStockCount },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('*, customers(name, phone), order_items(*, menu_items(name))')
      .eq('kitchen_id', kitchenId)
      .gte('created_at', pktStartOfDay)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('order_items(quantity, unit_price, menu_items(name))')
      .eq('kitchen_id', kitchenId)
      .eq('status', 'delivered')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('feedback')
      .select('rating, created_at, comment, customers(name)')
      .eq('kitchen_id', kitchenId)
      .order('created_at', { ascending: false }),
    isOwner
      ? supabase.from('notifications_log').select('*', { count: 'exact', head: true }).eq('kitchen_id', kitchenId).eq('status', 'pending')
      : Promise.resolve({ count: 0, data: null, error: null }),
    supabase.from('notifications_log').select('*', { count: 'exact', head: true }).eq('kitchen_id', kitchenId).eq('type', 'low_stock').eq('status', 'pending'),
  ])

  const orders = todayOrders || []
  const totalOrdersCount = orders.length
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total_amount, 0)
  const pendingApprovalsCount = approvalsCount || 0
  const unresolvedLowStock = lowStockCount || 0

  // 30-day top selling items
  const itemMap30: Record<string, { qty: number; rev: number }> = {}
  ;(deliveredOrders30 || []).forEach(o => {
    o.order_items?.forEach((oi: any) => {
      const name = oi.menu_items?.name || 'Unknown Item'
      if (!itemMap30[name]) itemMap30[name] = { qty: 0, rev: 0 }
      itemMap30[name].qty += oi.quantity
      itemMap30[name].rev += oi.quantity * oi.unit_price
    })
  })
  const topItems30 = Object.entries(itemMap30)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 10)

  // Today's top items
  const itemMapToday: Record<string, { name: string; quantity: number; revenue: number }> = {}
  orders.forEach(order => {
    if (order.status === 'cancelled') return
    order.order_items.forEach((oi: any) => {
      const name = oi.menu_items?.name || 'Unknown Item'
      if (!itemMapToday[name]) itemMapToday[name] = { name, quantity: 0, revenue: 0 }
      itemMapToday[name].quantity += oi.quantity
      itemMapToday[name].revenue += oi.quantity * oi.unit_price
    })
  })
  const topSellingItems = Object.values(itemMapToday).sort((a, b) => b.quantity - a.quantity).slice(0, 5)

  // Rating calculations — lifetime, last 30d, last 7d
  const feedbackList = feedbacks || []
  const feedbacks30d = feedbackList.filter(f => new Date(f.created_at) >= thirtyDaysAgo)
  const feedbacks7d  = feedbackList.filter(f => new Date(f.created_at) >= sevenDaysAgo)

  const avgRating    = calcAvg(feedbackList)
  const avgRating30d = calcAvg(feedbacks30d)
  const avgRating7d  = calcAvg(feedbacks7d)

  const ratingDist = [0, 0, 0, 0, 0]
  feedbackList.forEach(f => { ratingDist[f.rating - 1]++ })

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`.dash-link:hover { text-decoration: underline; }`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', marginBottom: '2px' }}>Overview</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-3)' }}>{todayLabel}</span>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          label="Today's Revenue"
          value={isOwner ? formatCurrency(revenue) : '—'}
          blurred={!isOwner}
          subline={isOwner ? { text: '↑ Live total', color: 'var(--color-green)' } : { text: 'Not available for your role', color: 'var(--color-ink-3)' }}
        />
        <StatCard
          label="Orders Today"
          value={String(totalOrdersCount)}
          subline={{ text: totalOrdersCount > 0 ? 'Orders placed' : 'No orders yet', color: 'var(--color-ink-3)' }}
        />
        <StatCard
          label="Low Stock Items"
          value={String(unresolvedLowStock)}
          leftBorder={unresolvedLowStock > 0 ? 'var(--color-amber)' : 'var(--color-green)'}
          subline={unresolvedLowStock > 0
            ? { text: 'Action required', color: 'var(--color-amber)' }
            : { text: 'Inventory healthy', color: 'var(--color-green)' }}
        />
        <StatCard
          label="Pending Approvals"
          value={isOwner ? String(pendingApprovalsCount) : '—'}
          leftBorder={isOwner && pendingApprovalsCount > 0 ? 'var(--color-red)' : undefined}
          valueColor={isOwner && pendingApprovalsCount > 0 ? 'var(--color-red)' : undefined}
          subline={{ text: 'Awaiting review', color: 'var(--color-ink-3)' }}
        />
      </div>

      {/* Recent Orders — full width */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)' }}>Recent Orders</h2>
          <a href="/dashboard/orders" className="dash-link" style={{ fontSize: '13px', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
            View all orders →
          </a>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '14px' }}>
            No orders yet today.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map(order => (
                <tr key={order.order_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-2)' }}>
                    #{shortId(order.order_id)}
                  </td>
                  <td style={{ fontSize: '14px', color: 'var(--color-ink)' }}>
                    {order.customers?.name || 'Guest'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                    {isOwner ? formatCurrency(order.total_amount) : '—'}
                  </td>
                  <td><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Owner-only sections */}
      {isOwner && (
        <>
          {/* Row: Top Items Today + Top Selling Items 30d */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Top Items Today */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)' }}>Top Items Today</h2>
              </div>
              <div style={{ padding: '0 20px' }}>
                {topSellingItems.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '14px' }}>No items sold today.</div>
                ) : (
                  topSellingItems.map((item, idx) => {
                    const maxVal = topSellingItems[0]?.quantity || 1
                    const pct = (item.quantity / maxVal) * 100
                    return (
                      <div key={idx} style={{ padding: '14px 0', borderBottom: idx < topSellingItems.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--color-ink)' }}>{item.name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>{item.quantity} sold</div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink)' }}>
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                        <div style={{ height: '4px', background: 'var(--color-border)', width: '100%', borderRadius: '100px' }}>
                          <div style={{ height: '100%', background: 'var(--color-accent)', width: `${pct}%`, borderRadius: '100px', transition: 'width 800ms ease-out' }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Top Selling Items — 30 days */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)' }}>Top Selling Items</h2>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', marginTop: '2px' }}>Last 30 days · delivered orders</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '360px' }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '20px' }}>#</th>
                      <th>Item Name</th>
                      <th style={{ textAlign: 'right' }}>Units</th>
                      <th style={{ textAlign: 'right', paddingRight: '20px' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems30.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '14px' }}>No delivered orders in the last 30 days.</td>
                      </tr>
                    ) : topItems30.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ paddingLeft: '20px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--color-accent)' }}>{item.qty}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--color-ink-3)', paddingRight: '20px' }}>{formatCurrency(item.rev)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Customer Satisfaction — full width */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)', marginBottom: '20px' }}>Customer Satisfaction</h2>

            {feedbackList.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', fontSize: '14px', color: 'var(--color-ink-3)', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                No feedback received yet.
              </div>
            ) : (
              <>
                {/* Three rating cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <RatingCard
                    label="Lifetime Reviews"
                    avg={avgRating}
                    count={feedbackList.length}
                    period="All time"
                  />
                  <RatingCard
                    label="Last Month"
                    avg={avgRating30d}
                    count={feedbacks30d.length}
                    period="Last 30 days"
                  />
                  <RatingCard
                    label="Last Week"
                    avg={avgRating7d}
                    count={feedbacks7d.length}
                    period="Last 7 days"
                  />
                </div>

                {/* Rating distribution bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = ratingDist[stars - 1]
                    const pct = (count / feedbackList.length) * 100
                    return (
                      <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-2)', width: '16px', textAlign: 'right' }}>{stars}</span>
                        <span style={{ color: 'var(--color-amber)', fontSize: '13px' }}>★</span>
                        <div style={{ flex: 1, height: '8px', background: 'var(--color-border)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--color-amber)', width: `${pct}%`, borderRadius: '100px', transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', width: '28px', textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Latest 5 feedback entries */}
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-3)', marginBottom: '14px' }}>
                    Recent Feedback
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {feedbackList.slice(0, 5).map((fb: any, idx: number) => {
                      const name = fb.customers?.name || 'Guest'
                      const initials = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: '#fff' }}>{initials}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--color-ink)' }}>{name}</span>
                              <span style={{ color: 'var(--color-amber)', fontSize: '12px', letterSpacing: '1px' }}>
                                {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                              </span>
                            </div>
                            {fb.comment && (
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-ink-2)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {fb.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function RatingCard({ label, avg, count, period }: { label: string; avg: number; count: number; period: string }) {
  const rounded = Math.round(avg)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-lg)',
      gap: '6px',
      textAlign: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-3)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '40px', color: 'var(--color-ink)', lineHeight: 1 }}>
          {count === 0 ? '—' : avg.toFixed(1)}
        </span>
        {count > 0 && (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-ink-3)' }}>/5</span>
        )}
      </div>
      <div style={{ color: 'var(--color-amber)', fontSize: '14px', letterSpacing: '2px' }}>
        {count === 0 ? '☆☆☆☆☆' : ('★'.repeat(rounded) + '☆'.repeat(5 - rounded))}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
        {count === 0 ? 'No reviews' : `${count} review${count !== 1 ? 's' : ''}`}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-3)', opacity: 0.7 }}>
        {period}
      </span>
    </div>
  )
}

function StatCard({
  label, value, subline, leftBorder, valueColor, blurred = false,
}: {
  label: string
  value: string
  subline: { text: string; color: string }
  leftBorder?: string
  valueColor?: string
  blurred?: boolean
}) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined,
    }}>
      <div style={{ fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-3)' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '32px',
        color: valueColor || 'var(--color-ink)', lineHeight: 1.1,
        filter: blurred ? 'blur(4px)' : 'none',
        userSelect: blurred ? 'none' : 'auto',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: subline.color, fontFamily: 'var(--font-body)' }}>
        {subline.text}
      </div>
    </div>
  )
}
