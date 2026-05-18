'use client'

import { useState, useEffect } from 'react'
import { HeartHandshake, Clock, Zap, RefreshCw, CheckCircle2, AlertTriangle, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { LastRun } from './page'

type LastRunMap = Record<string, LastRun>

const SCHEDULED = [
  {
    id: 'wf1',
    logName: 'WF1 - Win-Back Campaign',
    name: 'Win-Back Campaign',
    schedule: 'Daily at 10AM',
    description: 'Scans customers who haven\'t ordered in 7–21 days. Creates a pending approval for each — once approved, sends a re-engagement message with code COMEBACK15.',
  },
  {
    id: 'wf3',
    logName: 'WF3 - Birthday Trigger',
    name: 'Birthday Trigger',
    schedule: 'Daily at 9AM',
    description: 'Finds customers whose birthday matches today and sends a personalised 20% discount message with code BDAY20.',
  },
  {
    id: 'wf4',
    logName: 'WF4 - RFM Scoring',
    name: 'RFM Scoring',
    schedule: 'Every Monday at 8AM',
    description: 'Scores all customers using Recency, Frequency, and Monetary value. Segments them (Champion / Loyal / At-Risk / Lost / New) and emails a weekly summary to the founder.',
  },
]

const EVENT_DRIVEN = [
  {
    id: 'wf2',
    logName: 'WF2 - Loyalty Rewards',
    name: 'Loyalty Rewards',
    trigger: 'Every 5th order',
    description: 'Sends a loyalty reward message on the 5th order milestone. Flags customer as VIP and alerts the founder if total spend exceeds Rs. 5,000.',
  },
  {
    id: 'wf5',
    logName: 'WF5 - CLV Tracking',
    name: 'CLV Tracking',
    trigger: 'On order delivered',
    description: 'Recalculates Customer Lifetime Value after every delivery. Alerts the founder when a customer reaches Gold (Rs. 8k+) or Platinum (Rs. 15k+) tier.',
  },
  {
    id: 'wf6',
    logName: 'WF6 - Complaint & Refund Handling',
    name: 'Complaint & Refund',
    trigger: 'On rating ≤ 2',
    description: 'Fires on negative feedback. Instantly alerts the founder with full order context and sends the customer an apology with a free-order code SORRYONUS.',
  },
  {
    id: 'wf7',
    logName: 'WF7 - Upsell Triggers',
    name: 'Upsell Triggers',
    trigger: 'After every order',
    description: 'Suggests relevant add-ons using A/B message variants. Sends a free-delivery nudge if the order is within Rs. 500 of the Rs. 1,500 threshold.',
  },
  {
    id: 'wf8',
    logName: 'WF8 - Referral Tracking',
    name: 'Referral Tracking',
    trigger: 'On new customer',
    description: 'Validates referral codes on signup. Rewards both the new customer (WELCOME200) and the referrer (REFER150), then auto-generates a referral code for the new customer.',
  },
]

const ALL_SCHEDULED_IDS = SCHEDULED.map(w => w.id)

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase()
  const color = s === 'success' ? 'var(--color-green)' : s === 'pending' ? '#f59e0b' : '#ef4444'
  const bg = s === 'success' ? 'rgba(34,197,94,0.1)' : s === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  return (
    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)', color, background: bg, textTransform: 'uppercase' }}>
      {status}
    </span>
  )
}

function WorkflowCard({
  id, name, description, badgeLabel, badgeIcon, metaLine,
  lastRun, isTriggering, onTrigger,
}: {
  id: string
  name: string
  description: string
  badgeLabel: string
  badgeIcon: React.ReactNode
  metaLine: string
  lastRun?: LastRun
  isTriggering: boolean
  onTrigger: (id: string) => void
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-ink-3)', background: 'var(--color-surface-2)', textTransform: 'uppercase', border: '1px solid var(--color-border)' }}>
              {badgeIcon}{badgeLabel}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>{metaLine}</span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', color: 'var(--color-ink)', marginBottom: '4px' }}>{name}</h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-ink-3)' }}>{description}</p>
        </div>
        <button
          onClick={() => onTrigger(id)}
          disabled={isTriggering}
          title={`Run ${name} now`}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '34px', padding: '0 14px', borderRadius: '100px',
            border: '1px solid var(--color-border-mid)', background: 'var(--color-surface)',
            color: 'var(--color-ink)', fontFamily: 'var(--font-body)', fontSize: '13px',
            fontWeight: 500, cursor: isTriggering ? 'not-allowed' : 'pointer',
            opacity: isTriggering ? 0.6 : 1, flexShrink: 0,
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => !isTriggering && (e.currentTarget.style.background = 'var(--color-surface-2)')}
          onMouseLeave={e => !isTriggering && (e.currentTarget.style.background = 'var(--color-surface)')}
        >
          {isTriggering ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
          Run Now
        </button>
      </div>

      {lastRun ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>Last run {timeAgo(lastRun.created_at)}</span>
          <StatusBadge status={lastRun.status} />
          {lastRun.action_taken && (
            <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', fontStyle: 'italic' }}>— {lastRun.action_taken}</span>
          )}
        </div>
      ) : (
        <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>Never run</span>
        </div>
      )}
    </div>
  )
}

export default function CustomerRelationsBoard({
  kitchenId,
  initialLastRuns,
}: {
  kitchenId: string
  initialLastRuns: LastRunMap
}) {
  const [lastRuns, setLastRuns] = useState<LastRunMap>(initialLastRuns)
  const [triggering, setTriggering] = useState<Set<string>>(new Set())
  const [runningAll, setRunningAll] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('crm_log_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_workflow_log', filter: `kitchen_id=eq.${kitchenId}` },
        (payload) => {
          const row = payload.new as LastRun
          setLastRuns(prev => ({
            ...prev,
            [row.workflow_name]: row,
          }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [kitchenId])

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }

  const triggerWorkflow = async (id: string): Promise<'success' | 'error'> => {
    const res = await fetch('/api/crm/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `Status ${res.status}`)
    return 'success'
  }

  const handleTrigger = async (id: string) => {
    setTriggering(prev => new Set(prev).add(id))
    try {
      await triggerWorkflow(id)
      const wf = [...SCHEDULED, ...EVENT_DRIVEN].find(w => w.id === id)
      addToast('success', `${wf?.name ?? id} triggered successfully.`)
    } catch (err: any) {
      addToast('error', err.message ?? 'Unknown error')
    } finally {
      setTriggering(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const handleRunAll = async () => {
    setRunningAll(true)
    const results = await Promise.allSettled(
      ALL_SCHEDULED_IDS.map(id => triggerWorkflow(id))
    )
    const failed = results
      .map((r, i) => r.status === 'rejected' ? SCHEDULED[i].name : null)
      .filter(Boolean)
    if (failed.length === 0) {
      addToast('success', 'All 3 scheduled workflows triggered successfully.')
    } else if (failed.length === ALL_SCHEDULED_IDS.length) {
      addToast('error', `All workflows failed. Check env vars and N8N webhook status.`)
    } else {
      addToast('error', `Partially triggered. Failed: ${failed.join(', ')}`)
    }
    setRunningAll(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartHandshake size={24} style={{ color: 'var(--color-accent)' }} />
            Customer Relations
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
            Manage and manually trigger all CRM automation workflows.
          </p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={runningAll || triggering.size > 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            height: '38px', padding: '0 20px', borderRadius: '100px',
            border: 'none', background: 'var(--color-accent)',
            color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px',
            fontWeight: 600, cursor: (runningAll || triggering.size > 0) ? 'not-allowed' : 'pointer',
            opacity: (runningAll || triggering.size > 0) ? 0.7 : 1,
            transition: 'all var(--transition)',
          }}
        >
          {runningAll ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          Run All Scheduled
        </button>
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--color-surface)', borderLeft: `4px solid ${t.type === 'success' ? 'var(--color-green)' : '#ef4444'}`, borderRadius: 'var(--radius-md)' }}>
              {t.type === 'success'
                ? <CheckCircle2 size={16} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                : <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              }
              <span style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Workflows */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={16} style={{ color: 'var(--color-accent)' }} />
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '16px', color: 'var(--color-ink)' }}>Scheduled Workflows</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>— run automatically on a timer, or manually below</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SCHEDULED.map(wf => (
            <WorkflowCard
              key={wf.id}
              id={wf.id}
              name={wf.name}
              description={wf.description}
              badgeLabel="Scheduled"
              badgeIcon={<Clock size={11} style={{ marginRight: '3px' }} />}
              metaLine={wf.schedule}
              lastRun={lastRuns[wf.logName]}
              isTriggering={triggering.has(wf.id)}
              onTrigger={handleTrigger}
            />
          ))}
        </div>
      </div>

      {/* Event-Driven Workflows */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Zap size={16} style={{ color: 'var(--color-accent)' }} />
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '16px', color: 'var(--color-ink)' }}>Event-Driven Workflows</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-ink-3)' }}>— auto-fired by customer actions; test-trigger with kitchen context only</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {EVENT_DRIVEN.map(wf => (
            <WorkflowCard
              key={wf.id}
              id={wf.id}
              name={wf.name}
              description={wf.description}
              badgeLabel="Event"
              badgeIcon={<Zap size={11} style={{ marginRight: '3px' }} />}
              metaLine={wf.trigger}
              lastRun={lastRuns[wf.logName]}
              isTriggering={triggering.has(wf.id)}
              onTrigger={handleTrigger}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
