import Link from 'next/link'
import { AssetStatusBadge } from './AssetStatusBadge'
import { Fuel, Clock, MapPin, Tractor, Truck, Wrench, Hammer, Milk } from 'lucide-react'
import type { Asset, AssetStatus, AssetType } from '../types'

const typeIcons: Record<AssetType, React.ElementType> = {
  tractor: Tractor, truck: Truck, implement: Wrench, tool: Hammer, milking_system: Milk,
}

const typeLabels: Record<AssetType, string> = {
  tractor: 'Tractor', truck: 'Camión', implement: 'Implemento',
  tool: 'Herramienta', milking_system: 'Sistema de Ordeña',
}

const statusBorder: Record<AssetStatus, string> = {
  operational: 'border-l-emerald-500',
  maintenance: 'border-l-amber-500',
  out_of_service: 'border-l-red-500',
}

const statusIconBg: Record<AssetStatus, string> = {
  operational: 'group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:group-hover:bg-emerald-950/40 dark:group-hover:text-emerald-400',
  maintenance:  'group-hover:bg-amber-50  group-hover:text-amber-600  dark:group-hover:bg-amber-950/40  dark:group-hover:text-amber-400',
  out_of_service: 'group-hover:bg-red-50  group-hover:text-red-600    dark:group-hover:bg-red-950/40    dark:group-hover:text-red-400',
}

interface Props { asset: Asset }

export function AssetCard({ asset }: Props) {
  const Icon = typeIcons[asset.type]
  return (
    <Link href={`/assets/${asset.id}`}>
      <div className={`group cursor-pointer rounded-2xl bg-card border border-border border-l-4 ${statusBorder[asset.status]} p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all duration-200 ${statusIconBg[asset.status]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight truncate">{asset.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {typeLabels[asset.type]}{asset.brand ? ` · ${asset.brand}` : ''}{asset.model ? ` ${asset.model}` : ''}
              </p>
            </div>
          </div>
          <AssetStatusBadge status={asset.status} className="text-xs flex-shrink-0" />
        </div>

        <div className="space-y-1.5 pt-3 border-t border-border">
          {asset.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{asset.location}</span>
            </div>
          )}
          {asset.telemetry && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {asset.telemetry.hours != null && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="font-data">{asset.telemetry.hours.toLocaleString('es-MX')} hrs</span>
                </div>
              )}
              {asset.telemetry.fuel_level != null && (
                <div className="flex items-center gap-2 flex-1">
                  <Fuel className="h-3 w-3 flex-shrink-0" />
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${asset.telemetry.fuel_level}%` }} />
                    </div>
                    <span className="font-data text-xs tabular-nums">{asset.telemetry.fuel_level}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
