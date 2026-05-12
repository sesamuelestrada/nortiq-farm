'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import {
  CheckCircle2, Wrench, XCircle, Tractor, Truck, Hammer,
  QrCode, ChevronRight, ArrowRight, Sparkles, Mic,
  AlertTriangle, CalendarClock,
} from 'lucide-react'
import type {
  AgentResult, TextResult, NavigateResult, ChartResult,
  TableResult, AssetCardResult, QRCodeResult, LogCreatedResult,
  AssetCreatedResult, StatusUpdatedResult, FindingCreatedResult, ScheduleCreatedResult,
} from '../types'

interface Props {
  transcript: string
  text: string
  results: AgentResult[]
  onClose?: () => void
}

const STATUS_CONFIG = {
  operational: { label: 'Operativo', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  maintenance: { label: 'En mantenimiento', icon: Wrench, color: 'text-yellow-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  out_of_service: { label: 'Fuera de servicio', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  tractor: Tractor, truck: Truck, implement: Wrench, tool: Hammer,
}

const CHART_COLORS = ['#16a34a', '#d97706', '#dc2626', '#2563eb', '#7c3aed', '#0891b2']

// ─── Chat bubbles ─────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2 justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gray-800 px-4 py-2.5">
        <p className="text-sm text-white leading-relaxed">{text}</p>
      </div>
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
        <Mic className="h-3.5 w-3.5 text-gray-600" />
      </div>
    </div>
  )
}

function AIBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-600">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-gray-100 shadow-sm px-4 py-2.5">
        <p className="text-sm text-gray-800 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

// ─── Result renderers ─────────────────────────────────────────────────────────

function ResultText({ result }: { result: TextResult }) {
  return <AIBubble text={result.content} />
}

function ResultNavigate({ result }: { result: NavigateResult }) {
  const router = useRouter()
  useEffect(() => {
    const t = setTimeout(() => router.push(result.route), 700)
    return () => clearTimeout(t)
  }, [result.route, router])

  return (
    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
      <ArrowRight className="h-4 w-4 flex-shrink-0" />
      <span>Navegando a <span className="font-semibold">{result.label}</span>…</span>
    </div>
  )
}

function ResultChart({ result }: { result: ChartResult }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">{result.title}</p>
      <ResponsiveContainer width="100%" height={200}>
        {result.chartType === 'bar' ? (
          <BarChart data={result.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,.08)' }}
              formatter={(v) => [result.unit && typeof v === 'number' ? `$${v.toLocaleString('es-MX')} ${result.unit}` : v, 'Total']}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {result.data.map((entry, i) => (
                <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={result.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={35}
              paddingAngle={3}
              label={({ name, percent }) => `${name ?? ''} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {result.data.map((entry, i) => (
                <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function ResultTable({ result }: { result: TableResult }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-800">{result.title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              {result.columns.map((col, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {result.rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                {row.map((cell, j) => {
                  const isVencido = typeof cell === 'string' && cell === 'VENCIDO'
                  const isPoco = typeof cell === 'string' && /^[1-7] días$/.test(cell)
                  return (
                    <td key={j} className={`px-4 py-2.5 text-gray-700 whitespace-nowrap ${isVencido ? 'font-bold text-red-600' : isPoco ? 'font-semibold text-amber-600' : ''}`}>
                      {cell ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultAssetCard({ result, onClose }: { result: AssetCardResult; onClose?: () => void }) {
  const cfg = STATUS_CONFIG[result.status]
  const StatusIcon = cfg.icon
  const TypeIcon = TYPE_ICONS[result.type_label] ?? Wrench

  return (
    <Link
      href={`/assets/${result.id}`}
      onClick={onClose}
      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-3.5 active:opacity-70 transition-all hover:shadow-md hover:border-gray-200"
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.border} border`}>
        <TypeIcon className={`h-5 w-5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{result.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusIcon className={`h-3 w-3 ${cfg.color}`} />
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          {result.location && <span className="text-xs text-gray-400">· {result.location}</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </Link>
  )
}

function ResultQRCode({ result }: { result: QRCodeResult }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
      <img
        src={`/api/qr/${result.asset_id}`}
        alt={`QR ${result.asset_name}`}
        className="h-20 w-20 rounded-xl border border-gray-100 flex-shrink-0"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">{result.asset_name}</p>
        <p className="text-xs text-gray-500">Código QR generado</p>
        <a
          href={`/api/qr/${result.asset_id}`}
          download={`qr-${result.asset_id}.png`}
          className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-semibold mt-1"
        >
          <QrCode className="h-3.5 w-3.5" /> Descargar QR
        </a>
      </div>
    </div>
  )
}

function ResultLogCreated({ result }: { result: LogCreatedResult }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-600">
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>
      <div className="space-y-1.5 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Mantenimiento registrado</p>
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">{result.log_type} · {result.asset_name}</p>
        <p className="text-xs text-gray-600 leading-relaxed">{result.description}</p>
      </div>
    </div>
  )
}

function ResultAssetCreated({ result, onClose }: { result: AssetCreatedResult; onClose?: () => void }) {
  return (
    <Link
      href={`/assets/${result.id}`}
      onClick={onClose}
      className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 p-3.5 active:opacity-70 transition-all hover:shadow-md"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-600">
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Activo creado</p>
        <p className="text-xs text-green-700 font-medium">{result.name}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0" />
    </Link>
  )
}

function ResultStatusUpdated({ result }: { result: StatusUpdatedResult }) {
  const cfg = STATUS_CONFIG[result.new_status]
  const StatusIcon = cfg.icon
  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${cfg.border} ${cfg.bg} p-3.5`}>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white border ${cfg.border}`}>
        <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{result.asset_name}</p>
        <p className={`text-xs font-medium ${cfg.color}`}>Estatus actualizado → {cfg.label}</p>
      </div>
    </div>
  )
}

const FINDING_CONFIG = {
  low:      { label: 'Baja',    bg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-600',  icon: 'text-gray-400' },
  medium:   { label: 'Media',   bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  high:     { label: 'Alta',    bg: 'bg-orange-50', border: 'border-orange-200',text: 'text-orange-700',icon: 'text-orange-500' },
  critical: { label: 'CRÍTICA', bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',   icon: 'text-red-500' },
}

const SUBSYSTEM_LABELS: Record<string, string> = {
  engine: 'Motor', transmission: 'Transmisión', hydraulics: 'Hidráulicos',
  filters: 'Filtros', tires: 'Llantas', electrical: 'Eléctrico', general: 'General',
}

function ResultFindingCreated({ result }: { result: FindingCreatedResult }) {
  const cfg = FINDING_CONFIG[result.severity]
  return (
    <div className={`flex items-start gap-3 rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border ${cfg.border}`}>
        <AlertTriangle className={`h-5 w-5 ${cfg.icon}`} />
      </div>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">Hallazgo registrado</p>
          <span className={`text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {cfg.label}
          </span>
        </div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{result.asset_name}</p>
        <p className="text-xs text-gray-700 leading-relaxed">{result.description}</p>
        {result.follow_up_date && (
          <p className="text-xs text-gray-500">
            Revisión: {new Date(result.follow_up_date).toLocaleDateString('es-MX')}
          </p>
        )}
      </div>
    </div>
  )
}

function ResultScheduleCreated({ result }: { result: ScheduleCreatedResult }) {
  const subsystemLabel = SUBSYSTEM_LABELS[result.subsystem] ?? result.subsystem
  const dueStr = result.next_due_date
    ? `Próximo: ${new Date(result.next_due_date).toLocaleDateString('es-MX')}`
    : result.next_due_hours
    ? `Próximo: a las ${result.next_due_hours}h`
    : null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-blue-200">
        <CalendarClock className="h-5 w-5 text-blue-500" />
      </div>
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Mantenimiento programado</p>
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{subsystemLabel} · {result.asset_name}</p>
        <p className="text-xs text-gray-700">{result.title}</p>
        {dueStr && <p className="text-xs text-blue-600 font-medium">{dueStr}</p>}
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AgentResponsePanel({ transcript, text, results, onClose }: Props) {
  const assetCards = results.filter(r => r.type === 'asset_card')
  const otherResults = results.filter(r => r.type !== 'asset_card')

  return (
    <div className="space-y-4">
      {/* User's voice transcript */}
      {transcript && <UserBubble text={transcript} />}

      {/* AI text response */}
      {text && <AIBubble text={text} />}

      {/* Structured results */}
      {otherResults.map((result, i) => {
        switch (result.type) {
          case 'text': return <ResultText key={i} result={result} />
          case 'navigate': return <ResultNavigate key={i} result={result} />
          case 'chart': return <ResultChart key={i} result={result} />
          case 'table': return <ResultTable key={i} result={result} />
          case 'qr_code': return <ResultQRCode key={i} result={result} />
          case 'log_created': return <ResultLogCreated key={i} result={result} />
          case 'asset_created': return <ResultAssetCreated key={i} result={result as AssetCreatedResult} onClose={onClose} />
          case 'status_updated': return <ResultStatusUpdated key={i} result={result as StatusUpdatedResult} />
          case 'finding_created': return <ResultFindingCreated key={i} result={result as FindingCreatedResult} />
          case 'schedule_created': return <ResultScheduleCreated key={i} result={result as ScheduleCreatedResult} />
          default: return null
        }
      })}

      {/* Asset cards grouped — with hint when multiple */}
      {assetCards.length > 0 && (
        <div className="space-y-2">
          {assetCards.length > 1 && (
            <p className="text-xs text-gray-400 px-1">
              Toca un equipo para ver su detalle
            </p>
          )}
          {assetCards.map((result, i) => (
            <ResultAssetCard key={i} result={result as AssetCardResult} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}
