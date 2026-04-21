import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderGrid } from '@/components/kitchen/OrderGrid'

export const revalidate = 0

function getPKTStartOfDayISO() {
  const now = new Date()
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  const pktStartOfDayUTC = new Date(Date.UTC(pktTime.getUTCFullYear(), pktTime.getUTCMonth(), pktTime.getUTCDate(), -5, 0, 0, 0))
  return pktStartOfDayUTC.toISOString()
}

export default async function KitchenQueuePage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id')
    .eq('user_id', user.id)
    .single()
    
  if (!profile) redirect('/login')
  
  const pktStartOfDay = getPKTStartOfDayISO()

  // Fetch only active initial orders natively mapping exactly
  const { data: initialOrders } = await supabase
    .from('orders')
    .select('*, customers(name, phone, email), order_items(*, menu_items(name))')
    .eq('kitchen_id', profile.kitchen_id)
    .gte('created_at', pktStartOfDay)
    .order('created_at', { ascending: true })

  return (
    <div className="h-full flex flex-col pt-0 animate-in fade-in duration-500">
      <OrderGrid initialOrders={initialOrders || []} kitchenId={profile.kitchen_id} />
    </div>
  )
}
