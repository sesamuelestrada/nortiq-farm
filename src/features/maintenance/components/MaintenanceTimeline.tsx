import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Wrench, ShieldCheck, Search, Clock, DollarSign } from 'lucide-react'
import type { MaintenanceLog, MaintenanceType } from '../types'

const typeConfig: Record<MaintenanceType, { label: string; icon: React.ElementType; pill: string; dot: string }> = {
  preventive: {
    label: 'Preventivo', icon: ShieldCheck,
    pill: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    dot:  'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
  },
  corrective: {
    label: 'Correctivo', icon: Wrench,
    pill: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40',
    dot:  'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40',
  },
  inspection: {
    label: 'Inspección', icon: Search,
    pill: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40',
    dot:  'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40',
  },
}

interface Props { logs: MaintenanceLog[] }

export function MaintenanceTimeline({ logs }: Props) {
  if (logs.length === 0) return (
    <div className="rounded-xl border border-dashed border-border py-10 text-center">
      <Wrench className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">Sin registros de mantenimiento aún</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {logs.map((log, idx) => {
        const config = typeConfig[log.type]
        const Icon = config.icon
        return (
          <div key={log.id} className="relative flex gap-4">
            {idx < logs.length - 1 && (
              <div className="absolute left-4 top-9 bottom-0 w-px bg-border" />
            )}
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.dot}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.pill}`}>{config.label}</span>
                  {log.asset?.name && <span className="text-xs text-muted-foreground">{log.asset.name}</span>}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), "d MMM yyyy", { locale: es })}
                </time>
              </div>
              <p className="text-sm text-foreground mb-3 leading-relaxed">{log.description}</p>
              {log.parts_used && log.parts_used.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Partes utilizadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {log.parts_used.map((part, i) => (
                      <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{part}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                {log.performed_by_name && (
                  <span>Por: <span className="text-foreground font-medium">{log.performed_by_name}</span></span>
                )}
                {log.hours_spent != null && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{log.hours_spent} hrs</span>
                )}
                {log.cost_estimate != null && log.cost_estimate > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {log.cost_estimate.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
