import { getAssets } from '@/features/assets/services/assets'
import { AssetCard } from '@/features/assets/components/AssetCard'
import { AssetStatusBadge } from '@/features/assets/components/AssetStatusBadge'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import type { AssetStatus } from '@/features/assets/types'

const statusCounts = (assets: Awaited<ReturnType<typeof getAssets>>) => ({
  operational: assets.filter(a => a.status === 'operational').length,
  maintenance: assets.filter(a => a.status === 'maintenance').length,
  out_of_service: assets.filter(a => a.status === 'out_of_service').length,
})

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AssetsPage({ searchParams }: PageProps) {
  const { status } = await searchParams
  const allAssets = await getAssets()
  const counts = statusCounts(allAssets)

  const filtered = status
    ? allAssets.filter(a => a.status === status)
    : allAssets

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activos</h1>
          <p className="text-sm text-muted-foreground mt-1">{allAssets.length} activos registrados</p>
        </div>
        <Link
          href="/assets/new"
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo activo
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/assets"
          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
            !status
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-card text-foreground/80 border-border hover:border-border'
          }`}
        >
          Todos ({allAssets.length})
        </Link>
        {(
          [
            { s: 'operational', label: 'Operativos' },
            { s: 'maintenance', label: 'En mantenimiento' },
            { s: 'out_of_service', label: 'Fuera de servicio' },
          ] as { s: AssetStatus; label: string }[]
        ).map(({ s, label }) => (
          <Link
            key={s}
            href={`/assets?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              status === s
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-card text-foreground/80 border-border hover:border-border'
            }`}
          >
            {label} ({counts[s]})
          </Link>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Search className="h-10 w-10 mb-3" />
          <p className="text-sm">No hay activos con este filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  )
}
