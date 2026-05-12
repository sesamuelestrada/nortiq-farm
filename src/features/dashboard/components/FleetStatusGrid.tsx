'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AssetStatusBadge } from '@/features/assets/components/AssetStatusBadge'
import { Tractor, Truck, Wrench, Hammer, Fuel, Clock, Milk } from 'lucide-react'
import type { Asset, AssetType, AssetHealthColor } from '@/features/assets/types'

const typeIcons: Record<AssetType, React.ElementType> = {
  tractor: Tractor, truck: Truck, implement: Wrench, tool: Hammer, milking_system: Milk,
}

const healthBorder: Record<AssetHealthColor, string> = {
  red: 'border-l-red-500', yellow: 'border-l-amber-500', green: 'border-l-emerald-500',
}

const healthIconBg: Record<AssetHealthColor, string> = {
  red:    'group-hover:bg-red-50    group-hover:text-red-600    dark:group-hover:bg-red-950/40    dark:group-hover:text-red-400',
  yellow: 'group-hover:bg-amber-50  group-hover:text-amber-600  dark:group-hover:bg-amber-950/40  dark:group-hover:text-amber-400',
  green:  'group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:group-hover:bg-emerald-950/40 dark:group-hover:text-emerald-400',
}

const healthDot: Record<AssetHealthColor, string> = {
  red: 'bg-red-500 animate-pulse', yellow: 'bg-amber-500', green: 'bg-emerald-500',
}

interface Props {
  initialAssets: Asset[]
  healthColors?: Record<string, AssetHealthColor>
  healthReasons?: Record<string, string>
}

export function FleetStatusGrid({ initialAssets, healthColors = {}, healthReasons = {} }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('fleet-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
        if (payload.eventType === 'UPDATE') setAssets(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...(payload.new as Asset) } : a))
        if (payload.eventType === 'INSERT') setAssets(prev => [payload.new as Asset, ...prev])
        if (payload.eventType === 'DELETE') setAssets(prev => prev.filter(a => a.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (assets.length === 0) return (
    <div className="text-center py-10 text-muted-foreground text-sm">No hay activos registrados aún.</div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {assets.map(asset => {
        const Icon = typeIcons[asset.type as AssetType] ?? Wrench
        const telemetry = asset.telemetry as { hours?: number; fuel_level?: number } | null
        const healthColor: AssetHealthColor = healthColors[asset.id] ?? 'green'
        const reason = healthReasons[asset.id]
        return (
          <Link
            key={asset.id}
            href={`/assets/${asset.id}`}
            className={`group flex items-start gap-3 rounded-2xl border border-border border-l-4 ${healthBorder[healthColor]} bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
          >
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all duration-200 ${healthIconBg[healthColor]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{asset.name}</p>
                <span className={`flex-shrink-0 h-2 w-2 rounded-full ${healthDot[healthColor]}`} />
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <AssetStatusBadge status={asset.status as Asset['status']} className="text-xs" />
                {asset.location && <span className="text-xs text-muted-foreground truncate">{asset.location}</span>}
              </div>
              {reason && (
                <p className={`mt-1 text-xs font-medium ${
                  healthColor === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {reason}
                </p>
              )}
              {telemetry && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {telemetry.hours != null && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /><span className="font-data">{telemetry.hours.toLocaleString('es-MX')} hrs</span></span>
                  )}
                  {telemetry.fuel_level != null && (
                    <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /><span className="font-data">{telemetry.fuel_level}%</span></span>
                  )}
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
