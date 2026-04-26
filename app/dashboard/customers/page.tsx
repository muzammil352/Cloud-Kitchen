import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CustomerBoard } from '@/components/dashboard/CustomerBoard'

export const revalidate = 0

export default async function CustomersPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id')
    .eq('user_id', user.id)
    .single()
    
  if (!profile) redirect('/login')

  // Fetch initial bounded array locally. Capped at 100 natively.
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('kitchen_id', profile.kitchen_id)
    .order('last_order_at', { ascending: false })
    .limit(100)

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <CustomerBoard initialCustomers={customers || []} />
    </div>
  )
}
