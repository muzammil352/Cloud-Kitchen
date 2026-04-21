import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderBoard } from '@/components/dashboard/OrderBoard'

export const revalidate = 0

// PKT Start of day calculation
function getPKTStartOfDayISO() {
  const now = new Date()
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  const pktStartOfDayUTC = new Date(Date.UTC(pktTime.getUTCFullYear(), pktTime.getUTCMonth(), pktTime.getUTCDate(), -5, 0, 0, 0))
  return pktStartOfDayUTC.toISOString()
}

export default async function OrdersPage() {
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

  // Fetch initial orders (today only scope as per spec optimization)
  const { data: initialOrders } = await supabase
    .from('orders')
    .select('*, customers(name, phone, email), order_items(*, menu_items(name))')
    .eq('kitchen_id', profile.kitchen_id)
    .gte('created_at', pktStartOfDay)
    .order('created_at', { ascending: false })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)' }}>Orders</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search orders..." 
            style={{ width: '240px', padding: '9px 13px', fontSize: '13px' }} 
          />
          <button className="btn-outline">Export</button>
        </div>
      </div>
      
      <OrderBoard initialOrders={initialOrders || []} kitchenId={profile.kitchen_id} />
    </div>
  )
}
