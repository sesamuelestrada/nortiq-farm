import { createServiceClient } from '@/lib/supabase/service'
import {
  getFailureStats,
  getMaintenanceTypeStats,
  getCostByAsset,
  getMaintenanceTrend,
  getAssetsNeedingService,
} from '@/features/analytics/services/analytics'
import type { AgentResult } from '@/features/agent/types'

// Tool definitions for Claude tool_use (Anthropic SDK format)
// Each tool maps to a Supabase operation or analytics query

export const TOOL_DEFINITIONS = [
  {
    name: 'query_assets',
    description: 'Consulta la lista de activos (tractores, camiones, implementos, herramientas) del rancho. Puede filtrar por estatus o tipo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['operational', 'maintenance', 'out_of_service'],
          description: 'Filtrar por estatus del activo',
        },
        type: {
          type: 'string',
          enum: ['tractor', 'truck', 'implement', 'tool'],
          description: 'Filtrar por tipo de activo',
        },
        name_contains: {
          type: 'string',
          description: 'Buscar activos cuyo nombre contenga este texto',
        },
      },
    },
  },
  {
    name: 'query_maintenance',
    description: 'Consulta el historial de mantenimientos. Puede filtrar por activo o tipo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: {
          type: 'string',
          description: 'Nombre del activo para filtrar (búsqueda parcial)',
        },
        type: {
          type: 'string',
          enum: ['preventive', 'corrective', 'inspection'],
          description: 'Tipo de mantenimiento',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de registros a devolver (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_analytics',
    description: 'Obtiene estadísticas y análisis: tipos de mantenimiento, costos por activo, tendencia mensual, activos que necesitan servicio próximo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['maintenance_types', 'cost_by_asset', 'monthly_trend', 'needs_service'],
          description: 'maintenance_types=distribución de tipos, cost_by_asset=costos por equipo, monthly_trend=tendencia mensual, needs_service=activos con servicio próximo',
        },
      },
      required: ['analysis_type'],
    },
  },
  {
    name: 'create_asset',
    description: 'Da de alta un nuevo activo (tractor, camión, implemento o herramienta) en el sistema.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Nombre completo del activo, ej: "Tractor JD 6155M — Potrero Norte"' },
        type: { type: 'string', enum: ['tractor', 'truck', 'implement', 'tool'] },
        brand: { type: 'string', description: 'Marca del equipo' },
        model: { type: 'string', description: 'Modelo del equipo' },
        year: { type: 'number', description: 'Año del equipo' },
        location: { type: 'string', description: 'Ubicación en el rancho' },
        serial_number: { type: 'string', description: 'Número de serie' },
        notes: { type: 'string', description: 'Notas adicionales' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'create_maintenance_log',
    description: 'Registra un nuevo mantenimiento realizado en un activo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo (búsqueda parcial)' },
        type: { type: 'string', enum: ['preventive', 'corrective', 'inspection'] },
        description: { type: 'string', description: 'Descripción del trabajo realizado' },
        performed_by_name: { type: 'string', description: 'Nombre del mecánico o responsable' },
        parts_used: { type: 'array', items: { type: 'string' }, description: 'Lista de partes o refacciones usadas' },
        hours_spent: { type: 'number', description: 'Horas de trabajo invertidas' },
        cost_estimate: { type: 'number', description: 'Costo estimado en pesos MXN' },
        next_service_date: { type: 'string', description: 'Fecha del próximo servicio en formato YYYY-MM-DD' },
      },
      required: ['asset_name', 'type', 'description'],
    },
  },
  {
    name: 'update_asset_status',
    description: 'Cambia el estatus operativo de un activo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo' },
        new_status: { type: 'string', enum: ['operational', 'maintenance', 'out_of_service'] },
      },
      required: ['asset_name', 'new_status'],
    },
  },
  {
    name: 'navigate_to',
    description: 'Navega a una sección específica de la aplicación.',
    input_schema: {
      type: 'object' as const,
      properties: {
        route: {
          type: 'string',
          enum: ['/dashboard', '/assets', '/assets/new', '/maintenance'],
          description: 'Ruta de la aplicación',
        },
      },
      required: ['route'],
    },
  },
  {
    name: 'update_asset_hours',
    description: 'Actualiza las horas actuales de un activo y el promedio de uso semanal. Úsalo cuando el usuario reporte cuántas horas tiene un equipo o cuánto trabaja por semana. Recalcula automáticamente las próximas fechas de servicio.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo' },
        current_hours: { type: 'number', description: 'Horas totales actuales del activo' },
        avg_hours_per_week: { type: 'number', description: 'Promedio de horas de trabajo por semana (opcional)' },
      },
      required: ['asset_name', 'current_hours'],
    },
  },
  {
    name: 'schedule_maintenance',
    description: 'Programa un mantenimiento futuro para un subsistema específico de un activo. Usa esto cuando el usuario quiera planear servicios preventivos o cuando el manual indica intervalos de mantenimiento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo' },
        subsystem: {
          type: 'string',
          enum: ['engine', 'transmission', 'hydraulics', 'filters', 'tires', 'electrical', 'general'],
          description: 'Subsistema: engine=motor, transmission=transmisión, hydraulics=hidráulicos, filters=filtros, tires=llantas, electrical=eléctrico, general=general',
        },
        title: { type: 'string', description: 'Nombre del mantenimiento, ej: "Cambio aceite motor"' },
        hours_interval: { type: 'number', description: 'Intervalo en horas (ej: 500 para cada 500h)' },
        calendar_interval_days: { type: 'number', description: 'Intervalo en días (ej: 90 para cada 3 meses)' },
        next_due_hours: { type: 'number', description: 'Horas absolutas del activo en que toca el próximo servicio' },
        next_due_date: { type: 'string', description: 'Fecha del próximo servicio en formato YYYY-MM-DD' },
        notes: { type: 'string', description: 'Notas adicionales del programa' },
      },
      required: ['asset_name', 'subsystem', 'title'],
    },
  },
  {
    name: 'record_finding',
    description: 'Registra un hallazgo o problema encontrado durante una inspección o mantenimiento. Los hallazgos persisten entre sesiones hasta que se resuelven. Úsalo siempre que el mecánico encuentre algo fuera de lo normal o cuando algo quede pendiente por falta de refacciones.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo' },
        description: { type: 'string', description: 'Descripción del hallazgo o pendiente' },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Severidad: low=baja, medium=media, high=alta, critical=crítica (requiere atención inmediata)',
        },
        follow_up_date: { type: 'string', description: 'Fecha de seguimiento en formato YYYY-MM-DD (opcional)' },
        notes: { type: 'string', description: 'Notas adicionales' },
      },
      required: ['asset_name', 'description', 'severity'],
    },
  },
  {
    name: 'resolve_finding',
    description: 'Marca un hallazgo como resuelto o lo pospone (snooze). Úsalo cuando el usuario confirme que un problema pendiente ya fue atendido, o cuando quiera posponer la revisión.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo' },
        description_contains: { type: 'string', description: 'Texto parcial para identificar el hallazgo (busca en la descripción)' },
        action: {
          type: 'string',
          enum: ['resolve', 'snooze'],
          description: 'resolve=marcar como resuelto, snooze=posponer',
        },
        snooze_days: { type: 'number', description: 'Días a posponer (solo si action=snooze)' },
      },
      required: ['asset_name', 'description_contains', 'action'],
    },
  },
  {
    name: 'get_open_items',
    description: 'Lista todos los hallazgos abiertos y mantenimientos programados próximos de un activo o de todo el rancho. Úsalo cuando el usuario pregunta qué está pendiente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre del activo (opcional, si se omite muestra todo el rancho)' },
      },
    },
  },
  {
    name: 'query_liner_status',
    description: 'Consulta el estado actual de los liners de la sala de ordeña: % de vida útil usada, días desde el último cambio, días restantes estimados. Úsalo cuando el usuario pregunte por los liners, la sala de ordeña, o cuándo toca cambiar los liners.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: {
          type: 'string',
          description: 'Nombre del activo (opcional). Si se omite, muestra todos los sistemas de ordeña.',
        },
      },
    },
  },
  {
    name: 'register_liner_change',
    description: 'Registra un cambio de liners en la sala de ordeña. Actualiza la fecha de último cambio y crea un log de mantenimiento con el costo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo de ordeña' },
        cost: { type: 'number', description: 'Costo del cambio de liners en pesos MXN' },
        performed_by_name: { type: 'string', description: 'Nombre del técnico o mecánico que realizó el cambio' },
        notes: { type: 'string', description: 'Notas adicionales del cambio' },
      },
      required: ['asset_name'],
    },
  },
  {
    name: 'log_partial_maintenance',
    description: 'Registra un mantenimiento donde se completaron algunos trabajos pero otros quedaron pendientes (por falta de refacciones, tiempo, etc.). Automáticamente crea hallazgos para los items diferidos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: { type: 'string', description: 'Nombre o parte del nombre del activo' },
        type: { type: 'string', enum: ['preventive', 'corrective', 'inspection'] },
        completed_items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de trabajos que SÍ se completaron',
        },
        deferred_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Qué quedó pendiente' },
              reason: { type: 'string', description: 'Por qué quedó pendiente' },
            },
            required: ['description'],
          },
          description: 'Lista de trabajos que quedaron pendientes',
        },
        performed_by_name: { type: 'string', description: 'Nombre del técnico responsable' },
        hours_spent: { type: 'number', description: 'Horas de trabajo invertidas' },
        cost_estimate: { type: 'number', description: 'Costo estimado en pesos MXN' },
      },
      required: ['asset_name', 'type', 'completed_items', 'deferred_items'],
    },
  },
]

type QueryLinerStatusInput = { asset_name?: string }
type RegisterLinerChangeInput = { asset_name: string; cost?: number; performed_by_name?: string; notes?: string }
type QueryAssetsInput = { status?: string; type?: string; name_contains?: string }
type QueryMaintenanceInput = { asset_name?: string; type?: string; limit?: number }
type GetAnalyticsInput = { analysis_type: 'maintenance_types' | 'cost_by_asset' | 'monthly_trend' | 'needs_service' }
type CreateAssetInput = { name: string; type: string; brand?: string; model?: string; year?: number; location?: string; serial_number?: string; notes?: string }
type CreateMaintenanceInput = { asset_name: string; type: string; description: string; performed_by_name?: string; parts_used?: string[]; hours_spent?: number; cost_estimate?: number; next_service_date?: string }
type UpdateStatusInput = { asset_name: string; new_status: string }
type NavigateInput = { route: string }
type UpdateAssetHoursInput = { asset_name: string; current_hours: number; avg_hours_per_week?: number }
type ScheduleMaintenanceInput = { asset_name: string; subsystem: string; title: string; hours_interval?: number; calendar_interval_days?: number; next_due_hours?: number; next_due_date?: string; notes?: string }
type RecordFindingInput = { asset_name: string; description: string; severity: string; follow_up_date?: string; notes?: string }
type ResolveFindingInput = { asset_name: string; description_contains: string; action: 'resolve' | 'snooze'; snooze_days?: number }
type GetOpenItemsInput = { asset_name?: string }
type LogPartialMaintenanceInput = { asset_name: string; type: string; completed_items: string[]; deferred_items: { description: string; reason?: string }[]; performed_by_name?: string; hours_spent?: number; cost_estimate?: number }

export type ToolInput = QueryAssetsInput | QueryMaintenanceInput | GetAnalyticsInput | CreateAssetInput | CreateMaintenanceInput | UpdateStatusInput | NavigateInput | UpdateAssetHoursInput | ScheduleMaintenanceInput | RecordFindingInput | ResolveFindingInput | GetOpenItemsInput | LogPartialMaintenanceInput | QueryLinerStatusInput | RegisterLinerChangeInput

export async function executeTool(toolName: string, input: ToolInput): Promise<AgentResult[]> {
  const supabase = createServiceClient()

  if (toolName === 'query_assets') {
    const { status, type, name_contains } = input as QueryAssetsInput
    let query = supabase.from('assets').select('id, name, type, status, brand, location').order('name')
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)
    if (name_contains) query = query.ilike('name', `%${name_contains}%`)

    const { data } = await query
    if (!data?.length) return [{ type: 'text', content: 'No se encontraron activos con esos criterios.' }]

    return data.map(a => ({
      type: 'asset_card' as const,
      id: a.id,
      name: a.name,
      status: a.status as 'operational' | 'maintenance' | 'out_of_service',
      type_label: a.type,
      brand: a.brand,
      location: a.location,
    }))
  }

  if (toolName === 'query_maintenance') {
    const { asset_name, type, limit = 10 } = input as QueryMaintenanceInput

    // Resolve asset IDs first so the DB filter is applied before LIMIT
    let assetIds: string[] | null = null
    if (asset_name) {
      const { data: matchedAssets } = await supabase
        .from('assets')
        .select('id')
        .ilike('name', `%${asset_name}%`)
      if (!matchedAssets?.length) {
        return [{ type: 'text', content: `No se encontraron registros para "${asset_name}".` }]
      }
      assetIds = matchedAssets.map(a => a.id)
    }

    let query = supabase
      .from('maintenance_logs')
      .select('id, type, description, performed_by_name, created_at, cost_estimate, parts_used, assets(name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('type', type)
    if (assetIds) query = query.in('asset_id', assetIds)

    const { data } = await query
    if (!data?.length) return [{ type: 'text', content: 'No se encontraron registros de mantenimiento.' }]

    const rows = data

    const typeLabels: Record<string, string> = { preventive: 'Preventivo', corrective: 'Correctivo', inspection: 'Inspección' }

    return [{
      type: 'table',
      title: 'Historial de mantenimiento',
      columns: ['Activo', 'Tipo', 'Descripción', 'Responsable', 'Fecha'],
      rows: rows.map(r => [
        (r.assets as unknown as { name: string } | null)?.name ?? '—',
        typeLabels[r.type] ?? r.type,
        r.description,
        r.performed_by_name ?? '—',
        new Date(r.created_at).toLocaleDateString('es-MX'),
      ]),
    }]
  }

  if (toolName === 'get_analytics') {
    const { analysis_type } = input as GetAnalyticsInput

    if (analysis_type === 'maintenance_types') {
      const data = await getMaintenanceTypeStats()
      const colors = ['#16a34a', '#ca8a04', '#dc2626']
      return [{
        type: 'chart',
        chartType: 'pie',
        title: 'Distribución de tipos de mantenimiento',
        data: data.map((d, i) => ({ ...d, color: colors[i % colors.length] })),
      }]
    }

    if (analysis_type === 'cost_by_asset') {
      const data = await getCostByAsset()
      return [{
        type: 'chart',
        chartType: 'bar',
        title: 'Costo de mantenimiento por activo (MXN)',
        data: data.map(d => ({ name: d.asset_name.split('—')[0].trim(), value: d.total_cost })),
        unit: 'MXN',
      }]
    }

    if (analysis_type === 'monthly_trend') {
      const data = await getMaintenanceTrend(6)
      return [{
        type: 'chart',
        chartType: 'bar',
        title: 'Mantenimientos por mes (últimos 6 meses)',
        data: data.map(d => ({ name: d.month, value: d.count })),
      }]
    }

    if (analysis_type === 'needs_service') {
      const data = await getAssetsNeedingService(30)
      if (!data.length) return [{ type: 'text', content: 'Ningún activo requiere servicio en los próximos 30 días.' }]

      return [{
        type: 'table',
        title: 'Activos con servicio próximo (30 días)',
        columns: ['Activo', 'Fecha servicio', 'Días restantes', 'Estatus'],
        rows: data.map(d => [
          d.name,
          new Date(d.next_service_date).toLocaleDateString('es-MX'),
          d.days_until <= 0 ? 'VENCIDO' : `${d.days_until} días`,
          d.status,
        ]),
      }]
    }

    return [{ type: 'text', content: 'Tipo de análisis no reconocido.' }]
  }

  if (toolName === 'create_asset') {
    const inp = input as CreateAssetInput
    const { data, error } = await supabase
      .from('assets')
      .insert({ name: inp.name, type: inp.type, brand: inp.brand, model: inp.model, year: inp.year, location: inp.location, serial_number: inp.serial_number, notes: inp.notes, status: 'operational' })
      .select('id, name')
      .single()

    if (error || !data) return [{ type: 'text', content: `Error al crear el activo: ${error?.message ?? 'error desconocido'}` }]

    return [
      { type: 'asset_created', id: data.id, name: data.name },
      { type: 'qr_code', asset_id: data.id, asset_name: data.name },
    ]
  }

  if (toolName === 'create_maintenance_log') {
    const inp = input as CreateMaintenanceInput
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name')
      .ilike('name', `%${inp.asset_name}%`)
      .limit(1)

    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${inp.asset_name}".` }]

    const asset = assets[0]
    const { error } = await supabase.from('maintenance_logs').insert({
      asset_id: asset.id,
      type: inp.type,
      description: inp.description,
      performed_by_name: inp.performed_by_name,
      parts_used: inp.parts_used ?? [],
      hours_spent: inp.hours_spent,
      cost_estimate: inp.cost_estimate,
      next_service_date: inp.next_service_date,
      status: 'completed',
    })

    if (error) return [{ type: 'text', content: `Error al registrar mantenimiento: ${error.message}` }]

    const typeLabels: Record<string, string> = { preventive: 'Preventivo', corrective: 'Correctivo', inspection: 'Inspección' }
    return [{ type: 'log_created', asset_name: asset.name, log_type: typeLabels[inp.type] ?? inp.type, description: inp.description }]
  }

  if (toolName === 'update_asset_status') {
    const { asset_name, new_status } = input as UpdateStatusInput
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name')
      .ilike('name', `%${asset_name}%`)
      .limit(1)

    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${asset_name}".` }]

    const asset = assets[0]
    const { error } = await supabase.from('assets').update({ status: new_status }).eq('id', asset.id)

    if (error) return [{ type: 'text', content: `Error al actualizar estatus: ${error.message}` }]

    return [{ type: 'status_updated', asset_name: asset.name, new_status: new_status as 'operational' | 'maintenance' | 'out_of_service' }]
  }

  if (toolName === 'navigate_to') {
    const { route } = input as NavigateInput
    const labels: Record<string, string> = {
      '/dashboard': 'Panel Principal',
      '/assets': 'Activos',
      '/assets/new': 'Agregar activo',
      '/maintenance': 'Mantenimiento',
    }
    return [{ type: 'navigate', route, label: labels[route] ?? route }]
  }

  if (toolName === 'update_asset_hours') {
    const { asset_name, current_hours, avg_hours_per_week } = input as UpdateAssetHoursInput

    const { data: assets } = await supabase.from('assets').select('id, name, avg_hours_per_week').ilike('name', `%${asset_name}%`).limit(1)
    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${asset_name}".` }]

    const asset = assets[0]
    const newAvg = avg_hours_per_week ?? asset.avg_hours_per_week

    await supabase.from('assets').update({
      current_hours,
      ...(newAvg !== null ? { avg_hours_per_week: newAvg } : {}),
    }).eq('id', asset.id)

    // Recalculate next_due_hours on active schedules that use hours_interval
    const { data: schedules } = await supabase
      .from('maintenance_schedules')
      .select('id, hours_interval, next_due_hours')
      .eq('asset_id', asset.id)
      .eq('status', 'active')
      .not('hours_interval', 'is', null)

    if (schedules?.length) {
      for (const s of schedules) {
        if (s.hours_interval && s.next_due_hours && current_hours > s.next_due_hours) {
          // Already past — advance to next cycle
          const newNextDue = current_hours + s.hours_interval
          await supabase.from('maintenance_schedules').update({ next_due_hours: newNextDue }).eq('id', s.id)
        }
      }

      // Recalculate next_due_date if we have avg_hours_per_week
      if (newAvg && newAvg > 0) {
        const freshSchedules = await supabase
          .from('maintenance_schedules')
          .select('id, next_due_hours')
          .eq('asset_id', asset.id)
          .eq('status', 'active')
          .not('next_due_hours', 'is', null)
        for (const s of freshSchedules.data ?? []) {
          if (s.next_due_hours) {
            const hoursLeft = s.next_due_hours - current_hours
            if (hoursLeft > 0) {
              const daysLeft = Math.round((hoursLeft / newAvg) * 7)
              const nextDate = new Date()
              nextDate.setDate(nextDate.getDate() + daysLeft)
              await supabase.from('maintenance_schedules').update({
                next_due_date: nextDate.toISOString().split('T')[0],
              }).eq('id', s.id)
            }
          }
        }
      }
    }

    const hoursStr = newAvg
      ? (() => {
          const hoursLeft = (schedules ?? [])
            .filter(s => s.next_due_hours && s.next_due_hours > current_hours)
            .map(s => ({ left: (s.next_due_hours ?? 0) - current_hours, interval: s.hours_interval }))
          if (hoursLeft.length === 0) return ''
          const min = hoursLeft.reduce((a, b) => a.left < b.left ? a : b)
          const weeks = (min.left / newAvg).toFixed(1)
          return ` El próximo servicio es en aproximadamente ${min.left}h (~${weeks} semanas al ritmo actual).`
        })()
      : ''

    return [{ type: 'text', content: `Horas actualizadas: ${asset.name} ahora tiene ${current_hours}h.${hoursStr}` }]
  }

  if (toolName === 'schedule_maintenance') {
    const inp = input as ScheduleMaintenanceInput

    const { data: assets } = await supabase.from('assets').select('id, name').ilike('name', `%${inp.asset_name}%`).limit(1)
    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${inp.asset_name}".` }]

    const asset = assets[0]
    const { data, error } = await supabase.from('maintenance_schedules').insert({
      asset_id: asset.id,
      subsystem: inp.subsystem,
      title: inp.title,
      hours_interval: inp.hours_interval,
      calendar_interval_days: inp.calendar_interval_days,
      next_due_hours: inp.next_due_hours,
      next_due_date: inp.next_due_date,
      notes: inp.notes,
    }).select('id').single()

    if (error || !data) return [{ type: 'text', content: `Error al programar mantenimiento: ${error?.message ?? 'error desconocido'}` }]

    return [{
      type: 'schedule_created',
      asset_name: asset.name,
      subsystem: inp.subsystem,
      title: inp.title,
      next_due_date: inp.next_due_date,
      next_due_hours: inp.next_due_hours,
    }]
  }

  if (toolName === 'record_finding') {
    const inp = input as RecordFindingInput

    const { data: assets } = await supabase.from('assets').select('id, name').ilike('name', `%${inp.asset_name}%`).limit(1)
    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${inp.asset_name}".` }]

    const asset = assets[0]
    const { error } = await supabase.from('maintenance_findings').insert({
      asset_id: asset.id,
      description: inp.description,
      severity: inp.severity,
      follow_up_date: inp.follow_up_date,
      notes: inp.notes,
    })

    if (error) return [{ type: 'text', content: `Error al registrar hallazgo: ${error.message}` }]

    return [{
      type: 'finding_created',
      asset_name: asset.name,
      description: inp.description,
      severity: inp.severity as 'low' | 'medium' | 'high' | 'critical',
      follow_up_date: inp.follow_up_date,
    }]
  }

  if (toolName === 'resolve_finding') {
    const { asset_name, description_contains, action, snooze_days } = input as ResolveFindingInput

    const { data: assets } = await supabase.from('assets').select('id, name').ilike('name', `%${asset_name}%`).limit(1)
    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${asset_name}".` }]

    const asset = assets[0]
    const { data: findings } = await supabase
      .from('maintenance_findings')
      .select('id')
      .eq('asset_id', asset.id)
      .eq('status', 'open')
      .ilike('description', `%${description_contains}%`)
      .limit(1)

    if (!findings?.length) return [{ type: 'text', content: `No se encontró ningún hallazgo abierto con "${description_contains}" en ${asset.name}.` }]

    const finding = findings[0]
    if (action === 'resolve') {
      await supabase.from('maintenance_findings').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', finding.id)
      return [{ type: 'text', content: `Hallazgo resuelto y cerrado en ${asset.name}.` }]
    } else {
      const snoozeDate = new Date()
      snoozeDate.setDate(snoozeDate.getDate() + (snooze_days ?? 7))
      await supabase.from('maintenance_findings').update({
        status: 'snoozed',
        follow_up_date: snoozeDate.toISOString().split('T')[0],
      }).eq('id', finding.id)
      return [{ type: 'text', content: `Hallazgo pospuesto hasta ${snoozeDate.toLocaleDateString('es-MX')} en ${asset.name}.` }]
    }
  }

  if (toolName === 'get_open_items') {
    const { asset_name } = input as GetOpenItemsInput
    const supabase2 = supabase

    let findingsQuery = supabase2
      .from('maintenance_findings')
      .select('description, severity, follow_up_date, created_at, assets(name)')
      .eq('status', 'open')
      .order('severity', { ascending: false })
      .limit(20)

    let schedulesQuery = supabase2
      .from('maintenance_schedules')
      .select('title, subsystem, next_due_date, next_due_hours, assets(name, current_hours)')
      .eq('status', 'active')
      .order('next_due_date', { ascending: true })
      .limit(20)

    if (asset_name) {
      // Filter by asset name via join — we need asset ids first
      const { data: matchedAssets } = await supabase.from('assets').select('id').ilike('name', `%${asset_name}%`)
      const ids = (matchedAssets ?? []).map(a => a.id)
      if (ids.length === 0) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${asset_name}".` }]
      findingsQuery = findingsQuery.in('asset_id', ids) as typeof findingsQuery
      schedulesQuery = schedulesQuery.in('asset_id', ids) as typeof schedulesQuery
    }

    const [{ data: findings }, { data: schedules }] = await Promise.all([findingsQuery, schedulesQuery])

    const rows: (string | number | null)[][] = []
    const severityLabels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'CRÍTICA' }
    const subsystemLabels: Record<string, string> = {
      engine: 'Motor', transmission: 'Transmisión', hydraulics: 'Hidráulicos',
      filters: 'Filtros', tires: 'Llantas', electrical: 'Eléctrico', general: 'General',
    }

    for (const f of findings ?? []) {
      const asset = (f.assets as unknown as { name: string } | null)?.name ?? '—'
      const followUp = f.follow_up_date ? new Date(f.follow_up_date).toLocaleDateString('es-MX') : '—'
      rows.push([asset, `Hallazgo — ${severityLabels[f.severity] ?? f.severity}`, f.description, followUp])
    }

    for (const s of schedules ?? []) {
      const asset = (s.assets as unknown as { name: string; current_hours: number | null } | null)
      const assetName = asset?.name ?? '—'
      const dueDate = s.next_due_date ? new Date(s.next_due_date).toLocaleDateString('es-MX') : '—'
      const dueHours = s.next_due_hours ? `${s.next_due_hours}h` : '—'
      rows.push([assetName, `${subsystemLabels[s.subsystem] ?? s.subsystem} — ${s.title}`, dueHours, dueDate])
    }

    if (rows.length === 0) return [{ type: 'text', content: 'No hay hallazgos ni mantenimientos programados pendientes.' }]

    return [{
      type: 'table',
      title: 'Pendientes del rancho',
      columns: ['Activo', 'Tipo', 'Detalle / Horas', 'Fecha revisión'],
      rows,
    }]
  }

  if (toolName === 'log_partial_maintenance') {
    const inp = input as LogPartialMaintenanceInput

    const { data: assets } = await supabase.from('assets').select('id, name').ilike('name', `%${inp.asset_name}%`).limit(1)
    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${inp.asset_name}".` }]

    const asset = assets[0]
    const completedDescription = `Completado: ${inp.completed_items.join(', ')}.`

    const { data: logData, error: logError } = await supabase.from('maintenance_logs').insert({
      asset_id: asset.id,
      type: inp.type,
      description: completedDescription,
      performed_by_name: inp.performed_by_name,
      hours_spent: inp.hours_spent,
      cost_estimate: inp.cost_estimate,
      status: inp.deferred_items.length > 0 ? 'in_progress' : 'completed',
    }).select('id').single()

    if (logError || !logData) return [{ type: 'text', content: `Error al registrar mantenimiento: ${logError?.message ?? 'error desconocido'}` }]

    // Create findings for deferred items
    const findingResults: AgentResult[] = []
    for (const item of inp.deferred_items) {
      const reason = item.reason ? ` (${item.reason})` : ''
      const { error: findingError } = await supabase.from('maintenance_findings').insert({
        asset_id: asset.id,
        discovered_in_log_id: logData.id,
        description: `${item.description}${reason}`,
        severity: 'medium',
      })
      if (!findingError) {
        findingResults.push({
          type: 'finding_created',
          asset_name: asset.name,
          description: `${item.description}${reason}`,
          severity: 'medium',
        })
      }
    }

    const typeLabels: Record<string, string> = { preventive: 'Preventivo', corrective: 'Correctivo', inspection: 'Inspección' }
    return [
      { type: 'log_created', asset_name: asset.name, log_type: typeLabels[inp.type] ?? inp.type, description: completedDescription },
      ...findingResults,
    ]
  }

  if (toolName === 'query_liner_status') {
    const { asset_name } = input as QueryLinerStatusInput

    let query = supabase
      .from('liner_configs')
      .select('asset_id, cows_count, milkings_per_day, liner_life_milkings, last_change_date, assets(name)')

    if (asset_name) {
      const { data: matchedAssets } = await supabase.from('assets').select('id').ilike('name', `%${asset_name}%`)
      const ids = (matchedAssets ?? []).map(a => a.id)
      if (ids.length === 0) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${asset_name}".` }]
      query = query.in('asset_id', ids)
    }

    const { data } = await query
    if (!data?.length) return [{ type: 'text', content: 'No hay configuración de liners registrada.' }]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const rows = data.map(cfg => {
      const assetName = (cfg.assets as unknown as { name: string } | null)?.name ?? 'Sistema de ordeña'
      const lastChange = new Date(cfg.last_change_date + 'T00:00:00')
      const daysSince = Math.max(0, Math.floor((today.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24)))
      const milkingsPerDay = cfg.cows_count * cfg.milkings_per_day
      const completed = daysSince * milkingsPerDay
      const pct = Math.min(100, Math.round((completed / cfg.liner_life_milkings) * 100))
      const remaining = Math.max(0, cfg.liner_life_milkings - completed)
      const daysLeft = milkingsPerDay > 0 ? Math.round(remaining / milkingsPerDay) : 0
      const lastChangeLabel = lastChange.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      const urgency = pct >= 90 ? '⚠️ CAMBIO URGENTE' : pct >= 75 ? 'Próximo a vencer' : 'OK'
      return [assetName, `${pct}%`, urgency, lastChangeLabel, daysLeft > 0 ? `${daysLeft} días` : 'VENCIDO']
    })

    return [{
      type: 'table',
      title: 'Estado de liners — Sala de ordeña',
      columns: ['Activo', 'Vida útil usada', 'Estado', 'Último cambio', 'Días restantes'],
      rows,
    }]
  }

  if (toolName === 'register_liner_change') {
    const inp = input as RegisterLinerChangeInput

    const { data: assets } = await supabase.from('assets').select('id, name').ilike('name', `%${inp.asset_name}%`).limit(1)
    if (!assets?.length) return [{ type: 'text', content: `No se encontró ningún activo con el nombre "${inp.asset_name}".` }]

    const asset = assets[0]
    const today = new Date().toISOString().split('T')[0]

    const { error: updateError } = await supabase
      .from('liner_configs')
      .update({ last_change_date: today })
      .eq('asset_id', asset.id)

    if (updateError) return [{ type: 'text', content: `Error al actualizar la fecha de cambio de liners: ${updateError.message}` }]

    // Dismiss existing liner alerts for this asset
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('asset_id', asset.id)
      .ilike('message', '%liner%')
      .eq('is_read', false)

    const description = `Cambio de liners${inp.notes ? ` — ${inp.notes}` : ''}`
    const { error: logError } = await supabase.from('maintenance_logs').insert({
      asset_id: asset.id,
      type: 'preventive',
      description,
      performed_by_name: inp.performed_by_name,
      cost_estimate: inp.cost,
      parts_used: ['liners'],
      status: 'completed',
    })

    if (logError) return [{ type: 'text', content: `Cambio registrado pero hubo error al crear el log: ${logError.message}` }]

    return [{ type: 'log_created', asset_name: asset.name, log_type: 'Preventivo', description }]
  }

  return [{ type: 'text', content: `Herramienta desconocida: ${toolName}` }]
}
