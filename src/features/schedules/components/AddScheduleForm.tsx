'use client'

import { useActionState, useState } from 'react'
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
import { createSchedule, type ScheduleFormState } from '../services/schedules'
import { Plus, X, CheckCircle2, Loader2, CalendarClock, Info } from 'lucide-react'
import type { Asset } from '@/features/assets/types'

const SUBSYSTEMS = [
  { value: 'engine',       label: 'Motor' },
  { value: 'transmission', label: 'Transmisión' },
  { value: 'hydraulics',   label: 'Hidráulicos' },
  { value: 'filters',      label: 'Filtros' },
  { value: 'tires',        label: 'Llantas' },
  { value: 'electrical',   label: 'Eléctrico' },
  { value: 'general',      label: 'General' },
]

interface Props {
  asset: Asset
}

const initial: ScheduleFormState = {}

export function AddScheduleForm({ asset }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState(createSchedule, initial)
  const [subsystem, setSubsystem] = useState('engine')
  const [hoursInterval, setHoursInterval] = useState('')

  // Calcular next_due_hours estimado para mostrar hint
  const estimatedNextHours =
    hoursInterval && asset.current_hours != null
      ? asset.current_hours + Number(hoursInterval)
      : null

  if (state.success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          Programa creado y visible en la sección Programas.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors w-full"
      >
        <Plus className="h-4 w-4" />
        Agregar programa de mantenimiento
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Nuevo programa de mantenimiento</h3>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="asset_id" value={asset.id} />

        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="s-title">¿Qué mantenimiento es?</Label>
          <Input
            id="s-title"
            name="title"
            placeholder="ej. Cambio de aceite motor"
            required
          />
        </div>

        {/* Subsistema */}
        <div className="space-y-1.5">
          <Label htmlFor="s-subsystem">Sistema del equipo</Label>
          <Select name="subsystem" value={subsystem} onValueChange={setSubsystem}>
            <SelectTrigger id="s-subsystem">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSYSTEMS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Intervalo horas */}
          <div className="space-y-1.5">
            <Label htmlFor="s-hours-interval">Cada cuántas horas</Label>
            <Input
              id="s-hours-interval"
              name="hours_interval"
              type="number"
              min="1"
              placeholder="ej. 250"
              value={hoursInterval}
              onChange={e => setHoursInterval(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Dejar vacío si no aplica</p>
          </div>

          {/* Intervalo días */}
          <div className="space-y-1.5">
            <Label htmlFor="s-days-interval">Cada cuántos días</Label>
            <Input
              id="s-days-interval"
              name="calendar_interval_days"
              type="number"
              min="1"
              placeholder="ej. 90"
            />
            <p className="text-xs text-muted-foreground">Dejar vacío si no aplica</p>
          </div>
        </div>

        {/* Hint automático */}
        {estimatedNextHours !== null && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40 px-3 py-2.5">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              El próximo servicio se programará a las <strong>{estimatedNextHours.toLocaleString('es-MX')} horas</strong>
              {asset.avg_hours_per_week
                ? ` — en ~${Math.round((Number(hoursInterval) / asset.avg_hours_per_week) * 7)} días al ritmo actual`
                : ' (agrega el promedio de horas/semana al activo para estimar la fecha)'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Próximo por horas (override manual) */}
          <div className="space-y-1.5">
            <Label htmlFor="s-next-hours">
              Próximo servicio en horas
              <span className="text-muted-foreground font-normal ml-1 text-[11px]">(opcional)</span>
            </Label>
            <Input
              id="s-next-hours"
              name="next_due_hours"
              type="number"
              min="1"
              placeholder={estimatedNextHours ? String(estimatedNextHours) : 'ej. 750'}
            />
            <p className="text-xs text-muted-foreground">
              {estimatedNextHours
                ? `Se calcula automáticamente (${estimatedNextHours}h), solo cambiar si difiere`
                : 'Horas absolutas del horómetro al próximo servicio'}
            </p>
          </div>

          {/* Próximo por fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="s-next-date">
              Fecha del próximo servicio
              <span className="text-muted-foreground font-normal ml-1 text-[11px]">(opcional)</span>
            </Label>
            <Input
              id="s-next-date"
              name="next_due_date"
              type="date"
            />
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label htmlFor="s-notes">
            Notas
            <span className="text-muted-foreground font-normal ml-1 text-[11px]">(opcional)</span>
          </Label>
          <Textarea
            id="s-notes"
            name="notes"
            placeholder="ej. Usar aceite 15W-40, revisar filtro de aire también"
            rows={2}
          />
        </div>

        {state.error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isPending}
          >
            {isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
              : <><CalendarClock className="mr-2 h-4 w-4" />Crear programa</>
            }
          </Button>
        </div>
      </form>
    </div>
  )
}
