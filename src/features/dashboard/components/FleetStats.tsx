'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tractor, CheckCircle2, Wrench, AlertTriangle } from 'lucide-react'
import type { Asset } from '@/features/assets/types'

interface Props {
  initialAssets: Asset[]
}

export function FleetStats({ initialAssets }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('fleet-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
        if (payload.eventType === 'UPDATE') setAssets(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...(payload.new as Asset) } : a))
        if (payload.eventType === 'INSERT') setAssets(prev => [payload.new as Asset, ...prev])
        if (payload.eventType === 'DELETE') setAssets(prev => prev.filter(a => a.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const operational  = assets.filter(a => a.status === 'operational').length
  const inMaintenance = assets.filter(a => a.status === 'maintenance').length
  const outOfService  = assets.filter(a => a.status === 'out_of_service').length
  const total = assets.length

  const stats = [
    {
      label: 'Total activos',
      value: total,
      icon: Tractor,
      iconBg:      'bg-muted',
      iconColor:   'text-muted-foreground',
      borderColor: 'border-l-border',
      valueColor:  'text-foreground',
      barColor:    'bg-muted-foreground',
      barWidth: '100%',
    },
    {
      label: 'Operativos',
      value: operational,
      icon: CheckCircle2,
      iconBg:      'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor:   'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-l-emerald-500',
      valueColor:  'text-emerald-600 dark:text-emerald-400',
      barColor:    'bg-emerald-500',
      barWidth: total > 0 ? `${Math.round((operational / total) * 100)}%` : '0%',
    },
    {
      label: 'En mantenimiento',
      value: inMaintenance,
      icon: Wrench,
      iconBg:      'bg-amber-50 dark:bg-amber-950/40',
      iconColor:   'text-amber-600 dark:text-amber-400',
      borderColor: 'border-l-amber-500',
      valueColor:  'text-amber-600 dark:text-amber-400',
      barColor:    'bg-amber-500',
      barWidth: total > 0 ? `${Math.round((inMaintenance / total) * 100)}%` : '0%',
    },
    {
      label: 'Fuera de servicio',
      value: outOfService,
      icon: AlertTriangle,
      iconBg:      'bg-red-50 dark:bg-red-950/40',
      iconColor:   'text-red-600 dark:text-red-400',
      borderColor: 'border-l-red-500',
      valueColor:  'text-red-600 dark:text-red-400',
      barColor:    'bg-red-500',
      barWidth: total > 0 ? `${Math.round((outOfService / total) * 100)}%` : '0%',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, iconBg, iconColor, borderColor, valueColor, barColor, barWidth }) => (
        <div
          key={label}
          className={`rounded-2xl bg-card border border-border border-l-4 ${borderColor} p-5 shadow-sm hover:shadow-md transition-all duration-200`}
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
          </div>
          <p className={`text-5xl font-bold font-data tabular-nums leading-none mb-4 ${valueColor}`}>
            {value}
          </p>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: barWidth }} />
          </div>
        </div>
      ))}
    </div>
  )
}
