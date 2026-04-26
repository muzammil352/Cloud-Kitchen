import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MenuBoard } from '@/components/dashboard/MenuBoard'

export const revalidate = 0

export default async function MenuPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()
    
  if (!profile) redirect('/login')

  if (profile.role !== 'owner') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: '48px', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg style={{ width: '24px', height: '24px', color: 'var(--color-ink-3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', color: 'var(--color-ink-2)', marginBottom: '6px' }}>Owner access required</p>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', maxWidth: '280px' }}>
          Menu management is restricted to kitchen owners.
        </p>
      </div>
    )
  }

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('kitchen_id', profile.kitchen_id)
    .order('category')
    
  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)' }}>Menu</h1>
      </div>
      <MenuBoard initialItems={menuItems || []} kitchenId={profile.kitchen_id} />
    </div>
  )
}
