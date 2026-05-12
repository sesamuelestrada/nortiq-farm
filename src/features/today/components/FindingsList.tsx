'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, CheckCircle, Clock, ExternalLink, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export interface FindingItem {
  id: string
  asset_id: string
  asset_name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  follow_up_date: string | null
  created_at: string
}

const severityConfig = {
  critical: {
    label: 'Crítico',
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40',
    icon: ShieldAlert,
    iconBg: 'bg-red-50 dark:bg-red-950/40',
    iconColor: 'text-red-600 dark:text-red-400',
    row: 'border-l-4 border-l-red-500',
  },
  high: {
    label: 'Alta',
    badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/40',
    icon: AlertTriangle,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    row: 'border-l-4 border-l-orange-400',
  },
  medium: {
    label: 'Media',
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
    icon: AlertTriangle,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    row: 'border-l-4 border-l-amber-400',
  },
  low: {
    label: 'Baja',
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
    icon: Clock,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    row: 'border-l-4 border-l-blue-400',
  },
}

interface Props {
  initialFindings: FindingItem[]
}

export function FindingsList({ initialFindings }: Props) {
  const [findings, setFindings] = useState<FindingItem[]>(initialFindings)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function resolve(id: string) {
    setLoadingId(id)
    const supabase = createClient()
    await supabase
      .from('maintenance_findings')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
    setFindings(prev => prev.filter(f => f.id !== id))
    setLoadingId(null)
  }

  async function snooze(id: string) {
    setLoadingId(id)
    const supabase = createClient()
    const snoozeDate = new Date()
    snoozeDate.setDate(snoozeDate.getDate() + 7)
    await supabase
      .from('maintenance_findings')
      .update({ status: 'snoozed', follow_up_date: snoozeDate.toISOString().split('T')[0] })
      .eq('id', id)
    setFindings(prev => prev.filter(f => f.id !== id))
    setLoadingId(null)
  }

  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
        Sin hallazgos abiertos — todo en orden
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {findings.map(f => {
        const cfg = severityConfig[f.severity]
        const Icon = cfg.icon
        const isLoading = loadingId === f.id
        return (
          <div
            key={f.id}
            className={`flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-4 ${cfg.row} transition-opacity ${isLoading ? 'opacity-50' : ''}`}
          >
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} mt-0.5`}>
              <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground flex-1 leading-snug">{f.description}</p>
                <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/assets/${f.asset_id}`}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {f.asset_name}
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: es })}
                </span>
                {f.follow_up_date && (
                  <span className="text-xs text-muted-foreground">
                    Seguimiento: {new Date(f.follow_up_date).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => resolve(f.id)}
                disabled={isLoading}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Resolver
              </button>
              <button
                onClick={() => snooze(f.id)}
                disabled={isLoading}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                +7 días
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
