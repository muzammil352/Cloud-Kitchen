import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { InventoryToggle } from '@/components/dashboard/InventoryToggle'
import {
  ChefHat, PackageOpen, AlertTriangle, Trash2, TrendingUp, ShoppingCart,
} from 'lucide-react'

export const revalidate = 0

// ── helpers ────────────────────────────────────────────────────────────────

function fmtReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function statusPill(generatedAt: string | null | undefined): {
  label: string; color: string; bg: string
} {
  if (!generatedAt) return { label: '● No data', color: 'var(--color-ink-3)', bg: 'var(--color-surface-2)' }
  const ageH = (Date.now() - new Date(generatedAt).getTime()) / 3_600_000
  if (ageH <= 25) return { label: '● Live', color: 'var(--color-green)', bg: 'var(--color-green-bg)' }
  return { label: '● Stale', color: 'var(--color-amber)', bg: 'var(--color-amber-bg)' }
}

// Shared card sub-components (inline, server-safe) ──────────────────────────

function Chip({
  label, value, color, bg,
}: { label: string; value: string | number; color?: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: 'var(--radius-pill)',
      fontSize: '12px', fontFamily: 'var(--font-mono)',
      background: bg ?? 'var(--color-surface-2)',
      color: color ?? 'var(--color-ink-2)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <span style={{ color: color ? `${color}99` : 'var(--color-ink-3)' }}>{label}</span>
    </span>
  )
}

function Blockquote({ text, lines = 4 }: { text: string; lines?: number }) {
  return (
    <blockquote style={{
      borderLeft: '3px solid var(--color-border-mid)',
      paddingLeft: '12px',
      margin: 0,
      fontSize: '13px',
      color: 'var(--color-ink-3)',
      fontStyle: 'italic',
      lineHeight: 1.6,
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical',
    }}>
      {text}
    </blockquote>
  )
}

function EmptyState() {
  return (
    <div style={{
      border: '1.5px dashed var(--color-border-mid)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 16px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '4px' }}>
        No report generated yet.
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
        Run the workflow to see insights here.
      </p>
    </div>
  )
}

function ReportCTA({ pdfUrl }: { pdfUrl: string | null | undefined }) {
  if (pdfUrl) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '7px 14px', borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border-mid)',
            fontSize: '12px', fontFamily: 'var(--font-body)',
            color: 'var(--color-ink)', textDecoration: 'none',
            background: 'transparent',
            transition: 'background var(--transition)',
          }}
        >
          View Full Report →
        </a>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
      <button
        disabled
        title="Report not yet generated"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '7px 14px', borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--color-border)',
          fontSize: '12px', fontFamily: 'var(--font-body)',
          color: 'var(--color-ink-3)',
          background: 'transparent',
          opacity: 0.5, cursor: 'not-allowed',
        }}
      >
        View Full Report →
      </button>
    </div>
  )
}

function CardHeader({
  icon, title, generatedAt,
}: {
  icon: React.ReactNode
  title: string
  generatedAt: string | null | undefined
}) {
  const pill = statusPill(generatedAt)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
        <span style={{ color: 'var(--color-ink-3)', marginTop: '1px', flexShrink: 0 }}>
          {icon}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--color-ink)' }}>
            {title}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
            {generatedAt ? `Last generated: ${fmtReportDate(generatedAt)}` : 'Never generated'}
          </div>
        </div>
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '3px 8px', borderRadius: 'var(--radius-pill)',
        fontSize: '11px', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px',
        color: pill.color, background: pill.bg,
      }}>
        {pill.label}
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

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

  // ── INVENTORY INTELLIGENCE queries (all parallel) ────────────────────────
  const [
    menuCostingRes, menuItemsCountRes,
    inventoryTotalsRes, inventoryValueRes,
    stockoutReportRes, stockoutForecastRes,
    wastageReportRes, wastageIntelRes,
    weeklyDemandRes,
    purchasePlanReportRes, purchasePlanUrgentRes,
  ] = await Promise.all([
    supabase.from('menu_costing_report')
      .select('generated_at,owner_report,pdf_url')
      .eq('kitchen_id', kitchenId)
      .order('generated_at', { ascending: false })
      .limit(1).maybeSingle(),

    supabase.from('menu_items')
      .select('menu_item_id', { count: 'exact', head: true })
      .eq('kitchen_id', kitchenId),

    supabase.from('inventory_totals')
      .select('total_inventory_value,items_below_reorder,top_3_cash_locked,calculated_at')
      .eq('kitchen_id', kitchenId)
      .order('calculated_at', { ascending: false })
      .limit(1).maybeSingle(),

    supabase.from('inventory_value')
      .select('ingredient_name,current_stock,unit,stock_value,reorder_status')
      .eq('kitchen_id', kitchenId)
      .order('stock_value', { ascending: false })
      .limit(8),

    supabase.from('stockout_report')
      .select('generated_at,owner_report,pdf_url')
      .eq('kitchen_id', kitchenId)
      .order('generated_at', { ascending: false })
      .limit(1).maybeSingle(),

    supabase.from('stockout_forecast')
      .select('status')
      .eq('kitchen_id', kitchenId),

    supabase.from('wastage_report')
      .select('generated_at,owner_report,pdf_url')
      .eq('kitchen_id', kitchenId)
      .order('generated_at', { ascending: false })
      .limit(1).maybeSingle(),

    supabase.from('wastage_intelligence')
      .select('flag')
      .eq('kitchen_id', kitchenId),

    supabase.from('weekly_demand_report')
      .select('generated_at,owner_report,pdf_url')
      .eq('kitchen_id', kitchenId)
      .order('generated_at', { ascending: false })
      .limit(1).maybeSingle(),

    supabase.from('purchase_plan_report')
      .select('generated_at,owner_report,pdf_url')
      .eq('kitchen_id', kitchenId)
      .order('generated_at', { ascending: false })
      .limit(1).maybeSingle(),

    supabase.from('purchase_plan')
      .select('urgency')
      .eq('kitchen_id', kitchenId)
      .eq('urgency', 'URGENT'),
  ])

  // ── derived values ────────────────────────────────────────────────────────
  const menuCostingReport  = menuCostingRes.data
  const menuItemsCount     = menuItemsCountRes.count ?? 0
  const inventoryTotals    = inventoryTotalsRes.data
  const inventoryValueRows = inventoryValueRes.data ?? []
  const stockoutReport     = stockoutReportRes.data
  const stockoutCritical   = (stockoutForecastRes.data ?? []).filter((r: any) => r.status === 'CRITICAL').length
  const stockoutWarning    = (stockoutForecastRes.data ?? []).filter((r: any) => r.status === 'WARNING').length
  const wastageReport      = wastageReportRes.data
  const highWastageCount   = (wastageIntelRes.data ?? []).filter((r: any) => r.flag === 'CRITICAL' || r.flag === 'HIGH').length
  const weeklyDemandReport = weeklyDemandRes.data
  const purchasePlanReport = purchasePlanReportRes.data
  const urgentPurchaseCount = (purchasePlanUrgentRes.data ?? []).length

  const top3CashLocked: { name: string; value: number }[] = Array.isArray(inventoryTotals?.top_3_cash_locked)
    ? (inventoryTotals!.top_3_cash_locked as any[]).slice(0, 3)
    : []

  const allReportDates = [
    menuCostingReport?.generated_at,
    inventoryTotals?.calculated_at,
    stockoutReport?.generated_at,
    wastageReport?.generated_at,
    weeklyDemandReport?.generated_at,
    purchasePlanReport?.generated_at,
  ].filter(Boolean) as string[]
  const lastUpdated = allReportDates.length > 0
    ? [...allReportDates].sort().pop()!
    : null

  // ── render ────────────────────────────────────────────────────────────────

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

      {/* ═══════════════════════════════════════════════════════════════════
          INVENTORY INTELLIGENCE — appended below existing content
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--color-border)' }}>

        {/* Section header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '18px',
            color: 'var(--color-ink)', marginBottom: '4px',
          }}>
            Inventory Intelligence
          </h2>
          {lastUpdated ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>
              Last updated: {fmtReportDate(lastUpdated)}
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>
              No reports generated yet — run N8N workflows to populate.
            </p>
          )}
        </div>

        {/* ── Group 1: Financial Health ─────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--color-ink-3)', marginBottom: '14px',
          }}>
            Financial Health
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

            {/* Card A — Menu Costing & Margin Analysis */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CardHeader
                icon={<ChefHat size={15} strokeWidth={1.5} />}
                title="Menu Costing & Margin Analysis"
                generatedAt={menuCostingReport?.generated_at}
              />

              {!menuCostingReport ? <EmptyState /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Chip label="menu items" value={menuItemsCount} />
                  </div>

                  <Blockquote text={menuCostingReport.owner_report} lines={4} />

                  <ReportCTA pdfUrl={menuCostingReport.pdf_url} />
                </>
              )}
            </div>

            {/* Card B — Inventory Value */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CardHeader
                icon={<PackageOpen size={15} strokeWidth={1.5} />}
                title="Inventory Value"
                generatedAt={inventoryTotals?.calculated_at}
              />

              {!inventoryTotals ? <EmptyState /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                      fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                      background: 'var(--color-accent-bg)', color: 'var(--color-accent)',
                    }}>
                      {formatCurrency(inventoryTotals.total_inventory_value ?? 0)}
                    </span>
                    <Chip
                      label="below reorder"
                      value={inventoryTotals.items_below_reorder ?? 0}
                      color={(inventoryTotals.items_below_reorder ?? 0) > 0 ? 'var(--color-amber)' : 'var(--color-green)'}
                      bg={(inventoryTotals.items_below_reorder ?? 0) > 0 ? 'var(--color-amber-bg)' : 'var(--color-green-bg)'}
                    />
                  </div>

                  {/* Top 3 cash-locked */}
                  {top3CashLocked.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {top3CashLocked.map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: i < top3CashLocked.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>
                            {item.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-2)' }}>
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collapsible full table */}
                  <InventoryToggle rows={inventoryValueRows} />

                  <ReportCTA pdfUrl={null} />
                </>
              )}
            </div>

          </div>
        </div>

        {/* ── Group 2: Operations & Supply ──────────────────────────────── */}
        <div>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--color-ink-3)', marginBottom: '14px',
          }}>
            Operations &amp; Supply
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

            {/* Card C — Stockout Prediction */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CardHeader
                icon={<AlertTriangle size={15} strokeWidth={1.5} />}
                title="Stockout Prediction"
                generatedAt={stockoutReport?.generated_at}
              />

              {!stockoutReport ? <EmptyState /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Chip
                      label="Critical"
                      value={stockoutCritical}
                      color={stockoutCritical > 0 ? 'var(--color-red)' : 'var(--color-ink-3)'}
                      bg={stockoutCritical > 0 ? 'var(--color-red-bg)' : 'var(--color-surface-2)'}
                    />
                    <Chip
                      label="Warning"
                      value={stockoutWarning}
                      color={stockoutWarning > 0 ? 'var(--color-amber)' : 'var(--color-ink-3)'}
                      bg={stockoutWarning > 0 ? 'var(--color-amber-bg)' : 'var(--color-surface-2)'}
                    />
                  </div>

                  <Blockquote text={stockoutReport.owner_report} lines={4} />

                  <ReportCTA pdfUrl={stockoutReport.pdf_url} />
                </>
              )}
            </div>

            {/* Card D — Wastage Intelligence */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CardHeader
                icon={<Trash2 size={15} strokeWidth={1.5} />}
                title="Wastage Intelligence"
                generatedAt={wastageReport?.generated_at}
              />

              {!wastageReport ? <EmptyState /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Chip
                      label="High Wastage Items"
                      value={highWastageCount}
                      color={highWastageCount > 0 ? 'var(--color-red)' : 'var(--color-ink-3)'}
                      bg={highWastageCount > 0 ? 'var(--color-red-bg)' : 'var(--color-surface-2)'}
                    />
                  </div>

                  <Blockquote text={wastageReport.owner_report} lines={4} />

                  <ReportCTA pdfUrl={wastageReport.pdf_url} />
                </>
              )}
            </div>

            {/* Card E — Weekly Demand Forecast */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CardHeader
                icon={<TrendingUp size={15} strokeWidth={1.5} />}
                title="Weekly Demand Forecast"
                generatedAt={weeklyDemandReport?.generated_at}
              />

              {!weeklyDemandReport ? <EmptyState /> : (
                <>
                  <Blockquote text={weeklyDemandReport.owner_report} lines={5} />

                  <ReportCTA pdfUrl={weeklyDemandReport.pdf_url} />
                </>
              )}
            </div>

            {/* Card F — Smart Purchase Plan */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <CardHeader
                icon={<ShoppingCart size={15} strokeWidth={1.5} />}
                title="Smart Purchase Plan"
                generatedAt={purchasePlanReport?.generated_at}
              />

              {!purchasePlanReport ? <EmptyState /> : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Chip
                      label="Urgent Orders"
                      value={urgentPurchaseCount}
                      color={urgentPurchaseCount > 0 ? 'var(--color-red)' : 'var(--color-green)'}
                      bg={urgentPurchaseCount > 0 ? 'var(--color-red-bg)' : 'var(--color-green-bg)'}
                    />
                  </div>

                  <Blockquote text={purchasePlanReport.owner_report} lines={4} />

                  <ReportCTA pdfUrl={purchasePlanReport.pdf_url} />
                </>
              )}
            </div>

          </div>
        </div>
      </div>
      {/* ── end Inventory Intelligence ───────────────────────────────────── */}

    </div>
  )
}
