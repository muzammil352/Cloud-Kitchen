'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="p-2 text-[#111110] hover:text-[#16a34a] transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
      </button>

      {open && (
        <div className="fixed top-16 inset-x-0 bg-white border-b border-[#e5e5e3] z-50 px-4 py-4 flex flex-col gap-3 shadow-sm">
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-sm font-medium text-[#111110] border border-[#c9c9c6] rounded-[6px] text-center hover:bg-[#f3f3f1] transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-sm font-medium text-white bg-[#16a34a] rounded-[6px] text-center hover:bg-[#15803d] transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      )}
    </div>
  )
}
