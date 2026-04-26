import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export const revalidate = 0

// Strict Server Component resolving entirely natively. NO USER STATE. NO CLIENT HOOKS.
export default async function ReportsPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()
    
  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard') // Route guarding ensuring only Owners view analytical data
  }

  const kitchenId = profile.kitchen_id

  // Time boundary constraint exactly to trailing 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30) // Adjusted slightly to exactly ensure 30 distinct intervals
  const startDateISO = thirtyDaysAgo.toISOString()

  // 1. Orders Array mapping natively to delivered successfully
  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, total_amount, status, order_items(quantity, unit_price, menu_items(name))')
    .eq('kitchen_id', kitchenId)
    .eq('status', 'delivered')
    .gte('created_at', startDateISO)

  const deliveredOrders = orders || []

  // --- REVENUE CHART AGGREGATION ---
  const dailyData: { dateLabel: string, revenue: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    dailyData.push({ dateLabel: label, revenue: 0 })
  }

  deliveredOrders.forEach(o => {
    const d = new Date(o.created_at)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const match = dailyData.find(x => x.dateLabel === label)
    if (match) {
      match.revenue += o.total_amount
    }
  })

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  // --- TOP ITEMS AGGREGATION ---
  const itemMap: Record<string, { qty: number, rev: number }> = {}
  deliveredOrders.forEach(o => {
    o.order_items?.forEach((oi: any) => {
      const name = oi.menu_items?.name || 'Unknown Item'
      if (!itemMap[name]) itemMap[name] = { qty: 0, rev: 0 }
      itemMap[name].qty += oi.quantity
      itemMap[name].rev += (oi.quantity * oi.unit_price) // Computes natively mapping quantity * native unit price avoiding mismatch
    })
  })

  const topItems = Object.entries(itemMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a,b) => b.rev - a.rev)
    .slice(0, 10)

  // --- FEEDBACK AGGREGATION ---
  const { data: feedbacks } = await supabase
    .from('feedback')
    .select('rating')
    .eq('kitchen_id', kitchenId)

  const feedbackList = feedbacks || []
  let avgRating = 0
  const ratingDist = [0,0,0,0,0]
  if (feedbackList.length > 0) {
    const sum = feedbackList.reduce((acc, f) => {
      ratingDist[f.rating - 1]++
      return acc + f.rating
    }, 0)
    avgRating = sum / feedbackList.length
  }

  // --- STOCK STATUS ---
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('name')

  const stockList = ingredients || []

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', paddingBottom: '48px' }}>
      <style>{`.chart-bar-hover:hover .chart-tooltip { opacity: 1; }`}</style>

      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)' }}>Reports</h1>
      </div>

      {deliveredOrders.length === 0 && stockList.length === 0 ? (
        <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-ink-2)' }}>No historical data available</p>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '4px' }}>Reports will appear after your first completed order.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Revenue Chart */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-body)', color: 'var(--color-ink)', marginBottom: '24px' }}>30-Day Revenue Trend</h2>

            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '3px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
               {dailyData.map((d, i) => {
                 const isToday = i === dailyData.length - 1
                 const pct = (d.revenue / maxRevenue) * 100
                 return (
                   <div key={i} className="chart-bar-hover" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
                     <span className="chart-tooltip" style={{ opacity: 0, position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-ink)', color: 'var(--color-bg)', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none', whiteSpace: 'nowrap', transition: 'opacity 0.15s', zIndex: 10, fontFamily: 'var(--font-mono)' }}>
                       {formatCurrency(d.revenue)}
                     </span>
                     <div style={{ width: '100%', backgroundColor: isToday ? 'var(--color-accent)' : 'rgba(212,83,26,0.25)', borderRadius: '2px 2px 0 0', height: `${Math.max(pct, 0.5)}%`, transition: 'height 0.3s' }} />
                   </div>
                 )
               })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
               <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-ink-3)' }}>{thirtyDaysAgo.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
               <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-ink-3)' }}>Today</span>
            </div>
          </div>

          {/* Top Items Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>Top Selling Items</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>#</th>
                    <th>Item Name</th>
                    <th style={{ textAlign: 'right' }}>Units</th>
                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-ink-3)' }}>No items sold yet.</td>
                    </tr>
                  ) : (
                    topItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ paddingLeft: '24px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--color-accent)' }}>{item.qty}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', color: 'var(--color-ink-3)', paddingRight: '24px' }}>{formatCurrency(item.rev)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-body)', color: 'var(--color-ink)', marginBottom: '24px' }}>Customer Satisfaction</h2>

            {feedbackList.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', fontSize: '14px', color: 'var(--color-ink-3)', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                No feedback received yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '52px', color: 'var(--color-ink)', lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--color-ink-3)' }}>/ 5.0</span>
                  </div>
                  <div style={{ color: 'var(--color-amber)', fontSize: '16px', marginTop: '8px', letterSpacing: '2px' }}>
                    {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-ink-3)', marginTop: '12px' }}>{feedbackList.length} reviews</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[5,4,3,2,1].map(stars => {
                    const count = ratingDist[stars-1]
                    const pct = (count / feedbackList.length) * 100
                    return (
                      <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', width: '16px', textAlign: 'right' }}>{stars}</span>
                        <span style={{ color: 'var(--color-amber)', fontSize: '12px' }}>★</span>
                        <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--color-amber)', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', width: '24px', textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stock Safety Margins */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>Stock Safety Margins</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Ingredient</th>
                    <th style={{ textAlign: 'right' }}>Stock</th>
                    <th style={{ textAlign: 'center', paddingRight: '24px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockList.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No ingredients defined.</td>
                    </tr>
                  ) : (
                    stockList.sort((a,b) => a.name.localeCompare(b.name)).map(item => {
                      const reorder = item.reorder_level || 0
                      const isCritical = item.current_stock <= 0
                      const isLow = !isCritical && item.current_stock <= reorder
                      
                      let statusBadge = 'badge-green'
                      let statusText = 'OK'
                      if (isCritical) { statusBadge = 'badge-red'; statusText = 'CRITICAL' }
                      else if (isLow) { statusBadge = 'badge-amber'; statusText = 'LOW' }

                      return (
                        <tr key={item.ingredient_id}>
                          <td style={{ paddingLeft: '24px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                          <td className="font-mono" style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.current_stock}</span> <span style={{ color: 'var(--text-muted)' }}>{item.unit}</span>
                          </td>
                          <td style={{ textAlign: 'center', paddingRight: '24px' }}>
                            <span className={`badge ${statusBadge}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}
    </div>
  )
}
