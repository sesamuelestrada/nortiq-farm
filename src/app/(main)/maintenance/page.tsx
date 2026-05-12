import { getMaintenanceLogs } from '@/features/maintenance/services/maintenance'
import { MaintenanceTimeline } from '@/features/maintenance/components/MaintenanceTimeline'
import { AssetFilter } from '@/features/maintenance/components/AssetFilter'
import { getAssets } from '@/features/assets/services/assets'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ asset?: string }>
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const { asset: assetId } = await searchParams
  const [logs, assets] = await Promise.all([
    getMaintenanceLogs(assetId),
    getAssets(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial de mantenimiento</h1>
          <p className="text-sm text-muted-foreground mt-1">{logs.length} registros</p>
        </div>
      </div>

      {/* Filter by asset */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar por activo:</span>
        <div className="w-64">
          <AssetFilter assets={assets} selectedAssetId={assetId} />
        </div>
        {assetId && (
          <Link href="/maintenance" className="text-sm text-muted-foreground hover:text-muted-foreground">
            Limpiar filtro
          </Link>
        )}
      </div>

      <MaintenanceTimeline logs={logs} />
    </div>
  )
}
