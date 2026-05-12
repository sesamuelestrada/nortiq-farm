import { notFound } from 'next/navigation'
import { getAsset } from '@/features/assets/services/assets'
import { getMaintenanceLogs } from '@/features/maintenance/services/maintenance'
import { AssetStatusBadge } from '@/features/assets/components/AssetStatusBadge'
import { AssetStatusSelect } from '@/features/assets/components/AssetStatusSelect'
import { AssetLifeCard } from '@/features/assets/components/AssetLifeCard'
import { LinerCounter } from '@/features/assets/components/LinerCounter'
import { ExportPdfButton } from '@/features/assets/components/ExportPdfButton'
import { DeleteAssetButton } from '@/features/assets/components/DeleteAssetButton'
import { MaintenanceTimeline } from '@/features/maintenance/components/MaintenanceTimeline'
import { AddScheduleForm } from '@/features/schedules/components/AddScheduleForm'
import { AssetSchedules } from '@/features/schedules/components/AssetSchedules'
import { getSchedulesByAsset } from '@/features/schedules/services/schedules'
import { HorometerCard } from '@/features/assets/components/HorometerCard'
import { createClient } from '@/lib/supabase/server'
import type { LinerConfig } from '@/features/assets/types'
import {
  ArrowLeft,
  Clock,
  Fuel,
  MapPin,
  QrCode,
  Wrench,
  Calendar,
  Hash,
  HeartPulse,
  CalendarClock,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MaintenanceFinding } from '@/features/assets/types'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getOpenFindings(assetId: string): Promise<MaintenanceFinding[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('maintenance_findings')
    .select('*')
    .eq('asset_id', assetId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return (data ?? []) as MaintenanceFinding[]
}

async function getLinerConfig(assetId: string): Promise<LinerConfig | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('liner_configs')
    .select('*')
    .eq('asset_id', assetId)
    .single()
  return data as LinerConfig | null
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params
  const [asset, logs, openFindings] = await Promise.all([
    getAsset(id),
    getMaintenanceLogs(id),
    getOpenFindings(id),
  ])

  const linerConfig = asset?.type === 'milking_system' ? await getLinerConfig(id) : null
  const schedules = await getSchedulesByAsset(id)

  if (!asset) notFound()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/assets"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a activos
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <AssetStatusSelect assetId={asset.id} currentStatus={asset.status} />
            {asset.brand && (
              <span className="text-sm text-muted-foreground">
                {asset.brand}{asset.model ? ` ${asset.model}` : ''}{asset.year ? ` (${asset.year})` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/maintenance/log/${asset.id}`}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
          >
            <Wrench className="h-4 w-4" />
            Registrar mantenimiento
          </Link>
          <ExportPdfButton asset={asset} logs={logs} findings={openFindings} />
          <a
            href={`/api/qr/${asset.id}`}
            download={`qr-${asset.id}.png`}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            Descargar QR
          </a>
          <DeleteAssetButton assetId={asset.id} assetName={asset.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Información del activo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ubicación:</span>
                <span className="font-medium">{asset.location}</span>
              </div>
            )}
            {asset.serial_number && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">N° Serie:</span>
                <span className="font-medium font-mono">{asset.serial_number}</span>
              </div>
            )}
            {asset.current_hours != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Horas actuales:</span>
                <span className="font-medium">{asset.current_hours.toLocaleString('es-MX')} hrs</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Registrado:</span>
              <span className="font-medium">
                {format(new Date(asset.created_at), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            {asset.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">{asset.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telemetry */}
        {asset.telemetry && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Telemetría en vivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.telemetry.hours != null && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Horas de motor</p>
                    <p className="text-lg font-bold">
                      {asset.telemetry.hours.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              )}
              {asset.telemetry.fuel_level != null && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                    <Fuel className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Combustible</p>
                    <p className="text-lg font-bold">{asset.telemetry.fuel_level}%</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/400"
                        style={{ width: `${asset.telemetry.fuel_level}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {asset.telemetry.next_service_hours != null && asset.telemetry.hours != null && (
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Próximo servicio en{' '}
                  <span className="font-medium text-foreground/80">
                    {Math.max(0, asset.telemetry.next_service_hours - asset.telemetry.hours).toLocaleString('es-MX')} hrs
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hoja de Vida */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Hoja de Vida</h2>
        </div>
        <AssetLifeCard
          currentHours={asset.current_hours}
          logs={logs}
          openFindings={openFindings}
        />
      </div>

      {/* Liner Counter — solo para milking_system */}
      {asset.type === 'milking_system' && (
        <div>
          <LinerCounter assetId={asset.id} config={linerConfig} />
        </div>
      )}

      {/* QR Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Código QR del activo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <img
            src={`/api/qr/${asset.id}`}
            alt={`QR ${asset.name}`}
            className="h-24 w-24 rounded-lg border border-border"
          />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Escanea este código para acceder directamente a este activo.</p>
            <p>Ideal para imprimir y pegar en la máquina.</p>
          </div>
        </CardContent>
      </Card>

      {/* Horómetro — solo para tractores */}
      {asset.type === 'tractor' && (
        <HorometerCard
          assetId={asset.id}
          currentHours={asset.current_hours}
          avgHoursPerWeek={asset.avg_hours_per_week}
          hoursUpdatedAt={asset.hours_updated_at}
        />
      )}

      {/* Programas de mantenimiento */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Programas de mantenimiento</h2>
        </div>
        <div className="space-y-3">
          <AssetSchedules schedules={schedules} assetId={asset.id} currentHours={asset.current_hours} />
          <AddScheduleForm asset={asset} />
        </div>
      </div>

      {/* Maintenance History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Historial de mantenimiento</h2>
          <Link
            href={`/maintenance/log/${asset.id}`}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            <Wrench className="h-3.5 w-3.5" />
            Agregar registro
          </Link>
        </div>
        <MaintenanceTimeline logs={logs} />
      </div>
    </div>
  )
}
