import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Play, X } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

export function InactivityOverlay({ isVisible, onResume }) {
  const { t } = useLanguage()
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
            <DialogTitle>{t('inactivity.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {t('inactivity.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs text-amber-800 dark:text-amber-300">
          {t('inactivity.tip')}
        </div>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={onResume} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Play className="h-4 w-4" />{t('actions.continue')}
          </Button>
          <Button variant="outline" onClick={() => window.close()} className="gap-2 text-slate-600">
            <X className="h-4 w-4" />{t('actions.closeSession')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
