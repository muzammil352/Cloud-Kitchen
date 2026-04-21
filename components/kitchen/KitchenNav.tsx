'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export function KitchenNav({ kitchenName, role, userName }: { kitchenName: string, role: string, userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <header style={{ 
        height: '64px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 24px', 
        borderBottom: '1px solid var(--kds-border)', 
        backgroundColor: 'var(--kds-bg)', 
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', height: '100%' }}>
          <Link href="/kitchen" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--kds-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {kitchenName}
            {isOffline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '10px', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                Offline
              </span>
            )}
            {!isOffline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '10px', color: '#10B981', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                Live
              </span>
            )}
          </Link>
          <nav style={{ display: 'flex', height: '100%' }}>
            <Link 
              href="/kitchen" 
              style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '0 16px', 
                fontSize: '14px', 
                fontWeight: 500, 
                textDecoration: 'none',
                color: pathname === '/kitchen' ? 'var(--kds-text)' : 'var(--kds-muted)',
                borderBottom: pathname === '/kitchen' ? '3px solid #10B981' : '3px solid transparent'
              }}
            >
              Order Queue
            </Link>
            <Link 
              href="/kitchen/wastage" 
              style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '0 16px', 
                fontSize: '14px', 
                fontWeight: 500, 
                textDecoration: 'none',
                color: pathname === '/kitchen/wastage' ? 'var(--kds-text)' : 'var(--kds-muted)',
                borderBottom: pathname === '/kitchen/wastage' ? '3px solid #10B981' : '3px solid transparent'
              }}
            >
              Log Wastage
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {role === 'owner' && (
            <Link href="/dashboard" style={{ fontSize: '12px', fontWeight: 500, color: '#10B981', textDecoration: 'none' }}>
              Switch to Dashboard
            </Link>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--kds-text)', lineHeight: 1 }}>{userName}</span>
            <span style={{ fontSize: '10px', color: 'var(--kds-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>{role}</span>
          </div>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--kds-surface)', border: '1px solid var(--kds-border)', color: 'var(--kds-muted)', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
    </>
  )
}
