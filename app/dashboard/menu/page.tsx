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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', textAlign: 'center', padding: '32px' }}>
        <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-start)', border: '1px solid var(--border)', borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
           <svg style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
           </svg>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Access Restricted</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '300px' }}>
          Menu management is restricted to kitchen owners. Please contact your administrator if you need access.
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
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <MenuBoard initialItems={menuItems || []} kitchenId={profile.kitchen_id} />
    </div>
  )
}
