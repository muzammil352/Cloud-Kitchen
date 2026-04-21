'use client'

import { usePathname } from 'next/navigation'

export function TopBar({ userName }: { userName: string }) {
  const pathname = usePathname()
  
  let btnText = 'Quick Action'
  if (pathname === '/dashboard') btnText = '+ New Order'
  if (pathname.includes('/dashboard/menu')) btnText = '+ Add Item'

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px', height: '48px', flexShrink: 0 }}>
      {/* Page Title Removed to avoid duplicate headers; child pages manage their own titles. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn-primary">{btnText}</button>
        <span style={{ fontSize: '13px', fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>{userName}</span>
      </div>
    </div>
  )
}

