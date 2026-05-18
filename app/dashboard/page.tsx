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
  const startDateISO = thirtyDaysAgo.toISOString()

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
      .gte('created_at', startDateISO),
    supabase
      .from('feedback')
      .select('rating')
      .eq('kitchen_id', kitchenId),
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

  // Customer satisfaction
  const feedbackList = feedbacks || []
  let avgRating = 0
  const ratingDist = [0, 0, 0, 0, 0]
  if (feedbackList.length > 0) {
    const sum = feedbackList.reduce((acc, f) => { ratingDist[f.rating - 1]++; return acc + f.rating }, 0)
    avgRating = sum / feedbackList.length
  }

  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
  orders.forEach(order => {
    if (order.status === 'cancelled') return
    order.order_items.forEach((oi: any) => {
      const name = oi.menu_items?.name || 'Unknown Item'
      if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 }
      itemMap[name].quantity += oi.quantity
      itemMap[name].revenue += oi.quantity * oi.unit_price
    })
  })

  const topSellingItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  const liveOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing')

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`.dash-link:hover { text-decoration: underline; }`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', marginBottom: '2px' }}>
            Overview
          </h1>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-3)' }}>
          {todayLabel}
        </span>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>

        <StatCard
          label="Today's Revenue"
          value={isOwner ? formatCurrency(revenue) : '—'}
          blurred={!isOwner}
          subline={isOwner ? { text: '↑ Live total', color: 'var(--color-green)' } : { text: 'Not available for your role', color: 'var(--color-ink-3)' }}
          accent={isOwner ? undefined : 'blur'}
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
            : { text: 'Inventory healthy', color: 'var(--color-green)' }
          }
        />

        <StatCard
          label="Pending Approvals"
          value={isOwner ? String(pendingApprovalsCount) : '—'}
          leftBorder={isOwner && pendingApprovalsCount > 0 ? 'var(--color-red)' : undefined}
          valueColor={isOwner && pendingApprovalsCount > 0 ? 'var(--color-red)' : undefined}
          subline={{ text: 'Awaiting review', color: 'var(--color-ink-3)' }}
        />
      </div>

      {/* Main two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Left: Recent Orders */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                {orders.slice(0, 6).map(order => (
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
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Top Items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)' }}>Top Items Today</h2>
          </div>
          <div style={{ padding: '0 20px' }}>
            {topSellingItems.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: '14px' }}>
                No items sold today.
              </div>
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
                      {isOwner && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink)' }}>
                          {formatCurrency(item.revenue)}
                        </div>
                      )}
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
      </div>

      {/* Bottom row: Top Selling (30d) + Customer Satisfaction */}
      {isOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '24px' }}>

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

          {/* Customer Satisfaction */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)', marginBottom: '20px' }}>Customer Satisfaction</h2>

            {feedbackList.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', fontSize: '14px', color: 'var(--color-ink-3)', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                No feedback received yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '48px', color: 'var(--color-ink)', lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--color-ink-3)' }}>/5</span>
                  </div>
                  <div style={{ color: 'var(--color-amber)', fontSize: '15px', marginTop: '6px', letterSpacing: '2px' }}>
                    {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-3)', marginTop: '10px' }}>{feedbackList.length} reviews</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = ratingDist[stars - 1]
                    const pct = (count / feedbackList.length) * 100
                    return (
                      <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', width: '14px', textAlign: 'right' }}>{stars}</span>
                        <span style={{ color: 'var(--color-amber)', fontSize: '12px' }}>★</span>
                        <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--color-amber)', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', width: '20px', textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Live Orders */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Pulsing green dot */}
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-green)',
            flexShrink: 0,
            boxShadow: liveOrders.length > 0 ? '0 0 0 3px var(--color-green-bg)' : 'none',
            animation: liveOrders.length > 0 ? 'pulse-ring 2s infinite' : 'none',
          }} />
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink)' }}>
            Live Orders
          </h2>
          {liveOrders.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
              {liveOrders.length} active
            </span>
          )}
        </div>

        {liveOrders.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
              No active orders right now.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
              New orders will appear here automatically.
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {liveOrders.map(order => {
                const timeString = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                return (
                  <tr key={order.order_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-2)' }}>
                      #{shortId(order.order_id)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
                      {timeString}
                    </td>
                    <td style={{ fontSize: '14px', color: 'var(--color-ink)' }}>
                      {order.customers?.name || 'Guest'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {isOwner ? formatCurrency(order.total_amount) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}

function StatCard({
  label,
  value,
  subline,
  leftBorder,
  valueColor,
  blurred = false,
  accent,
}: {
  label: string
  value: string
  subline: { text: string; color: string }
  leftBorder?: string
  valueColor?: string
  blurred?: boolean
  accent?: string
}) {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      borderLeft: leftBorder ? `3px solid ${leftBorder}` : undefined,
    }}>
      <div style={{ fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-3)' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: '32px',
        color: valueColor || 'var(--color-ink)',
        lineHeight: 1.1,
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
