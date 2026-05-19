import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KitchenBoard } from '@/components/dashboard/KitchenBoard'

export const revalidate = 0

function getPKTStartOfDayISO() {
  const now = new Date()
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000))
  const pktStartOfDayUTC = new Date(Date.UTC(pktTime.getUTCFullYear(), pktTime.getUTCMonth(), pktTime.getUTCDate(), -5, 0, 0, 0))
  return pktStartOfDayUTC.toISOString()
}

export default async function KitchenBoardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  const pktStartOfDay = getPKTStartOfDayISO()

  const [{ data: orders }, { count: lowStockCount }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, customers(name, phone), order_items(quantity, unit_price, menu_items(name))')
      .eq('kitchen_id', profile.kitchen_id)
      .gte('created_at', pktStartOfDay)
      .order('created_at', { ascending: true }),
    supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('kitchen_id', profile.kitchen_id)
      .not('reorder_level', 'is', null)
      .filter('current_stock', 'lte', 'reorder_level'),
  ])

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)' }}>
          Kitchen Board
        </h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-ink-3)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>
      <KitchenBoard
        initialOrders={orders || []}
        kitchenId={profile.kitchen_id}
        lowStockCount={lowStockCount ?? 0}
      />
    </div>
  )
}
