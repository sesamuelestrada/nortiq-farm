import { notFound } from 'next/navigation'
import { getAsset } from '@/features/assets/services/assets'
import { MaintenanceLogForm } from '@/features/maintenance/components/MaintenanceLogForm'
import { getSchedulesByAsset } from '@/features/schedules/services/schedules'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ assetId: string }>
}

export default async function MaintenanceLogPage({ params }: PageProps) {
  const { assetId } = await params
  const [asset, schedules] = await Promise.all([
    getAsset(assetId),
    getSchedulesByAsset(assetId),
  ])

  if (!asset) notFound()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <Link
        href={`/assets/${asset.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a {asset.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Registrar mantenimiento</h1>
        <p className="text-sm text-muted-foreground mt-1">{asset.name}</p>
      </div>

      <MaintenanceLogForm asset={asset} schedules={schedules} />
    </div>
  )
}
