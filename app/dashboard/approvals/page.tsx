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
    <div className="h-full flex flex-col pt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ApprovalsBoard initialApprovals={initialApprovals || []} />
    </div>
  )
}
