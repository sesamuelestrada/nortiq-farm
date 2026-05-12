'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DataPoint {
  month: string
  costo: number
  isProjection?: boolean
}

interface Props {
  data: DataPoint[]
  avgCost: number
}

export function MonthlyCostChart({ data, avgCost }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Gasto mensual de mantenimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(value: unknown) => [`$${Number(value).toLocaleString('es-MX')}`, 'Costo']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <ReferenceLine y={avgCost} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Promedio', position: 'right', fontSize: 10, fill: '#10b981' }} />
            <Bar
              dataKey="costo"
              radius={[4, 4, 0, 0]}
              fill="#10b981"
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Promedio mensual: <span className="font-semibold text-gray-600">${avgCost.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
        </p>
      </CardContent>
    </Card>
  )
}
