'use client'

import { useState } from 'react'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, PlusCircle, CheckCircle2 } from 'lucide-react'

type IntelligenceReport = {
  report_id: string
  type: string
  title: string
  summary: string
  metrics: Record<string, any>
  recommendations: string[]
  created_at: string
}

const REPORT_TYPES = [
  { id: 'margin_analysis', label: 'Margin Analysis', icon: TrendingUp },
  { id: 'wastage_intelligence', label: 'Wastage Intelligence', icon: AlertTriangle },
  { id: 'weekly_forecast', label: 'Weekly Demand Forecast', icon: Lightbulb },
  { id: 'smart_purchase_plan', label: 'Smart Purchase Plan', icon: PlusCircle },
]

export default function IntelligenceBoard({ initialReports }: { initialReports: IntelligenceReport[] }) {
  const [reports, setReports] = useState<IntelligenceReport[]>(initialReports)
  const [isTriggering, setIsTriggering] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleTrigger = async (typeId: string) => {
    setIsTriggering(typeId)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/intelligence/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: typeId })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error ?? `Request failed with status ${res.status}`)
      }

      setSuccessMessage('Workflow triggered successfully. The report will appear here shortly once N8N finishes processing.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message ?? 'Unknown error. Check the browser console.')
      setTimeout(() => setErrorMessage(null), 8000)
    } finally {
      setIsTriggering(null)
    }
  }

  const formatKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header & Action Bar */}
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

        {/* Trigger Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => handleTrigger(rt.id)}
              disabled={isTriggering !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px',
                padding: '0 16px',
                borderRadius: '100px',
                border: '1px solid var(--color-border-mid)',
                background: 'var(--color-surface)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isTriggering ? 'not-allowed' : 'pointer',
                opacity: isTriggering && isTriggering !== rt.id ? 0.5 : 1,
                transition: 'all var(--transition)'
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

      {/* Reports Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {reports.length === 0 ? (
          <div style={{ height: '30vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)' }}>
            <Brain size={32} style={{ color: 'var(--color-ink-3)', marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-ink-2)' }}>No intelligence reports yet</p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '4px' }}>Manually generate a report above, or wait for your scheduled workflows.</p>
          </div>
        ) : (
          reports.map(report => (
            <div key={report.report_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-amber" style={{ textTransform: 'uppercase' }}>
                      {formatKey(report.type)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)' }}>
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '20px', color: 'var(--color-ink)' }}>
                    {report.title}
                  </h2>
                </div>
              </div>

              {report.summary && (
                <p style={{ fontSize: '15px', lineHeight: 1.5, color: 'var(--color-ink-2)' }}>
                  {report.summary}
                </p>
              )}

              {/* Metrics Grid */}
              {report.metrics && Object.keys(report.metrics).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  {Object.entries(report.metrics).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-ink-3)', letterSpacing: '0.05em' }}>
                        {formatKey(key)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '24px', color: 'var(--color-ink)' }}>
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink)' }}>
                    Actionable Recommendations
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {report.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', lineHeight: 1.5, color: 'var(--color-ink-2)' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-accent-bg)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, flexShrink: 0, marginTop: '2px' }}>
                          {idx + 1}
                        </div>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
