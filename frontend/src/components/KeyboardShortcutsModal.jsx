import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { keys: 'G + C', action: 'Command Center' },
  { keys: 'G + A', action: 'Alertas' },
  { keys: 'G + R', action: 'Relatórios' },
  { keys: 'J / K', action: 'Navegar tabela' },
  { keys: 'Space', action: 'Expandir linha' },
  { keys: 'F', action: 'Falso Positivo' },
  { keys: 'X', action: 'Confirmar Fraude' },
  { keys: '?', action: 'Esta ajuda' },
]

export function KeyboardShortcutsModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use estes atalhos para navegar rapidamente pela aplicação.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-600">Atalho</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Ação</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.keys} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <kbd className="inline-flex items-center gap-1 rounded border bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                      {s.keys}
                    </kbd>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
