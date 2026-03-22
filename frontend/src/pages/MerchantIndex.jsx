import { Building2 } from 'lucide-react'

export default function MerchantIndex() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
      <Building2 className="h-10 w-10" />
      <h2 className="text-lg font-semibold text-slate-700">Comerciantes</h2>
      <p className="text-sm">Selecione um comerciante para ver o perfil.</p>
    </div>
  )
}
