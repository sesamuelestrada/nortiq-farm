'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { MaintenanceSchedule } from '@/features/assets/types'

const scheduleSchema = z.object({
  asset_id: z.string().uuid(),
  title: z.string().min(1, 'El nombre es requerido'),
  subsystem: z.enum(['engine', 'transmission', 'hydraulics', 'filters', 'tires', 'electrical', 'general']),
  hours_interval: z.coerce.number().positive().optional(),
  calendar_interval_days: z.coerce.number().int().positive().optional(),
  next_due_hours: z.coerce.number().positive().optional(),
  next_due_date: z.string().optional(),
  notes: z.string().optional(),
})

export type ScheduleFormState = { error?: string; success?: boolean }

export async function createSchedule(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const parsed = scheduleSchema.safeParse({
    asset_id: formData.get('asset_id'),
    title: formData.get('title'),
    subsystem: formData.get('subsystem'),
    hours_interval: formData.get('hours_interval') || undefined,
    calendar_interval_days: formData.get('calendar_interval_days') || undefined,
    next_due_hours: formData.get('next_due_hours') || undefined,
    next_due_date: formData.get('next_due_date') || undefined,
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const data = parsed.data

  // Si no se especificó next_due_hours pero sí hours_interval,
  // lo calculamos automáticamente: current_hours + hours_interval
  let nextDueHours = data.next_due_hours
  if (!nextDueHours && data.hours_interval) {
    const supabase = await createClient()
    const { data: asset } = await supabase
      .from('assets')
      .select('current_hours, avg_hours_per_week')
      .eq('id', data.asset_id)
      .single()

    if (asset?.current_hours != null) {
      nextDueHours = asset.current_hours + data.hours_interval

      // Si no se especificó next_due_date pero tenemos avg_hours_per_week,
      // estimamos la fecha automáticamente
      if (!data.next_due_date && nextDueHours != null && asset.avg_hours_per_week && asset.avg_hours_per_week > 0) {
        const hoursLeft = nextDueHours - asset.current_hours
        const daysLeft = Math.round((hoursLeft / asset.avg_hours_per_week) * 7)
        const estimated = new Date()
        estimated.setDate(estimated.getDate() + daysLeft)
        data.next_due_date = estimated.toISOString().split('T')[0]
      }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('maintenance_schedules').insert({
    asset_id: data.asset_id,
    title: data.title,
    subsystem: data.subsystem,
    hours_interval: data.hours_interval ?? null,
    calendar_interval_days: data.calendar_interval_days ?? null,
    next_due_hours: nextDueHours ?? null,
    next_due_date: data.next_due_date ?? null,
    notes: data.notes ?? null,
    status: 'active',
  })

  if (error) return { error: error.message }

  revalidatePath(`/assets/${data.asset_id}`)
  revalidatePath('/programas')
  return { success: true }
}

export async function getSchedulesByAsset(assetId: string): Promise<MaintenanceSchedule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select('*')
    .eq('asset_id', assetId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as MaintenanceSchedule[]
}
