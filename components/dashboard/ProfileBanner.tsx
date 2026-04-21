'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, X } from 'lucide-react'

export function ProfileBanner({ isIncomplete }: { isIncomplete: boolean }) {
  const [isDismissed, setIsDismissed] = useState(true) // Default true to prevent hydration flicker

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
    <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 animate-in slide-in-from-top-4 z-40 relative">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <p className="text-sm font-medium text-amber-800">
          Your kitchen profile is incomplete. 
          <Link href="/dashboard/settings#profile-form" className="ml-1 underline font-bold hover:text-amber-900 transition-colors pointer-events-auto relative z-50">
            Complete your profile
          </Link>
          {' '}to enable full visibility.
        </p>
      </div>
      <button 
        onClick={handleDismiss}
        className="p-1 hover:bg-amber-200/50 rounded-md transition-colors text-amber-700 pointer-events-auto relative z-50"
        title="Dismiss for this session"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
