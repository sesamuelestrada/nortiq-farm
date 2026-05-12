import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AssetStatus } from '../types'

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  operational: {
    label: 'Operativo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  maintenance: {
    label: 'En mantenimiento',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  out_of_service: {
    label: 'Fuera de servicio',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
}

interface Props {
  status: AssetStatus
  className?: string
}

export function AssetStatusBadge({ status, className }: Props) {
  const config = statusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
