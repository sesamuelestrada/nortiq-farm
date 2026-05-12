import { getAssets } from '@/features/assets/services/assets'
import { getRecentLogs } from '@/features/maintenance/services/maintenance'
import { getFleetHealthData } from '@/features/dashboard/services/fleet-health'
import { FleetStatusGrid } from '@/features/dashboard/components/FleetStatusGrid'
import { FleetStats } from '@/features/dashboard/components/FleetStats'
import { AlertsBanner } from '@/features/dashboard/components/AlertsBanner'
import { HealthSummaryBar } from '@/features/dashboard/components/HealthSummaryBar'
import { MaintenanceTimeline } from '@/features/maintenance/components/MaintenanceTimeline'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { AssetHealthColor } from '@/features/assets/types'

async function getAlerts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function DashboardPage() {
  const [assets, recentLogs, alerts, healthMap] = await Promise.all([
    getAssets(),
    getRecentLogs(5),
    getAlerts(),
    getFleetHealthData(),
  ])

  const healthColors: Record<string, AssetHealthColor> = {}
  const healthReasons: Record<string, string> = {}
  for (const [assetId, data] of healthMap.entries()) {
    healthColors[assetId] = data.healthColor
    if (data.healthColor === 'red') {
      const hasCritical = data.openFindings.some(f => f.severity === 'critical' || f.severity === 'high')
      healthReasons[assetId] = hasCritical ? 'Hallazgo crítico' : 'Mantenimiento vencido'
    } else if (data.healthColor === 'yellow') {
      const hasMedium = data.openFindings.some(f => f.severity === 'medium')
      healthReasons[assetId] = hasMedium ? 'Hallazgo pendiente' : 'Mantenimiento próximo'
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel Principal</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general de la flota del rancho</p>
      </div>

      {/* Health Summary Bar */}
      <HealthSummaryBar assets={assets} healthMap={healthMap} />

      {/* Alerts */}
      {alerts.length > 0 && <AlertsBanner initialAlerts={alerts as Parameters<typeof AlertsBanner>[0]['initialAlerts']} />}

      {/* Stats — realtime */}
      <FleetStats initialAssets={assets} />

      {/* Fleet Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Estado de la flota</h2>
          <Link
            href="/assets"
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Ver todos →
          </Link>
        </div>
        <FleetStatusGrid initialAssets={assets} healthColors={healthColors} healthReasons={healthReasons} />
      </div>

      {/* Recent Maintenance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Mantenimientos recientes</h2>
        </div>
        <MaintenanceTimeline logs={recentLogs} />
      </div>
    </div>
  )
}
