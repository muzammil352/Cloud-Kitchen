import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ProfileBanner } from '@/components/dashboard/ProfileBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, kitchens(*)')
    .eq('user_id', user.id)
    .single()

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
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* SVG noise grain */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.025 }} aria-hidden="true">
        <filter id="grain-dashboard">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-dashboard)"/>
      </svg>

      {/* Drafting grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: `
          repeating-linear-gradient(rgba(26,25,23,0.04) 0px, transparent 1px),
          repeating-linear-gradient(90deg, rgba(26,25,23,0.04) 0px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      <style dangerouslySetInnerHTML={{ __html: `
        main.dashboard-main {
          margin-left: 68px;
          transition: margin-left 200ms ease;
        }
        aside[data-expanded="true"] + main.dashboard-main {
          margin-left: 220px;
        }
      `}} />

      <Sidebar
        userEmail={user.email!}
        userName={displayName}
        role={profile.role}
        kitchenSlug={kitchen?.slug || ''}
        kitchenId={kitchen?.kitchen_id || ''}
      />

      <main className="dashboard-main" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
      }}>
        <ProfileBanner isIncomplete={isIncomplete} />
        {children}
      </main>
    </div>
  )
}
