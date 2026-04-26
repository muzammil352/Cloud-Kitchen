import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalsBoard } from '@/components/dashboard/ApprovalsBoard'

export const revalidate = 0

export default async function ApprovalsPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()
    
  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard')
  }

  // Poll array strictly mapped to pending requirements globally
  const { data: initialApprovals } = await supabase
    .from('notifications_log')
    .select('*')
    .eq('kitchen_id', profile.kitchen_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)' }}>Approvals</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
          Actions pending your review before automation fires. Approve to execute, reject to dismiss.
        </p>
      </div>
      <ApprovalsBoard initialApprovals={initialApprovals || []} />
    </div>
  )
}
