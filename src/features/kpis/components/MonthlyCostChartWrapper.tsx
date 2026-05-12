'use client'

import dynamic from 'next/dynamic'

interface DataPoint {
  month: string
  costo: number
  isProjection?: boolean
}

interface Props {
  data: DataPoint[]
  avgCost: number
}

const MonthlyCostChart = dynamic(
  () => import('./MonthlyCostChart').then(m => ({ default: m.MonthlyCostChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[272px] animate-pulse rounded-xl bg-muted border border-border" />
    ),
  }
)

export function MonthlyCostChartWrapper(props: Props) {
  return <MonthlyCostChart {...props} />
}
