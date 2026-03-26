import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

const SHORTCUT_KEYS = [
  { keys: 'G + C', actionKey: 'shortcuts.commandCenter' },
  { keys: 'G + A', actionKey: 'shortcuts.alerts' },
  { keys: 'G + R', actionKey: 'shortcuts.reports' },
  { keys: 'J / K', actionKey: 'shortcuts.navigateTable' },
  { keys: 'Space', actionKey: 'shortcuts.expandRow' },
  { keys: 'F', actionKey: 'shortcuts.falsePositive' },
  { keys: 'X', actionKey: 'shortcuts.confirmFraud' },
  { keys: '?', actionKey: 'shortcuts.thisHelp' },
]

export function KeyboardShortcutsModal({ open, onClose }) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('shortcuts.title')}
          </DialogTitle>
          <DialogDescription>
            {t('shortcuts.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">{t('shortcuts.shortcut')}</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">{t('shortcuts.action')}</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUT_KEYS.map((s) => (
                <tr key={s.keys} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <kbd className="inline-flex items-center gap-1 rounded border bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {s.keys}
                    </kbd>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{t(s.actionKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
