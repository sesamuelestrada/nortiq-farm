'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { MaintenanceLog, CreateMaintenanceLogInput } from '../types'

export async function getMaintenanceLogs(assetId?: string): Promise<MaintenanceLog[]> {
  const supabase = await createClient()
  let query = supabase
    .from('maintenance_logs')
    .select(`*, asset:assets(name, type)`)
    .order('created_at', { ascending: false })

  if (assetId) {
    query = query.eq('asset_id', assetId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as MaintenanceLog[]
}

export async function getRecentLogs(limit = 5): Promise<MaintenanceLog[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select(`*, asset:assets(name, type)`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as MaintenanceLog[]
}

const logSchema = z.object({
  asset_id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(),
  performed_by_name: z.string().optional(),
  type: z.enum(['preventive', 'corrective', 'inspection']),
  description: z.string().min(1, 'La descripción es requerida'),
  parts_used: z.string().optional(),
  hours_spent: z.coerce.number().min(0).optional(),
  asset_hours_at_service: z.coerce.number().min(0).optional(),
  next_service_date: z.string().optional(),
  cost_estimate: z.coerce.number().min(0).optional(),
  voice_transcript: z.string().optional(),
})

export type LogFormState = { error?: string; success?: boolean; id?: string }

export async function createMaintenanceLog(
  _prev: LogFormState,
  formData: FormData
): Promise<LogFormState> {
  const parsed = logSchema.safeParse({
    asset_id: formData.get('asset_id'),
    schedule_id: formData.get('schedule_id') || undefined,
    performed_by_name: formData.get('performed_by_name') || undefined,
    type: formData.get('type'),
    description: formData.get('description'),
    parts_used: formData.get('parts_used') || undefined,
    hours_spent: formData.get('hours_spent') || undefined,
    asset_hours_at_service: formData.get('asset_hours_at_service') || undefined,
    next_service_date: formData.get('next_service_date') || undefined,
    cost_estimate: formData.get('cost_estimate') || undefined,
    voice_transcript: formData.get('voice_transcript') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { parts_used, schedule_id, ...rest } = parsed.data
  const input: CreateMaintenanceLogInput = {
    ...rest,
    parts_used: parts_used
      ? parts_used.split(',').map(p => p.trim()).filter(Boolean)
      : [],
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert(input)
    .select('id')
    .single()

  if (error) return { error: error.message }

  // ── Cerrar el ciclo: avanzar el programa al siguiente vencimiento ──────────
  if (schedule_id) {
    const { data: schedule } = await supabase
      .from('maintenance_schedules')
      .select('hours_interval, calendar_interval_days, avg_hours_per_week')
      .eq('id', schedule_id)
      .single()

    if (schedule) {
      const serviceHours = input.asset_hours_at_service ?? null
      const now = new Date()

      const updates: Record<string, unknown> = {
        last_performed_at: now.toISOString(),
      }

      // Calcular próximas horas
      if (schedule.hours_interval && serviceHours != null) {
        updates.next_due_hours = serviceHours + schedule.hours_interval
      }

      // Calcular próxima fecha
      if (schedule.calendar_interval_days) {
        const next = new Date(now)
        next.setDate(next.getDate() + schedule.calendar_interval_days)
        updates.next_due_date = next.toISOString().split('T')[0]
      } else if (updates.next_due_hours && serviceHours != null) {
        // Estimar fecha por horas si no hay intervalo de calendario
        const { data: asset } = await supabase
          .from('assets')
          .select('avg_hours_per_week')
          .eq('id', input.asset_id)
          .single()

        if (asset?.avg_hours_per_week && asset.avg_hours_per_week > 0) {
          const hoursLeft = (updates.next_due_hours as number) - serviceHours
          const daysLeft = Math.round((hoursLeft / asset.avg_hours_per_week) * 7)
          const estimatedDate = new Date(now)
          estimatedDate.setDate(estimatedDate.getDate() + daysLeft)
          updates.next_due_date = estimatedDate.toISOString().split('T')[0]
        }
      }

      await supabase
        .from('maintenance_schedules')
        .update(updates)
        .eq('id', schedule_id)

      // Cerrar alertas abiertas relacionadas con este activo y programa
      await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('asset_id', input.asset_id)
        .eq('is_read', false)
    }
  }

  // Actualizar horas del activo si se registraron — solo si son mayores (horómetro no retrocede)
  if (input.asset_hours_at_service != null) {
    const { data: currentAsset } = await supabase
      .from('assets')
      .select('current_hours')
      .eq('id', input.asset_id)
      .single()

    if (
      currentAsset &&
      (currentAsset.current_hours == null ||
        input.asset_hours_at_service > currentAsset.current_hours)
    ) {
      await supabase
        .from('assets')
        .update({
          current_hours: input.asset_hours_at_service,
          hours_updated_at: new Date().toISOString(),
        })
        .eq('id', input.asset_id)
    }
  }

  revalidatePath(`/assets/${input.asset_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/programas')
  revalidatePath('/alerts')

  return { success: true, id: data.id }
}
