'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Settings, Store, Brain, HeartHandshake, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const navItems = [
  { name: 'Dashboard',    href: '/dashboard',             icon: LayoutDashboard },
  { name: 'Orders',       href: '/dashboard/orders',      icon: ShoppingBag },
  { name: 'Menu',         href: '/dashboard/menu',        icon: UtensilsCrossed },
  { name: 'Storefront',   href: '/storefront',            icon: Store },
  { name: 'Customers',    href: '/dashboard/customers',   icon: Users },
  { name: 'Intelligence', href: '/dashboard/intelligence',       icon: Brain         },
  { name: 'CRM',          href: '/dashboard/customer-relations', icon: HeartHandshake },
  { name: 'Inventory',   href: '/dashboard/inventory',          icon: Package        },
  { name: 'Settings',     href: '/dashboard/settings',    icon: Settings },
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
  const supabase = createClient()
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

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

    </aside>
  )
}
