'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import type { Asset, MaintenanceFinding } from '../types'

interface MaintenanceLog {
  id: string
  created_at: string | null
  type: string
  description: string
  performed_by_name: string | null
  cost_estimate: number | null
}

interface Props {
  asset: Asset
  logs: MaintenanceLog[]
  findings: MaintenanceFinding[]
}

function safeStr(text: string | null | undefined): string {
  return String(text ?? '').replace(/[^\x20-\x7E\xC0-\xFF]/g, '?')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-MX') } catch { return '—' }
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

async function buildAndDownload(asset: Asset, logs: MaintenanceLog[], findings: MaintenanceFinding[]) {
  // Import jsPDF dynamically so it only loads in browser
  const jspdfModule = await import('jspdf')
  const JsPDF = jspdfModule.jsPDF ?? jspdfModule.default

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const M = 18
  let y = M

  const checkPage = (needed = 10) => {
    if (y + needed > 275) { doc.addPage(); y = M }
  }

  const section = (title: string) => {
    checkPage(14)
    y += 4
    doc.setFillColor(16, 185, 129)
    doc.rect(M, y, PW - M * 2, 7, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(255, 255, 255)
    doc.text(safeStr(title), M + 3, y + 5)
    doc.setTextColor(0, 0, 0)
    y += 11
  }

  const kv = (label: string, value: string) => {
    checkPage(7)
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(110, 110, 110)
    doc.text(safeStr(label), M, y)
    doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30)
    doc.text(safeStr(value || '—'), M + 52, y)
    y += 6
  }

  // ─── HEADER ───────────────────────────────────────────────
  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, PW, 26, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(255, 255, 255)
  doc.text('NORTIQ', M, 12)
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text('Sistema de Inteligencia de Mantenimiento', M, 20)
  doc.text(fmtDate(new Date().toISOString()), PW - M, 20, { align: 'right' })
  y = 34

  // ─── DATOS DEL EQUIPO ─────────────────────────────────────
  section('DATOS DEL EQUIPO')
  kv('Nombre:', asset.name)
  kv('Tipo:', asset.type)
  kv('Marca / Modelo:', `${asset.brand ?? ''} ${asset.model ?? ''}`.trim())
  kv('Año:', asset.year?.toString() ?? '')
  kv('N° de serie:', asset.serial_number ?? '')
  kv('Ubicacion:', asset.location ?? '')
  kv('Estado:', asset.status)
  if (asset.current_hours != null) kv('Horas actuales:', `${asset.current_hours.toLocaleString('es-MX')} hrs`)
  kv('Registrado:', fmtDate(asset.created_at))

  // ─── RESUMEN FINANCIERO ───────────────────────────────────
  const totalCost = logs.reduce((s, l) => s + (l.cost_estimate ?? 0), 0)
  const cph = asset.current_hours && asset.current_hours > 0 ? totalCost / asset.current_hours : null

  section('RESUMEN FINANCIERO')
  kv('Costo total acumulado:', fmtMoney(totalCost))
  kv('Costo por hora:', cph != null ? fmtMoney(cph) + '/hr' : '')
  kv('Total de registros:', String(logs.length))
  kv('Primer registro:', fmtDate(logs[logs.length - 1]?.created_at))

  // ─── HISTORIAL DE MANTENIMIENTOS ─────────────────────────
  section('HISTORIAL DE MANTENIMIENTOS')

  if (logs.length === 0) {
    doc.setFontSize(9).setTextColor(150, 150, 150)
    doc.text('Sin registros de mantenimiento.', M, y)
    y += 8
  } else {
    for (const log of logs) {
      checkPage(18)
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(30, 30, 30)
      doc.text(`${fmtDate(log.created_at)} — ${safeStr(log.type)}`, M, y)
      y += 5
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(70, 70, 70)
      const descLines = doc.splitTextToSize(safeStr(log.description), PW - M * 2 - 6)
      doc.text(descLines, M + 3, y)
      y += descLines.length * 4.2
      doc.setTextColor(130, 130, 130)
      doc.text(`Responsable: ${safeStr(log.performed_by_name)}   Costo: ${fmtMoney(log.cost_estimate)}`, M + 3, y)
      y += 5
      doc.setDrawColor(225, 225, 225).line(M, y - 1, PW - M, y - 1)
      y += 2
    }
  }

  // ─── HALLAZGOS ────────────────────────────────────────────
  const open = findings.filter(f => f.status === 'open')
  const resolved = findings.filter(f => f.status === 'resolved')

  if (open.length > 0) {
    section(`HALLAZGOS ABIERTOS (${open.length})`)
    for (const f of open) {
      checkPage(10)
      const sevColor: Record<string, [number, number, number]> = {
        critical: [220, 38, 38], high: [234, 88, 12], medium: [202, 138, 4], low: [37, 99, 235],
      }
      const [r, g, b] = sevColor[f.severity] ?? [100, 100, 100]
      doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(r, g, b)
      doc.text(`[${(f.severity ?? 'medium').toUpperCase()}]`, M, y)
      doc.setFont('helvetica', 'normal').setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(safeStr(f.description), PW - M * 2 - 28)
      doc.text(lines, M + 26, y)
      y += Math.max(lines.length * 4.5, 6) + 2
    }
  }

  if (resolved.length > 0) {
    section(`HALLAZGOS RESUELTOS (${resolved.length})`)
    for (const f of resolved) {
      checkPage(8)
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(100, 100, 100)
      const lines = doc.splitTextToSize(`${fmtDate(f.resolved_at)} — ${safeStr(f.description)}`, PW - M * 2)
      doc.text(lines, M, y)
      y += lines.length * 4.5 + 2
    }
  }

  // ─── FOOTER ───────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(180, 180, 180)
    doc.text('Generado por Nortiq — Sistema de Inteligencia de Mantenimiento', M, 292)
    doc.text(`Pagina ${i} de ${pages}`, PW - M, 292, { align: 'right' })
  }

  const safeName = asset.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `expediente-${safeName}-${dateStr}.pdf`

  // Use blob + object URL for reliable cross-browser download
  const blob = doc.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ExportPdfButton({ asset, logs, findings }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      await buildAndDownload(asset, logs, findings)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Error al generar el PDF. Revisa la consola para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted/50 disabled:opacity-60 transition-colors cursor-pointer"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {loading ? 'Generando...' : 'Exportar expediente'}
    </button>
  )
}
