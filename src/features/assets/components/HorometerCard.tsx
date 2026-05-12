'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAssetHours, type HorometerFormState } from '../services/assets'
import { Clock, Pencil, Check, X, Loader2, TrendingUp, Info, Gauge } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  assetId: string
  currentHours: number | null
  avgHoursPerWeek: number | null
  hoursUpdatedAt: string | null
}

const initial: HorometerFormState = {}

function calcEstimatedHours(
  currentHours: number,
  avgHoursPerWeek: number,
  updatedAt: string
): number {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.round(currentHours + (daysSince / 7) * avgHoursPerWeek)
}

export function HorometerCard({ assetId, currentHours, avgHoursPerWeek, hoursUpdatedAt }: Props) {
  const [editing, setEditing] = useState(false)
  const [state, action, isPending] = useActionState(updateAssetHours, initial)

  if (state.success && editing) setEditing(false)

  const estimatedHours =
    currentHours != null && avgHoursPerWeek != null && hoursUpdatedAt != null
      ? calcEstimatedHours(currentHours, avgHoursPerWeek, hoursUpdatedAt)
      : null

  // Solo mostramos estimado si es diferente al real (al menos 1h de diferencia)
  const showEstimate = estimatedHours != null && currentHours != null && estimatedHours > currentHours

  const lastUpdatedText = hoursUpdatedAt
    ? formatDistanceToNow(new Date(hoursUpdatedAt), { addSuffix: true, locale: es })
    : null

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Horómetro</h3>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Actualizar
          </button>
        )}
      </div>

      {/* Vista lectura */}
      {!editing && (
        <div className="grid grid-cols-2 gap-3">
          {/* Horas */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {showEstimate ? 'Estimado actual' : 'Horas registradas'}
            </p>
            <p className="text-xl font-bold text-foreground">
              {showEstimate
                ? estimatedHours!.toLocaleString('es-MX')
                : currentHours != null
                  ? currentHours.toLocaleString('es-MX')
                  : '—'
              }
              <span className="text-sm font-normal text-muted-foreground ml-1">h</span>
            </p>
            {showEstimate && (
              <p className="text-[10px] text-muted-foreground">
                Real: {currentHours!.toLocaleString('es-MX')}h
                {lastUpdatedText ? ` · ${lastUpdatedText}` : ''}
              </p>
            )}
            {!showEstimate && lastUpdatedText && (
              <p className="text-[10px] text-muted-foreground">Actualizado {lastUpdatedText}</p>
            )}
          </div>

          {/* Promedio */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1">
            <p className="text-[11px] text-muted-foreground">Uso promedio</p>
            <p className="text-xl font-bold text-foreground">
              {avgHoursPerWeek != null ? avgHoursPerWeek : '—'}
              <span className="text-sm font-normal text-muted-foreground ml-1">h/sem</span>
            </p>
            {avgHoursPerWeek != null && (
              <p className="text-[10px] text-muted-foreground">
                ~{Math.round(avgHoursPerWeek / 7 * 10) / 10}h por día
              </p>
            )}
          </div>
        </div>
      )}

      {/* Aviso si falta el promedio */}
      {!editing && avgHoursPerWeek == null && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            Sin promedio de uso el sistema no puede estimar las horas actuales ni calcular fechas de servicio. Agrega cuántas horas trabaja el equipo por semana.
          </p>
        </div>
      )}

      {/* Aviso de estimación activa */}
      {!editing && showEstimate && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40 px-3 py-2">
          <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300">
            Estimado calculado desde la última lectura real. Se actualiza automáticamente con cada mantenimiento que el mecánico registre con horas.
          </p>
        </div>
      )}

      {/* Modo edición */}
      {editing && (
        <form action={action} className="space-y-3">
          <input type="hidden" name="asset_id" value={assetId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="h-current" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Horas actuales del horómetro
              </Label>
              <Input
                id="h-current"
                name="current_hours"
                type="number"
                min="0"
                step="0.5"
                defaultValue={estimatedHours ?? currentHours ?? ''}
                placeholder="ej. 520"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Las que marca el horómetro ahora mismo
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="h-avg" className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                Horas de trabajo por semana
              </Label>
              <Input
                id="h-avg"
                name="avg_hours_per_week"
                type="number"
                min="1"
                step="0.5"
                defaultValue={avgHoursPerWeek ?? ''}
                placeholder="ej. 40"
              />
              <p className="text-[11px] text-muted-foreground">
                Promedio semanal — para estimar fechas de servicio
              </p>
            </div>
          </div>

          {state.error && (
            <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
          )}

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPending}
            >
              {isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Guardando...</>
                : <><Check className="h-3.5 w-3.5 mr-1" />Guardar</>
              }
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
