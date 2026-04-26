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

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)' }}>Orders</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-3)' }}>{todayLabel}</span>
          <button className="btn-outline" style={{ fontSize: '13px', padding: '7px 14px' }}>Export</button>
        </div>
      </div>
      
      <OrderBoard initialOrders={initialOrders || []} kitchenId={profile.kitchen_id} />
    </div>
  )
}
