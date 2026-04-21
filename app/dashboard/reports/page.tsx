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
    .from('feedbacks')
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
      <style>{`
        @keyframes fadeIn { to { opacity: 1; } }
        .chart-bar-hover:hover .chart-tooltip { opacity: 1; }
      `}</style>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)' }}>Reports & Analytics</h1>
      </div>

      {deliveredOrders.length === 0 && stockList.length === 0 ? (
        <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-start)', opacity: 0.7 }}>
          <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)' }}>No historical data available</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>Data matrices will initialize immediately upon first order completion.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Revenue Chart */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', marginBottom: '24px' }}>30-Day Revenue Trend</h2>
            
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid var(--border)', position: 'relative', marginTop: '16px' }}>
               <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '100% 40px', pointerEvents: 'none', opacity: 0.2 }}></div>
               
               {dailyData.map((d, i) => {
                 const pct = (d.revenue / maxRevenue) * 100
                 return (
                   <div key={i} className="chart-bar-hover" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
                     <span className="chart-tooltip" style={{ opacity: 0, position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text-primary)', color: 'var(--bg-start)', fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none', whiteSpace: 'nowrap', transition: 'opacity 0.2s zIndex', zIndex: 10, fontFamily: 'var(--font-mono)' }}>
                       {formatCurrency(d.revenue)}
                     </span>
                     
                     <div 
                       style={{ width: '100%', backgroundColor: 'var(--accent)', cursor: 'pointer', borderRadius: '2px 2px 0 0', height: `${Math.max(pct, 0.5)}%`, transition: 'height 0.3s' }}
                     />
                   </div>
                 )
               })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
               <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{thirtyDaysAgo.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
               <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Today</span>
            </div>
          </div>

          {/* Top Items Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>Top Selling Items</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Item Name</th>
                    <th style={{ textAlign: 'right' }}>Units Sold</th>
                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>No items sold yet.</td>
                    </tr>
                  ) : (
                    topItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ paddingLeft: '24px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--accent)' }}>{item.qty}x</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)', paddingRight: '24px' }}>{formatCurrency(item.rev)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', marginBottom: '24px' }}>Customer Satisfaction</h2>
            
            {feedbackList.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-start)', borderRadius: '8px' }}>
                No feedback received yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'center', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                  <span className="font-mono" style={{ fontSize: '48px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-2px' }}>{avgRating.toFixed(1)}</span>
                  <div style={{ display: 'flex', gap: '4px', color: 'var(--tag-amber)', marginTop: '12px' }}>
                    {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                  </div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '16px' }}>{feedbackList.length} reviews</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[5,4,3,2,1].map(stars => {
                    const count = ratingDist[stars-1]
                    const pct = (count / feedbackList.length) * 100
                    return (
                      <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }}>
                        <span style={{ width: '40px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          {stars} <span style={{ color: 'var(--tag-amber)', opacity: 0.5 }}>★</span>
                        </span>
                        <div style={{ flex: 1, height: '8px', background: 'var(--bg-start)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--text-primary)', width: `${pct}%`, transition: 'width 0.5s' }}></div>
                        </div>
                        <span className="font-mono" style={{ width: '32px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stock Safety Margins */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>Stock Safety Margins</h2>
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
