'use client'

import { useState } from 'react'
import { NotificationLog } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

export function ApprovalsBoard({ initialApprovals }: { initialApprovals: NotificationLog[] }) {
  const [approvals, setApprovals] = useState<NotificationLog[]>(initialApprovals)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  
  const supabase = createClient()

  const handleAction = async (notification: NotificationLog, action: 'approve' | 'reject') => {
    if (processingId) return
    setProcessingId(notification.notification_id)
    setErrorMap(prev => {
      const copy = { ...prev }
      delete copy[notification.notification_id]
      return copy
    })

    try {
      if (action === 'approve') {
        const res = await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: notification.approval_token })
        })
        
        if (!res.ok) {
          const js = await res.json()
          throw new Error(js.error || 'Downstream integration rejected webhook payload.')
        }
      }

      const finalStatus = action === 'approve' ? 'approved' : 'rejected'
      setApprovals(prev => prev.filter(a => a.notification_id !== notification.notification_id))

      const { error } = await supabase
        .from('notifications_log')
        .update({ status: finalStatus, resolved_at: new Date().toISOString() })
        .eq('notification_id', notification.notification_id)
        
      if (error) {
         console.error("Critical State Drift:", error)
      }

    } catch (err: any) {
      setErrorMap(prev => ({ ...prev, [notification.notification_id]: err.message }))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)' }}>Approvals</h1>
      </div>

      {approvals.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center' }}>
          <CheckCircle size={48} color="var(--accent)" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>No pending approvals</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {approvals.map(a => {
            const payload = a.payload as Record<string, any>
            const isProcessing = processingId === a.notification_id
            const cardError = errorMap[a.notification_id]

            return (
              <div 
                key={a.notification_id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '20px 0', 
                  borderBottom: '1px solid var(--border)',
                  opacity: isProcessing ? 0.5 : 1,
                  pointerEvents: isProcessing ? 'none' : 'auto',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>⚠️ Low Stock Alert</span>
                      <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-start)', padding: '2px 8px', borderRadius: '4px' }}>{timeAgo(a.created_at)}</span>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600 }}>{payload.ingredient_name || 'Unknown Item'}</span> has dropped to <span className="font-mono">{payload.current_stock || '0'} {payload.unit}</span>. <br/>
                      <span style={{ color: 'var(--text-muted)' }}>Reorder level: {payload.reorder_level || '0'} {payload.unit}. Supplier: {payload.supplier_name || 'Default Supplier'}.</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleAction(a, 'reject')}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--destructive)', fontSize: '13px', fontWeight: 700, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(a, 'approve')}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                    >
                      Approve
                    </button>
                  </div>
                </div>

                {cardError && (
                  <div style={{ color: 'var(--destructive)', fontSize: '12px', marginTop: '8px' }}>
                    Error: {cardError}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
