import { NewAssetForm } from '@/features/assets/components/NewAssetForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewAssetPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <Link
        href="/assets"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a activos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo activo</h1>
        <p className="text-sm text-gray-500 mt-1">Registra un tractor, camión, implemento o herramienta</p>
      </div>

      <NewAssetForm />
    </div>
  )
}
