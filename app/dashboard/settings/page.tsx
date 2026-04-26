import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/dashboard/SettingsForm'

export const revalidate = 0

export default async function SettingsPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('kitchen_id, role')
    .eq('user_id', user.id)
    .single()
    
  if (!profile || profile.role !== 'owner') {
    // Only owners can touch settings
    redirect('/dashboard')
  }

  const { data: kitchen } = await supabase
    .from('kitchens')
    .select('*')
    .eq('kitchen_id', profile.kitchen_id)
    .single()

  return (
    <div style={{ opacity: 0, animation: 'fadeIn 300ms forwards', maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '22px', color: 'var(--color-ink)' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginTop: '4px' }}>Manage your kitchen profile and notification preferences.</p>
      </div>

      <SettingsForm kitchen={kitchen} />
    </div>
  )
}
