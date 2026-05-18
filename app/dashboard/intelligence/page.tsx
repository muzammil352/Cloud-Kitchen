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
    
  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard')
  }

  const kitchenId = profile.kitchen_id

  const { data: reports } = await supabase
    .from('intelligence_reports')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', paddingBottom: '48px' }}>
      <IntelligenceBoard initialReports={reports || []} kitchenId={kitchenId} />
    </div>
  )
}
