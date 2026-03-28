import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageContext'

export default function ScoreEvolution() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('actions.backToDashboard')}
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <h2 className="text-lg font-semibold text-slate-700">{t('dashboard.scoreEvolutionTitle')}</h2>
        <p className="text-sm">{t('dashboard.scoreEvolutionDescription')}</p>
      </div>
    </div>
  )
}
