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
  { keys: 'G + A', action: 'Alerts' },
  { keys: 'G + R', action: 'Reports' },
  { keys: 'J / K', action: 'Navigate table' },
  { keys: 'Space', action: 'Expand row' },
  { keys: 'F', action: 'False Positive' },
  { keys: 'X', action: 'Confirm Fraud' },
  { keys: '?', action: 'This help' },
]

export function KeyboardShortcutsModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to quickly navigate the application.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Shortcut</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.keys} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <kbd className="inline-flex items-center gap-1 rounded border bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {s.keys}
                    </kbd>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
