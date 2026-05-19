import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CustomerRelationsBoard from './CustomerRelationsBoard'
import { PendingApprovalsTable } from '@/components/dashboard/PendingApprovalsTable'

export const revalidate = 0

export type LastRun = { workflow_name: string; status: string; created_at: string; action_taken: string }

export default async function CustomerRelationsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const kitchenId = profile.kitchen_id

  const [{ data: logs }, { data: crmApprovals }] = await Promise.all([
    supabase
      .from('crm_workflow_log')
      .select('workflow_name, status, created_at, action_taken')
      .eq('kitchen_id', kitchenId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('notifications_log')
      .select('*')
      .eq('kitchen_id', kitchenId)
      .eq('status', 'pending')
      .in('type', ['win_back', 'upsell'])
      .order('created_at', { ascending: false }),
  ])

  const lastRunMap: Record<string, LastRun> = {}
  for (const log of logs || []) {
    if (!lastRunMap[log.workflow_name]) {
      lastRunMap[log.workflow_name] = log
    }
  }

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', paddingBottom: '48px' }}>
      <CustomerRelationsBoard kitchenId={kitchenId} initialLastRuns={lastRunMap} />
      <PendingApprovalsTable
        initialApprovals={crmApprovals || []}
        kitchenId={kitchenId}
        title="CRM Actions Pending Approval"
      />
    </div>
  )
}
