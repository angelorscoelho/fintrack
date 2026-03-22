import { AlertTriangle } from 'lucide-react'

export default function AlertQueue() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
      <AlertTriangle className="h-10 w-10" />
      <h2 className="text-lg font-semibold text-slate-700">Fila de Alertas</h2>
      <p className="text-sm">Em construção — brevemente disponível.</p>
    </div>
  )
}
