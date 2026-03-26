import { Building2 } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

export default function MerchantIndex() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
      <Building2 className="h-10 w-10" />
      <h2 className="text-lg font-semibold text-slate-700">{t('merchants.title')}</h2>
      <p className="text-sm">{t('merchants.selectMerchant')}</p>
    </div>
  )
}
