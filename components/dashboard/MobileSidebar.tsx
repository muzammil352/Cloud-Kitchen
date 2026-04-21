'use client'

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function MobileSidebar({ userEmail, role }: { userEmail: string, role: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={
          <button className="p-2 -ml-2 text-foreground cursor-pointer">
            <Menu className="w-6 h-6" />
          </button>
        } />
        <SheetContent side="left" className="p-0 w-[220px] flex flex-col items-stretch">
          <SheetHeader className="sr-only">
             <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <Sidebar userEmail={userEmail} role={role} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
