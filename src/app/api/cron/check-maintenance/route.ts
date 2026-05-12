import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'

// Vercel CRON: runs daily at 7am (configured in vercel.json)
// Can also be triggered manually: GET /api/cron/check-maintenance

interface ScheduleWithAsset {
  id: string
  title: string
  next_due_hours: number | null
  next_due_date: string | null
  hours_interval: number | null
  calendar_interval_days: number | null
  asset_id: string
  assets: {
    id: string
    name: string
    current_hours: number | null
    avg_hours_per_week: number | null
  } | null
}

export async function GET() {
  const supabase = createServiceClient()
  const today = new Date()

  const { data: schedules, error } = await supabase
    .from('maintenance_schedules')
    .select('id, title, next_due_hours, next_due_date, hours_interval, calendar_interval_days, asset_id, assets(id, name, current_hours, avg_hours_per_week)')
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Load all active WhatsApp configs for notifications
  const { data: whatsappConfigs } = await supabase
    .from('whatsapp_config')
    .select('manager_phone')
    .eq('is_active', true)

  const managerPhones = (whatsappConfigs ?? []).map(c => c.manager_phone)

  const alertsCreated: string[] = []
  const scheduleUpdates: string[] = []
  const whatsappSent: string[] = []

  for (const s of (schedules ?? []) as unknown as ScheduleWithAsset[]) {
    const asset = s.assets
    if (!asset) continue

    const currentHours = asset.current_hours ?? 0
    const avgHoursPerWeek = asset.avg_hours_per_week ?? null

    // ── Adaptive schedule: recalculate next_due_date based on actual usage ──
    if (s.next_due_hours && avgHoursPerWeek && avgHoursPerWeek > 0) {
      const hoursLeft = s.next_due_hours - currentHours
      if (hoursLeft > 0) {
        const daysLeft = Math.round((hoursLeft / avgHoursPerWeek) * 7)
        const predictedDate = new Date(today.getTime() + daysLeft * 24 * 60 * 60 * 1000)
        await supabase
          .from('maintenance_schedules')
          .update({ next_due_date: predictedDate.toISOString().split('T')[0] })
          .eq('id', s.id)
        scheduleUpdates.push(`${asset.name}: ${s.title} → ${predictedDate.toLocaleDateString('es-MX')}`)
      }
    }

    // ── Hours-based alert ──────────────────────────────────────────────────
    if (s.next_due_hours !== null) {
      const hoursLeft = s.next_due_hours - currentHours
      const alertType = hoursLeft <= 0 ? 'overdue_maintenance' : hoursLeft <= 20 ? 'critical' : null

      if (alertType) {
        const { count } = await supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('asset_id', asset.id)
          .ilike('message', `%${s.title}%`)
          .eq('is_read', false)

        if (!count || count === 0) {
          const message = hoursLeft <= 0
            ? `${s.title} VENCIDO en ${asset.name} (programado ${s.next_due_hours}h / ahora ${currentHours}h)`
            : `${s.title} próximo en ${asset.name} — faltan ${hoursLeft}h`

          await supabase.from('alerts').insert({
            asset_id: asset.id,
            type: alertType,
            message,
          })
          alertsCreated.push(message)

          if (hoursLeft <= 0) {
            const waMsg = `🔴 NORTIQ — Alerta Mantenimiento\n━━━━━━━━━━━━━━━━━━\n${asset.name}\n${s.title} — VENCIDO\n\nVer detalles en la aplicación.`
            for (const phone of managerPhones) {
              const sent = await sendWhatsAppMessage(phone, waMsg)
              if (sent) whatsappSent.push(`${phone}: ${message}`)
            }
          }
        }
      }
    }

    // ── Calendar-based alert ───────────────────────────────────────────────
    if (s.next_due_date) {
      const dueDate = new Date(s.next_due_date)
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const alertType = daysUntil < 0 ? 'overdue_maintenance' : daysUntil <= 7 ? 'critical' : null

      if (alertType) {
        const { count } = await supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('asset_id', asset.id)
          .ilike('message', `%${s.title}%`)
          .eq('is_read', false)

        if (!count || count === 0) {
          const message = daysUntil < 0
            ? `${s.title} VENCIDO en ${asset.name} (venció el ${dueDate.toLocaleDateString('es-MX')})`
            : `${s.title} próximo en ${asset.name} — en ${daysUntil} días (${dueDate.toLocaleDateString('es-MX')})`

          await supabase.from('alerts').insert({
            asset_id: asset.id,
            type: alertType,
            message,
          })
          alertsCreated.push(message)

          if (daysUntil < 0) {
            const waMsg = `🔴 NORTIQ — Alerta Mantenimiento\n━━━━━━━━━━━━━━━━━━\n${asset.name}\n${s.title} — VENCIDO ${Math.abs(daysUntil)} días\n\nVer detalles en la aplicación.`
            for (const phone of managerPhones) {
              const sent = await sendWhatsAppMessage(phone, waMsg)
              if (sent) whatsappSent.push(`${phone}: ${message}`)
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    schedulesChecked: (schedules ?? []).length,
    alertsCreated: alertsCreated.length,
    scheduleUpdates: scheduleUpdates.length,
    whatsappSent: whatsappSent.length,
    details: { alertsCreated, scheduleUpdates, whatsappSent },
  })
}
