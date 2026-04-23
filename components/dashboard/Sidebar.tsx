'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, BarChart2, UserCheck, Settings, LogOut, Store, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const navItems = [
  { name: 'Dashboard',  href: '/dashboard',           icon: LayoutDashboard },
  { name: 'Orders',     href: '/dashboard/orders',     icon: ShoppingBag },
  { name: 'Menu',       href: '/dashboard/menu',       icon: UtensilsCrossed },
  { name: 'Storefront', href: '/storefront',           icon: Store },
  { name: 'Customers',  href: '/dashboard/customers',  icon: Users },
  { name: 'Reports',    href: '/dashboard/reports',    icon: BarChart2 },
  { name: 'Approvals',  href: '/dashboard/approvals',  icon: UserCheck },
  { name: 'Settings',   href: '/dashboard/settings',   icon: Settings },
]

export function Sidebar({
  userEmail,
  userName,
  role,
  kitchenSlug,
  kitchenId,
}: {
  userEmail: string
  userName?: string
  role: string
  kitchenSlug?: string
  kitchenId?: string
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
      if (role !== 'owner' || !kitchenId) return
      const { count } = await supabase
        .from('notifications_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('kitchen_id', kitchenId)
      if (count !== null) setPendingApprovals(count)
    }
    fetchApprovals()
  }, [supabase, role, kitchenId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    if (avatarMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [avatarMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : userEmail.substring(0, 2).toUpperCase()
  const displayName = userName || userEmail.split('@')[0]

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      data-expanded={isExpanded}
      style={{
        width: isExpanded ? '220px' : '68px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo area */}
      <div style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        padding: isExpanded ? '0 20px' : '0',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        transition: 'padding 200ms ease, justify-content 200ms ease',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        {isExpanded ? (
          <>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '18px', color: 'var(--color-ink)' }}>Kitchen</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--color-accent)' }}>OS</span>
          </>
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--color-accent)' }}>KOS</span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: 1,
        padding: '12px 8px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
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
              title={!isExpanded ? item.name : ''}
              style={{
                height: '44px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                padding: '0 12px',
                gap: '12px',
                backgroundColor: isActive ? 'var(--color-accent-bg)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-ink-3)',
                borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                position: 'relative',
                textDecoration: 'none',
                transition: 'background-color var(--transition), color var(--transition)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
                  e.currentTarget.style.color = 'var(--color-ink-2)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--color-ink-3)'
                }
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
                <Icon size={20} strokeWidth={1.5} />
              </div>

              <span style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                fontSize: '14px',
                color: 'inherit',
                opacity: isExpanded ? 1 : 0,
                transition: 'opacity 150ms ease 60ms',
                overflow: 'hidden',
              }}>
                {item.name}
              </span>

              {/* Pending approvals red dot */}
              {item.name === 'Approvals' && pendingApprovals > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  left: isExpanded ? 'auto' : '30px',
                  right: isExpanded ? '14px' : 'auto',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-red)',
                  flexShrink: 0,
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: avatar */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div ref={avatarMenuRef} style={{ position: 'relative' }}>
          {/* Avatar dropdown */}
          {avatarMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '52px',
              left: '0',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '200px',
              padding: '8px',
              zIndex: 200,
            }}>
              <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border)', marginBottom: '4px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', color: 'var(--color-ink)' }}>
                  {displayName}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
                  {userEmail}
                </div>
              </div>

              <MenuButton icon={<User size={15} strokeWidth={1.5} />} label="My Profile" onClick={() => setAvatarMenuOpen(false)} />
              <MenuButton icon={<Settings size={15} strokeWidth={1.5} />} label="Settings" onClick={() => { router.push('/dashboard/settings'); setAvatarMenuOpen(false) }} />

              <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

              <MenuButton
                icon={<LogOut size={15} strokeWidth={1.5} />}
                label="Sign out"
                onClick={() => { handleLogout(); setAvatarMenuOpen(false) }}
                danger
              />
            </div>
          )}

          {/* Avatar button */}
          <button
            onClick={() => setAvatarMenuOpen(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              height: '44px',
              padding: '0 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'background var(--transition)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '12px', color: 'var(--color-accent)' }}>
                {initials}
              </span>
            </div>

            <span style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: '13px',
              color: 'var(--color-ink)',
              opacity: isExpanded ? 1 : 0,
              transition: 'opacity 150ms ease 60ms',
              overflow: 'hidden',
              textAlign: 'left',
            }}>
              {displayName}
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: '36px',
        borderRadius: '6px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        fontFamily: 'var(--font-body)',
        color: danger ? 'var(--color-red)' : 'var(--color-ink)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background var(--transition)',
        textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'var(--color-red-bg)' : 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )
}
