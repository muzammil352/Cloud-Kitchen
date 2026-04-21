import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProfileBanner } from '@/components/dashboard/ProfileBanner'


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  // 1. Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch Profile to confirm role and kitchen
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, kitchens(*)')
    .eq('user_id', user.id)
    .single()

  // STRICT GUARD: Must be owner or employee
  if (!profile || !['owner', 'employee'].includes(profile.role)) {
    redirect('/login')
  }

  const kitchen = profile.kitchens as any
  const isIncomplete = !kitchen?.city || !kitchen?.phone

  const displayName = (profile as any).name || (user.email ? user.email.split('@')[0] : 'User')

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, var(--bg-start), var(--bg-end))',
      display: 'flex',
      overflow: 'hidden'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        main {
          margin-left: 68px;
          transition: margin-left 200ms ease;
        }

        aside[data-expanded="true"] + main {
          margin-left: 220px;
        }
      `}} />

      <Sidebar
        userEmail={user.email!}
        userName={displayName}
        role={profile.role}
        kitchenSlug={kitchen?.kitchen_id || ''}
      />

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <ProfileBanner isIncomplete={isIncomplete} />
        {children}
      </main>
    </div>
  )
}
