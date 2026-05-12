'use client'

import { useState, useTransition } from 'react'
import { differenceInDays, addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Milk, Settings, Loader2, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinerConfig } from '../types'

interface Props {
  assetId: string
  config: LinerConfig | null
}

function computeLinerStats(config: LinerConfig) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastChange = new Date(config.last_change_date)
  lastChange.setHours(0, 0, 0, 0)

  const daysSinceChange = Math.max(0, differenceInDays(today, lastChange))
  const milkingsPerDay = config.cows_count * config.milkings_per_day
  const completedMilkings = daysSinceChange * milkingsPerDay
  const remainingMilkings = Math.max(0, config.liner_life_milkings - completedMilkings)
  const remainingDays = milkingsPerDay > 0 ? Math.floor(remainingMilkings / milkingsPerDay) : 0
  const nextChangeDate = addDays(today, remainingDays)
  const pct = Math.min(100, (completedMilkings / config.liner_life_milkings) * 100)

  return { completedMilkings, remainingMilkings, remainingDays, nextChangeDate, pct }
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
      {pct >= 85 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white drop-shadow">{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  )
}

async function saveLinerConfig(assetId: string, data: Omit<LinerConfig, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  await fetch('/api/liner-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, asset_id: assetId }),
  })
}

export function LinerCounter({ assetId, config: initialConfig }: Props) {
  const [config, setConfig] = useState<LinerConfig | null>(initialConfig)
  const [editing, setEditing] = useState(!initialConfig)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    cows_count: initialConfig?.cows_count ?? 120,
    milkings_per_day: initialConfig?.milkings_per_day ?? 2,
    liner_life_milkings: initialConfig?.liner_life_milkings ?? 2500,
    last_change_date: initialConfig?.last_change_date ?? new Date().toISOString().split('T')[0],
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        asset_id: assetId,
        cows_count: Number(form.cows_count),
        milkings_per_day: Number(form.milkings_per_day),
        liner_life_milkings: Number(form.liner_life_milkings),
        last_change_date: form.last_change_date,
      }
      await saveLinerConfig(assetId, payload)
      setConfig({ ...payload, id: '', created_at: '', updated_at: '' } as LinerConfig)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const stats = config ? computeLinerStats(config) : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Milk className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-gray-800">Contador de Liners</CardTitle>
          </div>
          <button
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {saved ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Settings className="h-3.5 w-3.5" />}
            {saved ? 'Guardado' : 'Configurar'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Vacas en ordeña</label>
                <input
                  type="number"
                  min={1}
                  value={form.cows_count}
                  onChange={e => setForm(f => ({ ...f, cows_count: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Ordeñas / día</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={form.milkings_per_day}
                  onChange={e => setForm(f => ({ ...f, milkings_per_day: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Vida útil (ordeñas)</label>
                <input
                  type="number"
                  min={100}
                  value={form.liner_life_milkings}
                  onChange={e => setForm(f => ({ ...f, liner_life_milkings: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Último cambio</label>
                <input
                  type="date"
                  value={form.last_change_date}
                  onChange={e => setForm(f => ({ ...f, last_change_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar configuración
            </button>
          </form>
        ) : stats ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Vida útil de liners</span>
                <span className={`font-bold ${stats.pct >= 90 ? 'text-red-600' : stats.pct >= 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {Math.round(stats.pct)}%
                </span>
              </div>
              <ProgressBar pct={stats.pct} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Ordeñas completadas</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{Math.round(stats.completedMilkings).toLocaleString('es-MX')}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Ordeñas restantes</p>
                <p className={`text-lg font-bold mt-0.5 ${stats.remainingMilkings === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {Math.round(stats.remainingMilkings).toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className={`rounded-lg border px-4 py-3 ${stats.pct >= 100 ? 'bg-red-50 border-red-200' : stats.pct >= 85 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-medium ${stats.pct >= 100 ? 'text-red-700' : stats.pct >= 85 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {stats.pct >= 100
                  ? 'Cambio de liners REQUERIDO HOY'
                  : stats.pct >= 85
                    ? `Cambio en ~${stats.remainingDays} días`
                    : `Próximo cambio en ${stats.remainingDays} días`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Fecha estimada: {format(stats.nextChangeDate, "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            <div className="text-xs text-gray-400 border-t pt-3">
              Config: {config!.cows_count} vacas × {config!.milkings_per_day} ordeñas/día = {config!.cows_count * config!.milkings_per_day} ordeñas/día
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Configura el contador de liners para este activo.</p>
        )}
      </CardContent>
    </Card>
  )
}
