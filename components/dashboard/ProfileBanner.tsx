'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, X } from 'lucide-react'

export function ProfileBanner({ isIncomplete }: { isIncomplete: boolean }) {
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem('profile-banner-dismissed') === 'true'
    setIsDismissed(dismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('profile-banner-dismissed', 'true')
    setIsDismissed(true)
  }

  if (!isIncomplete || isDismissed) return null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'var(--color-amber-bg)',
      borderBottom: '1px solid rgba(196,122,30,0.2)',
      padding: '12px 24px',
      marginBottom: '24px',
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertCircle size={16} strokeWidth={1.5} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
        <p style={{ fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--color-amber)', margin: 0 }}>
          Your kitchen profile is incomplete.{' '}
          <Link
            href="/dashboard/settings"
            style={{ fontWeight: 500, color: 'var(--color-amber)', textDecoration: 'underline' }}
          >
            Complete your profile
          </Link>
          {' '}to enable full visibility.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          color: 'var(--color-amber)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <X size={15} strokeWidth={1.5} />
      </button>
    </div>
  )
}
