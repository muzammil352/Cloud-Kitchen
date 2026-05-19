import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InventoryManager from './InventoryManager'
import { PendingApprovalsTable } from '@/components/dashboard/PendingApprovalsTable'

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
    { data: inventoryApprovals },
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
    supabase
      .from('notifications_log')
      .select('*')
      .eq('kitchen_id', profile.kitchen_id)
      .eq('status', 'pending')
      .in('type', ['low_stock', 'supplier_message', 'menu_disable'])
      .order('created_at', { ascending: false }),
  ])

  // Enrich low_stock / supplier_message approvals with supplier details from ingredients table
  const ingredientIds = Array.from(new Set(
    (inventoryApprovals || [])
      .map(a => (a.payload as any)?.ingredient_id)
      .filter(Boolean)
  ))
  const { data: ingredientDetails } = ingredientIds.length > 0
    ? await supabase.from('ingredients').select('ingredient_id, supplier_name').in('ingredient_id', ingredientIds)
    : { data: [] }
  const ingredientMap = Object.fromEntries((ingredientDetails || []).map(i => [i.ingredient_id, i]))

  const enrichedInventoryApprovals = (inventoryApprovals || []).map(a => {
    const iid = (a.payload as any)?.ingredient_id
    if (iid && ingredientMap[iid]) {
      const ing = ingredientMap[iid]
      return {
        ...a,
        payload: {
          ...(a.payload as any),
          supplier_name: (a.payload as any).supplier_name || ing.supplier_name,
        }
      }
    }
    return a
  })

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', paddingBottom: '48px' }}>
      <InventoryManager
        initialIngredients={ingredients || []}
        kitchenId={profile.kitchen_id}
        inventoryValues={inventoryValues || []}
        inventoryTotals={totalRows?.[0] ?? null}
      />
      <PendingApprovalsTable
        initialApprovals={enrichedInventoryApprovals as any}
        kitchenId={profile.kitchen_id}
        title="Inventory Actions Pending Approval"
      />
    </div>
  )
}
