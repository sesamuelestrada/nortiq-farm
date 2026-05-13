'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { differenceInDays, addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Milk, Settings, Loader2, CheckCircle, XCircle, History, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinerConfig } from '../types'

interface LinerChangeLog {
  id: string
  created_at: string | null
  cost_estimate: number | null
  performed_by_name: string | null
}

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
  const res = await fetch('/api/liner-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, asset_id: assetId }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Error al guardar')
  }
}

async function registerLinerChange(assetId: string, costEstimate: number | null, performedBy: string): Promise<void> {
  const res = await fetch('/api/liner-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_id: assetId,
      cost_estimate: costEstimate,
      performed_by_name: performedBy || null,
    }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Error al registrar cambio')
  }
}

async function fetchLinerHistory(assetId: string): Promise<LinerChangeLog[]> {
  const res = await fetch(`/api/liner-change?asset_id=${assetId}`)
  if (!res.ok) return []
  const json = await res.json() as { history?: LinerChangeLog[] }
  return json.history ?? []
}

export function LinerCounter({ assetId, config: initialConfig }: Props) {
  const [config, setConfig] = useState<LinerConfig | null>(initialConfig)
  const [editing, setEditing] = useState(!initialConfig)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Registro de cambio
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [changeCost, setChangeCost] = useState('')
  const [changeBy, setChangeBy] = useState('')
  const [changeError, setChangeError] = useState<string | null>(null)
  const [changeSaved, setChangeSaved] = useState(false)

  // Historial
  const [history, setHistory] = useState<LinerChangeLog[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const loadHistory = useCallback(async () => {
    const data = await fetchLinerHistory(assetId)
    setHistory(data)
  }, [assetId])

  useEffect(() => {
    if (config) loadHistory()
  }, [config, loadHistory])

  const [form, setForm] = useState({
    cows_count: initialConfig?.cows_count ?? 120,
    milkings_per_day: initialConfig?.milkings_per_day ?? 2,
    liner_life_milkings: initialConfig?.liner_life_milkings ?? 2500,
    last_change_date: initialConfig?.last_change_date ?? new Date().toISOString().split('T')[0],
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    startTransition(async () => {
      const payload = {
        asset_id: assetId,
        cows_count: Number(form.cows_count),
        milkings_per_day: Number(form.milkings_per_day),
        liner_life_milkings: Number(form.liner_life_milkings),
        last_change_date: form.last_change_date,
      }
      try {
        await saveLinerConfig(assetId, payload)
        setConfig({ ...payload, id: '', created_at: '', updated_at: '' } as LinerConfig)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  function handleRegisterChange(e: React.FormEvent) {
    e.preventDefault()
    setChangeError(null)
    startTransition(async () => {
      try {
        const cost = changeCost !== '' ? Number(changeCost) : null
        await registerLinerChange(assetId, cost, changeBy)
        const today = new Date().toISOString().split('T')[0]
        setConfig(prev => prev ? { ...prev, last_change_date: today } : prev)
        setShowChangeForm(false)
        setChangeCost('')
        setChangeBy('')
        setChangeSaved(true)
        setTimeout(() => setChangeSaved(false), 3000)
        await loadHistory()
      } catch (err) {
        setChangeError(err instanceof Error ? err.message : 'Error al registrar')
      }
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
          <div className="flex items-center gap-1.5">
            {config && (
              <button
                onClick={() => { setShowHistory(h => !h); setShowChangeForm(false) }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <History className="h-3.5 w-3.5" />
                Historial
              </button>
            )}
            <button
              onClick={() => { setEditing(e => !e); setShowChangeForm(false); setShowHistory(false) }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {changeSaved ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : saved ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Settings className="h-3.5 w-3.5" />}
              {changeSaved ? 'Cambio registrado' : saved ? 'Guardado' : 'Configurar'}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Historial de cambios */}
        {showHistory && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Últimos cambios</p>
            {history.length === 0 ? (
              <p className="text-xs text-gray-400">Sin historial registrado</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {h.created_at ? format(new Date(h.created_at), "d 'de' MMM yyyy", { locale: es }) : '—'}
                    {h.performed_by_name ? ` · ${h.performed_by_name}` : ''}
                  </span>
                  {h.cost_estimate != null && (
                    <span className="font-medium text-gray-700">
                      ${h.cost_estimate.toLocaleString('es-MX')}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Form registrar cambio */}
        {showChangeForm && (
          <form onSubmit={handleRegisterChange} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-emerald-700">Registrar cambio de liners</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Costo (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={changeCost}
                  onChange={e => setChangeCost(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Realizado por</label>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={changeBy}
                  onChange={e => setChangeBy(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            {changeError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{changeError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar cambio
              </button>
              <button
                type="button"
                onClick={() => { setShowChangeForm(false); setChangeError(null) }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Form de configuración */}
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
            {saveError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}
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

            {/* Botón registrar cambio — prominente cuando está urgente */}
            {!showChangeForm && (
              <button
                onClick={() => { setShowChangeForm(true); setShowHistory(false); setEditing(false) }}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  stats.pct >= 90
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : stats.pct >= 75
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Milk className="h-3.5 w-3.5" />
                {stats.pct >= 90 ? '¡Registrar cambio de liners ahora!' : 'Registrar cambio de liners'}
              </button>
            )}

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
