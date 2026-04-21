import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KitchenNav } from '@/components/kitchen/KitchenNav'

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, kitchens(name)')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['owner', 'employee'].includes(profile.role)) {
    redirect('/login')
  }

  const kitchenName = (profile.kitchens as any)?.name || 'Kitchen'

  return (
    <div style={{
      '--kds-bg': '#000000',
      '--kds-surface': '#1A1A1A',
      '--kds-border': '#333333',
      '--kds-text': '#FFFFFF',
      '--kds-muted': '#888888',
      backgroundColor: 'var(--kds-bg)',
      color: 'var(--kds-text)',
      height: '100dvh',
      width: '100vw',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      touchAction: 'manipulation'
    } as React.CSSProperties}>
      <KitchenNav kitchenName={kitchenName} role={profile.role} userName={profile.name} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>
    </div>
  )
}
