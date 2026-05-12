'use client'

import { useActionState, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VoiceInputButton } from './VoiceInputButton'
import { createMaintenanceLog, type LogFormState } from '../services/maintenance'
import type { Asset } from '@/features/assets/types'
import type { MaintenanceSchedule } from '@/features/assets/types'
import type { VoiceExtractedData } from '../types'
import { Loader2, CheckCircle2, CalendarClock, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  asset: Asset
  schedules?: MaintenanceSchedule[]
}

const initialState: LogFormState = {}

export function MaintenanceLogForm({ asset, schedules = [] }: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(createMaintenanceLog, initialState)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  const [formValues, setFormValues] = useState({
    type: 'preventive',
    description: '',
    performed_by_name: '',
    parts_used: '',
    hours_spent: '',
    asset_hours_at_service: asset.current_hours ? String(asset.current_hours) : '',
    next_service_date: '',
    cost_estimate: '',
    voice_transcript: '',
  })

  const handleVoiceExtracted = useCallback(
    (data: VoiceExtractedData, transcript: string) => {
      setFormValues(prev => ({
        ...prev,
        type: data.type ?? prev.type,
        description: data.description ?? prev.description,
        parts_used: data.parts_used?.join(', ') ?? prev.parts_used,
        hours_spent: data.hours_spent != null ? String(data.hours_spent) : prev.hours_spent,
        asset_hours_at_service:
          data.asset_hours_at_service != null
            ? String(data.asset_hours_at_service)
            : prev.asset_hours_at_service,
        next_service_date: data.next_service_date ?? prev.next_service_date,
        cost_estimate: data.cost_estimate != null ? String(data.cost_estimate) : prev.cost_estimate,
        performed_by_name: data.performed_by_name ?? prev.performed_by_name,
        voice_transcript: transcript,
      }))
    },
    []
  )

  const set = (field: keyof typeof formValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFormValues(prev => ({ ...prev, [field]: e.target.value }))

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Registro guardado</h2>
        <p className="text-sm text-muted-foreground text-center">
          El mantenimiento fue registrado correctamente.
          {selectedScheduleId && ' El programa fue avanzado al siguiente ciclo.'}
        </p>
        <Button onClick={() => router.push(`/assets/${asset.id}`)} className="mt-2">
          Ver activo
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="asset_id" value={asset.id} />
      <input type="hidden" name="voice_transcript" value={formValues.voice_transcript} />
      {selectedScheduleId && (
        <input type="hidden" name="schedule_id" value={selectedScheduleId} />
      )}

      {/* Selector de programa — solo si hay programas activos */}
      {schedules.length > 0 && (
        <div className="space-y-2">
          <Label>¿Estás completando un programa programado?</Label>
          <p className="text-xs text-muted-foreground">
            Si seleccionas uno, el programa avanzará automáticamente al siguiente ciclo.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {schedules.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedScheduleId(prev => prev === s.id ? null : s.id)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
                  selectedScheduleId === s.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-border bg-card hover:border-foreground/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <CalendarClock className={cn(
                    'h-4 w-4 flex-shrink-0',
                    selectedScheduleId === s.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                  )} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.hours_interval ? `Cada ${s.hours_interval}h` : ''}
                      {s.hours_interval && s.calendar_interval_days ? ' · ' : ''}
                      {s.calendar_interval_days ? `Cada ${s.calendar_interval_days} días` : ''}
                      {s.next_due_hours ? ` · Próximo: ${s.next_due_hours}h` : ''}
                    </p>
                  </div>
                </div>
                {selectedScheduleId === s.id && (
                  <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice input */}
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40 p-4 space-y-2">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Dictar por voz</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Presiona el micrófono y describe el mantenimiento realizado. Claude llenará el formulario automáticamente.
        </p>
        <VoiceInputButton onExtracted={handleVoiceExtracted} />
      </div>

      {/* Tipo */}
      <div className="space-y-1.5">
        <Label htmlFor="type">Tipo de mantenimiento</Label>
        <Select name="type" value={formValues.type} onValueChange={v => setFormValues(p => ({ ...p, type: v }))}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="preventive">Preventivo</SelectItem>
            <SelectItem value="corrective">Correctivo</SelectItem>
            <SelectItem value="inspection">Inspección</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción del trabajo realizado</Label>
        <Textarea
          id="description"
          name="description"
          value={formValues.description}
          onChange={set('description')}
          placeholder="Describe el mantenimiento realizado..."
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mecánico */}
        <div className="space-y-1.5">
          <Label htmlFor="performed_by_name">Mecánico responsable</Label>
          <Input
            id="performed_by_name"
            name="performed_by_name"
            value={formValues.performed_by_name}
            onChange={set('performed_by_name')}
            placeholder="Carlos Mendoza"
          />
        </div>

        {/* Horas trabajadas */}
        <div className="space-y-1.5">
          <Label htmlFor="hours_spent">Horas de trabajo</Label>
          <Input
            id="hours_spent"
            name="hours_spent"
            type="number"
            step="0.5"
            min="0"
            value={formValues.hours_spent}
            onChange={set('hours_spent')}
            placeholder="3.5"
          />
        </div>

        {/* Horas del equipo */}
        <div className="space-y-1.5">
          <Label htmlFor="asset_hours_at_service">
            Horas del equipo al momento del servicio
          </Label>
          <Input
            id="asset_hours_at_service"
            name="asset_hours_at_service"
            type="number"
            min="0"
            value={formValues.asset_hours_at_service}
            onChange={set('asset_hours_at_service')}
            placeholder="487"
          />
          <p className="text-xs text-muted-foreground">
            Actualiza las horas del equipo y calcula el próximo servicio
          </p>
        </div>

        {/* Costo */}
        <div className="space-y-1.5">
          <Label htmlFor="cost_estimate">Costo estimado (MXN)</Label>
          <Input
            id="cost_estimate"
            name="cost_estimate"
            type="number"
            min="0"
            value={formValues.cost_estimate}
            onChange={set('cost_estimate')}
            placeholder="2800"
          />
        </div>
      </div>

      {/* Partes */}
      <div className="space-y-1.5">
        <Label htmlFor="parts_used">Partes utilizadas</Label>
        <Input
          id="parts_used"
          name="parts_used"
          value={formValues.parts_used}
          onChange={set('parts_used')}
          placeholder="Filtro de aceite, correa distribución, aceite 15W-40 20L"
        />
        <p className="text-xs text-muted-foreground">Separadas por coma</p>
      </div>

      {/* Próximo servicio — solo si no hay programa seleccionado */}
      {!selectedScheduleId && (
        <div className="space-y-1.5">
          <Label htmlFor="next_service_date">Fecha próximo servicio</Label>
          <Input
            id="next_service_date"
            name="next_service_date"
            type="date"
            value={formValues.next_service_date}
            onChange={set('next_service_date')}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      )}

      {selectedScheduleId && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
          <CalendarClock className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Al guardar, el programa avanzará al siguiente ciclo automáticamente basándose en las horas del equipo y el intervalo configurado.
          </p>
        </div>
      )}

      {state.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={isPending}
      >
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
        ) : (
          'Guardar registro de mantenimiento'
        )}
      </Button>
    </form>
  )
}
