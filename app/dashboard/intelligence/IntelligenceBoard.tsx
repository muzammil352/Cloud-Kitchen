'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, PlusCircle, CheckCircle2, Package, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type MenuCostingReport = {
  report_id: string; kitchen_id: string; item_count: number
  owner_report: string; computed_at: string
}
type WastageReport = {
  report_id: string; kitchen_id: string; ingredient_count: number
  critical_count: number; high_count: number; total_wastage_value_pkr: number
  owner_report: string; computed_at: string
}
type WeeklyDemandReport = {
  report_id: string; kitchen_id: string; forecast_start_date: string
  forecast_end_date: string; total_forecast_units: number; peak_day_name: string
  peak_day_units: number; slow_day_units: number; top_item_name: string
  top_item_units: number; trend_direction: string; items_rising: number
  items_falling: number; item_count: number; owner_report: string; computed_at: string
}
type PurchasePlanReport = {
  report_id: string; kitchen_id: string; plan_start_date: string
  plan_end_date: string; total_ingredients: number; urgent_count: number
  soon_count: number; orders_to_place_today: number; total_order_value_pkr: number
  top_urgent_ingredient: string; top_urgent_order_qty: number; top_urgent_unit: string
  owner_report: string; computed_at: string
}
type StockoutReport = {
  report_id: string; kitchen_id: string; ingredient_count: number
  critical_count: number; warning_count: number; owner_report: string; computed_at: string
}

const TRIGGER_BUTTONS = [
  { id: 'margin_analysis',      label: 'Margin Analysis',        icon: TrendingUp  },
  { id: 'wastage_intelligence', label: 'Wastage Intelligence',   icon: AlertTriangle },
  { id: 'weekly_forecast',      label: 'Weekly Demand Forecast', icon: Lightbulb   },
  { id: 'smart_purchase_plan',  label: 'Smart Purchase Plan',    icon: PlusCircle  },
]

function Timestamp({ value }: { value: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
      {new Date(value).toLocaleString()}
    </span>
  )
}

function MetricGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-ink-3)', letterSpacing: '0.05em' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '22px', color: 'var(--color-ink)' }}>{String(value)}</span>
        </div>
      ))}
    </div>
  )
}

function parseOwnerReport(text: string): { narrative: string; reportUrl: string | null } {
  if (!text) return { narrative: '', reportUrl: null }
  const urlMatch = text.match(/https?:\/\/\S+\.pdf/i)
  if (!urlMatch) return { narrative: text, reportUrl: null }
  return {
    narrative: text.replace(urlMatch[0], '').trim(),
    reportUrl: urlMatch[0],
  }
}

function ReportCard({ badge, computedAt, metrics, ownerReport }: {
  badge: string
  computedAt: string
  metrics: { label: string; value: string | number }[]
  ownerReport: string
}) {
  const { narrative, reportUrl } = parseOwnerReport(ownerReport)
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-amber" style={{ textTransform: 'uppercase', fontSize: '11px' }}>{badge}</span>
          <Timestamp value={computedAt} />
        </div>
        {reportUrl && (
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '30px', padding: '0 12px', borderRadius: '100px',
              border: '1px solid var(--color-border-mid)', background: 'var(--color-surface)',
              color: 'var(--color-ink)', fontFamily: 'var(--font-body)', fontSize: '12px',
              fontWeight: 500, textDecoration: 'none', flexShrink: 0,
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}
          >
            <FileText size={12} />
            Report
          </a>
        )}
      </div>
      <MetricGrid items={metrics} />
      {narrative && (
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-ink-2)', whiteSpace: 'pre-wrap' }}>
          {narrative}
        </p>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={16} style={{ color: 'var(--color-accent)' }} />
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '16px', color: 'var(--color-ink)' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div style={{ padding: '20px', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', textAlign: 'center' }}>
      <p style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>{message}</p>
    </div>
  )
}

type Props = {
  kitchenId: string
  menuCostingReports: MenuCostingReport[]
  wastageReports: WastageReport[]
  weeklyDemandReports: WeeklyDemandReport[]
  purchasePlanReports: PurchasePlanReport[]
  stockoutReports: StockoutReport[]
}

export default function IntelligenceBoard({
  kitchenId,
  menuCostingReports: initMenuCosting,
  wastageReports: initWastage,
  weeklyDemandReports: initWeeklyDemand,
  purchasePlanReports: initPurchasePlan,
  stockoutReports: initStockout,
}: Props) {
  const [menuCosting, setMenuCosting]     = useState(initMenuCosting)
  const [wastage, setWastage]             = useState(initWastage)
  const [weeklyDemand, setWeeklyDemand]   = useState(initWeeklyDemand)
  const [purchasePlan, setPurchasePlan]   = useState(initPurchasePlan)
  const [stockout, setStockout]           = useState(initStockout)
  const [isTriggering, setIsTriggering]   = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage]   = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('intelligence_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'menu_costing_report',  filter: `kitchen_id=eq.${kitchenId}` }, p => setMenuCosting(prev => prev.some(r => r.report_id === p.new.report_id) ? prev : [p.new as MenuCostingReport, ...prev]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wastage_report',       filter: `kitchen_id=eq.${kitchenId}` }, p => setWastage(prev => prev.some(r => r.report_id === p.new.report_id) ? prev : [p.new as WastageReport, ...prev]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weekly_demand_report', filter: `kitchen_id=eq.${kitchenId}` }, p => setWeeklyDemand(prev => prev.some(r => r.report_id === p.new.report_id) ? prev : [p.new as WeeklyDemandReport, ...prev]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchase_plan_report', filter: `kitchen_id=eq.${kitchenId}` }, p => setPurchasePlan(prev => prev.some(r => r.report_id === p.new.report_id) ? prev : [p.new as PurchasePlanReport, ...prev]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stockout_report',      filter: `kitchen_id=eq.${kitchenId}` }, p => setStockout(prev => prev.some(r => r.report_id === p.new.report_id) ? prev : [p.new as StockoutReport, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [kitchenId])

  const handleTrigger = async (typeId: string) => {
    setIsTriggering(typeId)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/intelligence/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: typeId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Request failed with status ${res.status}`)
      setSuccessMessage('Workflow triggered. The report will appear here shortly.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message ?? 'Unknown error. Check the browser console.')
      setTimeout(() => setErrorMessage(null), 8000)
    } finally {
      setIsTriggering(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header & Trigger Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={24} style={{ color: 'var(--color-accent)' }} />
            Kitchen Intelligence
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
            AI-driven insights and automated reports from your N8N workflows.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TRIGGER_BUTTONS.map(rt => (
            <button
              key={rt.id}
              onClick={() => handleTrigger(rt.id)}
              disabled={isTriggering !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                height: '36px', padding: '0 16px', borderRadius: '100px',
                border: '1px solid var(--color-border-mid)', background: 'var(--color-surface)',
                color: 'var(--color-ink)', fontFamily: 'var(--font-body)', fontSize: '13px',
                fontWeight: 500, cursor: isTriggering ? 'not-allowed' : 'pointer',
                opacity: isTriggering && isTriggering !== rt.id ? 0.5 : 1,
                transition: 'all var(--transition)',
              }}
              onMouseEnter={e => !isTriggering && (e.currentTarget.style.background = 'var(--color-surface-2)')}
              onMouseLeave={e => !isTriggering && (e.currentTarget.style.background = 'var(--color-surface)')}
            >
              {isTriggering === rt.id ? <RefreshCw size={14} className="animate-spin" /> : <rt.icon size={14} />}
              Generate {rt.label}
            </button>
          ))}
        </div>
      </div>

      {successMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--color-surface)', borderLeft: '4px solid var(--color-green)', borderRadius: 'var(--radius-md)' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--color-green)' }} />
          <span style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--color-surface)', borderLeft: '4px solid #ef4444', borderRadius: 'var(--radius-md)' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '14px', color: 'var(--color-ink)' }}><strong>Error:</strong> {errorMessage}</span>
        </div>
      )}

      {/* Margin Analysis */}
      <Section icon={TrendingUp} title="Margin Analysis">
        {menuCosting.length === 0
          ? <Empty message="No margin analysis reports yet. Click Generate Margin Analysis above." />
          : menuCosting.map(r => (
            <ReportCard key={r.report_id} badge="Margin Analysis" computedAt={r.computed_at}
              metrics={[{ label: 'Items Analyzed', value: r.item_count }]}
              ownerReport={r.owner_report}
            />
          ))
        }
      </Section>

      {/* Wastage Intelligence */}
      <Section icon={AlertTriangle} title="Wastage Intelligence">
        {wastage.length === 0
          ? <Empty message="No wastage reports yet. Click Generate Wastage Intelligence above." />
          : wastage.map(r => (
            <ReportCard key={r.report_id} badge="Wastage" computedAt={r.computed_at}
              metrics={[
                { label: 'Ingredients',       value: r.ingredient_count },
                { label: 'Critical',          value: r.critical_count },
                { label: 'High',              value: r.high_count },
                { label: 'Total Value (PKR)', value: r.total_wastage_value_pkr?.toLocaleString() ?? '—' },
              ]}
              ownerReport={r.owner_report}
            />
          ))
        }
      </Section>

      {/* Weekly Demand Forecast */}
      <Section icon={Lightbulb} title="Weekly Demand Forecast">
        {weeklyDemand.length === 0
          ? <Empty message="No weekly demand reports yet. Click Generate Weekly Demand Forecast above." />
          : weeklyDemand.map(r => (
            <ReportCard key={r.report_id} badge="Weekly Forecast" computedAt={r.computed_at}
              metrics={[
                { label: 'Total Units',  value: r.total_forecast_units },
                { label: 'Peak Day',     value: r.peak_day_name },
                { label: 'Peak Units',   value: r.peak_day_units },
                { label: 'Top Item',     value: r.top_item_name },
                { label: 'Trend',        value: r.trend_direction },
                { label: 'Rising Items', value: r.items_rising },
              ]}
              ownerReport={r.owner_report}
            />
          ))
        }
      </Section>

      {/* Smart Purchase Plan */}
      <Section icon={PlusCircle} title="Smart Purchase Plan">
        {purchasePlan.length === 0
          ? <Empty message="No purchase plan reports yet. Click Generate Smart Purchase Plan above." />
          : purchasePlan.map(r => (
            <ReportCard key={r.report_id} badge="Purchase Plan" computedAt={r.computed_at}
              metrics={[
                { label: 'Total Ingredients', value: r.total_ingredients },
                { label: 'Urgent',            value: r.urgent_count },
                { label: 'Soon',              value: r.soon_count },
                { label: 'Orders Today',      value: r.orders_to_place_today },
                { label: 'Total Value (PKR)', value: r.total_order_value_pkr?.toLocaleString() ?? '—' },
                { label: 'Top Item',          value: r.top_urgent_ingredient ?? '—' },
              ]}
              ownerReport={r.owner_report}
            />
          ))
        }
      </Section>

      {/* Stockout Forecast (auto-generated) */}
      <Section icon={Package} title="Stockout Forecast">
        {stockout.length === 0
          ? <Empty message="No stockout reports yet. Automatically generated when stock levels change." />
          : stockout.map(r => (
            <ReportCard key={r.report_id} badge="Stockout" computedAt={r.computed_at}
              metrics={[
                { label: 'Ingredients', value: r.ingredient_count },
                { label: 'Critical',    value: r.critical_count },
                { label: 'Warning',     value: r.warning_count },
              ]}
              ownerReport={r.owner_report}
            />
          ))
        }
      </Section>

    </div>
  )
}
