import Link from 'next/link'
import type { AssetHealthData } from '../services/fleet-health'
import type { Asset } from '@/features/assets/types'

interface Props {
  assets: Asset[]
  healthMap: Map<string, AssetHealthData>
}

export function HealthSummaryBar({ assets, healthMap }: Props) {
  let red = 0, yellow = 0, green = 0
  for (const asset of assets) {
    const color = healthMap.get(asset.id)?.healthColor ?? 'green'
    if (color === 'red') red++
    else if (color === 'yellow') yellow++
    else green++
  }
  if (assets.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salud de la flota</span>
      <div className="flex items-center gap-2 ml-1">
        {red > 0 && (
          <Link href="/hoy" className="flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-400 hover:opacity-80 transition-opacity cursor-pointer">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {red} {red === 1 ? 'equipo' : 'equipos'} en rojo
          </Link>
        )}
        {yellow > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {yellow} {yellow === 1 ? 'equipo' : 'equipos'} en amarillo
          </span>
        )}
        {green > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {green} {green === 1 ? 'equipo' : 'equipos'} OK
          </span>
        )}
      </div>
    </div>
  )
}
