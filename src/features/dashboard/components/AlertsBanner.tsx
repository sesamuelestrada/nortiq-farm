'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Info, X, Bell } from 'lucide-react'

interface Alert {
  id: string
  asset_id: string | null
  type: 'overdue_maintenance' | 'critical' | 'info'
  message: string
  is_read: boolean
  created_at: string
}

const alertConfig = {
  overdue_maintenance: {
    icon: AlertTriangle,
    wrapperClass: 'border-l-amber-500 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    textColor: 'text-amber-800',
    dismissColor: 'text-amber-500 hover:text-amber-700',
    pulse: false,
  },
  critical: {
    icon: AlertTriangle,
    wrapperClass: 'border-l-red-500 bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-800',
    dismissColor: 'text-red-400 hover:text-red-700',
    pulse: true,
  },
  info: {
    icon: Info,
    wrapperClass: 'border-l-blue-500 bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-800',
    dismissColor: 'text-blue-400 hover:text-blue-700',
    pulse: false,
  },
}

interface Props {
  initialAlerts: Alert[]
}

export function AlertsBanner({ initialAlerts }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts.filter(a => !a.is_read))

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAlerts(prev => [payload.new as Alert, ...prev])
          }
          if (payload.eventType === 'UPDATE' && payload.new.is_read) {
            setAlerts(prev => prev.filter(a => a.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function dismissAlert(id: string) {
    const supabase = createClient()
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  if (alerts.length === 0) return null

  const criticalCount = alerts.filter(a => a.type === 'critical').length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Bell className="h-4 w-4 text-gray-500" />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}
        </span>
        {criticalCount > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {alerts.map(alert => {
        const config = alertConfig[alert.type]
        const Icon = config.icon
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-xl border border-l-4 px-4 py-3 shadow-sm ${config.wrapperClass}`}
          >
            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${config.iconBg} mt-0.5`}>
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.iconColor} ${config.pulse ? 'animate-pulse' : ''}`} />
            </div>
            <p className={`flex-1 text-sm font-medium leading-relaxed ${config.textColor}`}>{alert.message}</p>
            <button
              onClick={() => dismissAlert(alert.id)}
              className={`flex-shrink-0 mt-0.5 transition-colors cursor-pointer ${config.dismissColor}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
