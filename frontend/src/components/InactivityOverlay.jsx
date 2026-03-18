import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Play, X } from 'lucide-react'

export function InactivityOverlay({ isVisible, onResume }) {
  return (
    <Dialog open={isVisible} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle>Sessão pausada por inatividade</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            A ligação foi interrompida após <strong>30 minutos</strong> sem atividade.
            Os dados existentes continuam visíveis. Clique em <strong>Continuar</strong> para retomar.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
          💡 Pode também <strong>refrescar a página</strong> para retomar.
        </div>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={onResume} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Play className="h-4 w-4" />Continuar
          </Button>
          <Button variant="outline" onClick={() => window.close()} className="gap-2 text-slate-600">
            <X className="h-4 w-4" />Fechar sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
