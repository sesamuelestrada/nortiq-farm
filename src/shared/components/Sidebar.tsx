'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/features/auth/services/auth'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Wrench,
  Tractor,
  LogOut,
  ChevronRight,
  User,
  BarChart3,
  ClipboardList,
  CalendarClock,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { href: '/hoy', label: 'Hoy', icon: ClipboardList, badge: 'hoy' },
  { href: '/assets', label: 'Activos', icon: Tractor },
  { href: '/maintenance', label: 'Mantenimiento', icon: Wrench },
  { href: '/programas', label: 'Programas', icon: CalendarClock },
  { href: '/kpis', label: 'KPIs', icon: BarChart3 },
]

interface Props {
  userName?: string
  initialHoyCount: number
}

export function Sidebar({ userName, initialHoyCount }: Props) {
  const pathname = usePathname()
  const [hoyCount, setHoyCount] = useState(initialHoyCount)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCounts() {
      const [{ count: a }, { count: f }] = await Promise.all([
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('maintenance_findings').select('id', { count: 'exact', head: true }).eq('status', 'open').in('severity', ['critical', 'high']),
      ])
      setHoyCount((a ?? 0) + (f ?? 0))
    }

    const channel = supabase
      .channel('sidebar-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_findings' }, () => fetchCounts())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-gray-800/60 bg-gray-950">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-800/60 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shadow-[0_0_12px_rgba(5,150,105,0.4)]">
          <Tractor className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Nortiq</p>
          <p className="text-xs text-gray-500">Mantenimiento</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
          const isHoy = badge === 'hoy'
          const count = isHoy ? hoyCount : 0
          const hasCount = count > 0

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? hasCount && isHoy
                    ? 'bg-red-500/10 text-red-400 border-l-2 border-l-red-500 pl-[10px]'
                    : 'bg-emerald-500/10 text-emerald-400 border-l-2 border-l-emerald-500 pl-[10px]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-l-transparent pl-[10px]'
              )}
            >
              <Icon className={cn(
                'h-4 w-4 flex-shrink-0',
                isActive
                  ? hasCount && isHoy ? 'text-red-400' : 'text-emerald-400'
                  : hasCount && isHoy ? 'text-red-500' : 'text-gray-500 group-hover:text-gray-300'
              )} />
              <span className="flex-1">{label}</span>
              {hasCount && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                  {count > 9 ? '9+' : count}
                </span>
              )}
              {isActive && !hasCount && <ChevronRight className="h-3 w-3 text-emerald-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800/60 p-3 space-y-1">
        {userName && (
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-800">
              <User className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <span className="truncate font-medium text-gray-300">{userName}</span>
          </div>
        )}
        <ThemeToggle />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
