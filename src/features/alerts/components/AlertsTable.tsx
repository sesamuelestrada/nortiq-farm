'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Info, X, CheckCheck, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Alert {
  id: string
  asset_id: string | null
  type: 'overdue_maintenance' | 'critical' | 'info'
  message: string
  is_read: boolean
  created_at: string
  asset?: { id: string; name: string } | null
}

const typeConfig = {
  overdue_maintenance: {
    icon: AlertTriangle,
    label: 'Mantenimiento vencido',
    rowBg: 'bg-amber-50/50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  critical: {
    icon: AlertTriangle,
    label: 'Crítico',
    rowBg: 'bg-red-50/50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
  info: {
    icon: Info,
    label: 'Informativo',
    rowBg: 'bg-blue-50/20',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
}

interface Props {
  initialAlerts: Alert[]
}

export function AlertsTable({ initialAlerts }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('alerts-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAlerts(prev => [payload.new as Alert, ...prev])
        }
        if (payload.eventType === 'UPDATE') {
          setAlerts(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...(payload.new as Alert) } : a))
        }
        if (payload.eventType === 'DELETE') {
          setAlerts(prev => prev.filter(a => a.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function markRead(id: string) {
    const supabase = createClient()
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  async function markAllRead() {
    const supabase = createClient()
    const unread = alerts.filter(a => !a.is_read)
    await supabase.from('alerts').update({ is_read: true }).in('id', unread.map(a => a.id))
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
  }

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read
    if (filter === 'read') return a.is_read
    return true
  })

  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm">
          {(['unread', 'all', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${filter === f ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {f === 'unread' ? `Sin leer${unreadCount > 0 ? ` (${unreadCount})` : ''}` : f === 'all' ? 'Todas' : 'Leídas'}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          {filter === 'unread' ? 'No hay alertas pendientes. Todo en orden.' : 'No hay alertas en esta categoría.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
          {filtered.map(alert => {
            const config = typeConfig[alert.type] ?? typeConfig.info
            const Icon = config.icon
            return (
              <div key={alert.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${config.rowBg} ${alert.is_read ? 'opacity-60' : ''}`}>
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${config.iconBg} mt-0.5`}>
                  <Icon className={`h-4 w-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm text-gray-800 leading-relaxed flex-1">{alert.message}</p>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                    </span>
                    {alert.asset_id && (
                      <Link
                        href={`/assets/${alert.asset_id}`}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Ver activo
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markRead(alert.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5 cursor-pointer"
                    title="Marcar como leída"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
