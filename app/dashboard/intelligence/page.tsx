import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IntelligenceBoard from './IntelligenceBoard'

export const revalidate = 0

export default async function IntelligencePage() {
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

  const [
    { data: menuCostingReports },
    { data: wastageReports },
    { data: weeklyDemandReports },
    { data: purchasePlanReports },
    { data: stockoutReports },
  ] = await Promise.all([
    supabase.from('menu_costing_report').select('*').eq('kitchen_id', kitchenId).order('computed_at', { ascending: false }).limit(10),
    supabase.from('wastage_report').select('*').eq('kitchen_id', kitchenId).order('computed_at', { ascending: false }).limit(10),
    supabase.from('weekly_demand_report').select('*').eq('kitchen_id', kitchenId).order('computed_at', { ascending: false }).limit(10),
    supabase.from('purchase_plan_report').select('*').eq('kitchen_id', kitchenId).order('computed_at', { ascending: false }).limit(10),
    supabase.from('stockout_report').select('*').eq('kitchen_id', kitchenId).order('computed_at', { ascending: false }).limit(10),
  ])

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', paddingBottom: '48px' }}>
      <IntelligenceBoard
        kitchenId={kitchenId}
        menuCostingReports={menuCostingReports || []}
        wastageReports={wastageReports || []}
        weeklyDemandReports={weeklyDemandReports || []}
        purchasePlanReports={purchasePlanReports || []}
        stockoutReports={stockoutReports || []}
      />
    </div>
  )
}
