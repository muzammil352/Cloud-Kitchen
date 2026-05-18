import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InventoryManager from './InventoryManager'

export const revalidate = 0

export default async function InventoryPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const [
    { data: ingredients },
    { data: inventoryValues },
    { data: totalRows },
  ] = await Promise.all([
    supabase
      .from('ingredients')
      .select('*')
      .eq('kitchen_id', profile.kitchen_id)
      .order('category', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true }),
    supabase
      .from('inventory_value')
      .select('*')
      .eq('kitchen_id', profile.kitchen_id)
      .order('computed_at', { ascending: false })
      .limit(200),
    supabase
      .from('inventory_totals')
      .select('*')
      .eq('kitchen_id', profile.kitchen_id)
      .order('computed_at', { ascending: false })
      .limit(1),
  ])

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', paddingBottom: '48px' }}>
      <InventoryManager
        initialIngredients={ingredients || []}
        kitchenId={profile.kitchen_id}
        inventoryValues={inventoryValues || []}
        inventoryTotals={totalRows?.[0] ?? null}
      />
    </div>
  )
}
