'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Asset {
  id: string
  name: string
}

interface AssetFilterProps {
  assets: Asset[]
  selectedAssetId?: string
}

export function AssetFilter({ assets, selectedAssetId }: AssetFilterProps) {
  return (
    <Select
      defaultValue={selectedAssetId ?? 'all'}
      onValueChange={(v) => {
        const url = v === 'all' ? '/maintenance' : `/maintenance?asset=${v}`
        window.location.href = url
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Todos los activos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los activos</SelectItem>
        {assets.map(a => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
