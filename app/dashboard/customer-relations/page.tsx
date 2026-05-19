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

  // Enrich approvals with actual customer details from the customers table
  const customerIds = [...new Set(
    (crmApprovals || [])
      .map(a => (a.payload as any)?.customer_id)
      .filter(Boolean)
  )]
  const { data: customers } = customerIds.length > 0
    ? await supabase.from('customers').select('customer_id, name, phone, email').in('customer_id', customerIds)
    : { data: [] }
  const customerMap = Object.fromEntries((customers || []).map(c => [c.customer_id, c]))

  const enrichedApprovals = (crmApprovals || []).map(a => {
    const cid = (a.payload as any)?.customer_id
    if (cid && customerMap[cid]) {
      const c = customerMap[cid]
      return { ...a, payload: { ...(a.payload as any), customer_name: c.name, customer_phone: c.phone, customer_email: c.email } }
    }
    return a
  })

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
        initialApprovals={enrichedApprovals as any}
        kitchenId={kitchenId}
        title="CRM Actions Pending Approval"
      />
    </div>
  )
}
