'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, BarChart2, UserCheck, Settings, LogOut, Store, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Menu', href: '/dashboard/menu', icon: UtensilsCrossed },
  { name: 'Storefront', href: '/storefront', icon: Store },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart2 },
  { name: 'Approvals', href: '/dashboard/approvals', icon: UserCheck },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar({
  userEmail,
  userName,
  role,
  kitchenSlug,
}: {
  userEmail: string
  userName?: string
  role: string
  kitchenSlug?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)

  const allowedNavItems = navItems.filter(item => {
    if (role === 'employee' && !['Dashboard', 'Orders'].includes(item.name)) return false
    return true
  })

  useEffect(() => {
    const fetchApprovals = async () => {
      if (role !== 'owner') return
      const { count } = await supabase
        .from('notifications_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (count !== null) setPendingApprovals(count)
    }
    fetchApprovals()
  }, [supabase, role])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [avatarMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'CK'
  const displayName = userName || userEmail.split('@')[0]

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      data-expanded={isExpanded}
      style={{
        width: isExpanded ? '220px' : '68px',
        height: 'calc(100vh - 24px)',
        position: 'fixed',
        top: '12px',
        left: '12px',
        zIndex: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-card)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        gap: '4px',
        border: 'none',
        flexShrink: 0,
        transition: 'width 200ms ease',
      }}
    >
      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, width: '100%', alignItems: 'center', padding: '0 12px' }}>
        {allowedNavItems.map(item => {
          let itemHref = item.href
          if (item.name === 'Storefront') {
            itemHref = kitchenSlug ? `/${kitchenSlug}` : '/storefront'
          }

          let isActive = pathname === itemHref || (itemHref !== '/dashboard' && pathname.startsWith(itemHref))
          if (item.name === 'Storefront') {
            isActive = (!!kitchenSlug && pathname.includes(kitchenSlug)) || pathname === '/storefront'
          }

          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={itemHref}
              title={isExpanded ? '' : item.name}
              style={{
                width: isExpanded ? '100%' : '44px',
                height: '44px',
                borderRadius: '12px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                alignItems: 'center',
                padding: isExpanded ? '0 14px' : '0',
                gap: isExpanded ? '12px' : '0',
                backgroundColor: isActive ? 'var(--accent-surface)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                position: 'relative',
                transition: 'width 200ms ease, padding 200ms ease, gap 200ms ease, background-color var(--transition), color var(--transition)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '20px' }}>
                <Icon size={20} strokeWidth={1.5} />
              </div>

              <span style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                fontSize: '13px',
                color: 'inherit',
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? 'auto' : '0px',
                transition: 'opacity 150ms ease 80ms, width 200ms ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}>
                {item.name}
              </span>

              {item.name === 'Approvals' && pendingApprovals > 0 && (
                <span style={{
                  position: 'absolute',
                  top: isExpanded ? '15px' : '2px',
                  right: isExpanded ? '14px' : '2px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {pendingApprovals}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: avatar only */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, width: '100%', padding: '0 12px' }}>

        {/* FIX 4 — Clickable avatar with dropdown */}
        <div ref={avatarMenuRef} style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
          {avatarMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '48px',
              left: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-card)',
              minWidth: '200px',
              padding: '8px',
              zIndex: 100,
            }}>
              {/* User info */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {displayName}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {userEmail}
                </div>
              </div>

              {/* My Profile */}
              <button
                onClick={() => setAvatarMenuOpen(false)}
                style={{ width: '100%', height: '36px', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <User size={16} strokeWidth={1.5} />
                My Profile
              </button>

              {/* Settings */}
              <button
                onClick={() => { router.push('/dashboard/settings'); setAvatarMenuOpen(false) }}
                style={{ width: '100%', height: '36px', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Settings size={16} strokeWidth={1.5} />
                Settings
              </button>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

              {/* Sign Out */}
              <button
                onClick={() => { handleLogout(); setAvatarMenuOpen(false) }}
                style={{ width: '100%', height: '36px', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontFamily: 'var(--font-ui)', color: '#C0392B', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background var(--transition)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={16} strokeWidth={1.5} />
                Sign Out
              </button>
            </div>
          )}

          {/* Avatar button */}
          <button
            onClick={() => setAvatarMenuOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              width: '100%',
              padding: isExpanded ? '0 14px' : '0',
              gap: isExpanded ? '12px' : '0',
              height: '40px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '50%',
              transition: 'opacity var(--transition), padding 200ms ease, gap 200ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-surface)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '12px', color: 'var(--accent)' }}>
                {initials}
              </span>
            </div>

            <span style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
              fontSize: '13px',
              color: 'var(--text-primary)',
              opacity: isExpanded ? 1 : 0,
              transition: 'opacity 150ms ease 80ms',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
              {displayName}
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
