'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Tractor, ClipboardList, CalendarClock, Wrench } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/assets', label: 'Activos', icon: Tractor },
  { href: '/hoy', label: 'Hoy', icon: ClipboardList, badge: true },
  { href: '/programas', label: 'Programas', icon: CalendarClock },
  { href: '/maintenance', label: 'Servicio', icon: Wrench },
]

interface Props {
  initialHoyCount: number
}

export function BottomNav({ initialHoyCount }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-gray-200/50 dark:border-gray-800/60 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {navItems.map(({ href, label, icon: Icon, badge }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        const count = badge ? initialHoyCount : 0
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-all duration-200 relative cursor-pointer',
              isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            )}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-500" />
            )}
            <div className="relative">
              <Icon className={cn('h-5 w-5', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500')} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </div>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
