import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  Home,
  AlertTriangle,
  FileText,
  Sun,
  Moon,
  Download,
  Filter,
  Clock,
  CircleDot,
  Building2,
} from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

export default function CommandPalette({ open, onClose, isDark, onToggleDark }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const runCommand = (fn) => {
    onClose()
    fn()
  }

  // NIF pattern detection for dynamic merchant search
  const nifMatch = search.match(/^PT\d{3,9}$/i) || search.match(/^\d{9}$/)
  const merchantNif = nifMatch ? search.toUpperCase() : null

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <Command
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          label="Command Palette"
        >
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={t('commandPalette.searchPlaceholder')}
            className="w-full px-4 py-3 text-sm border-b border-slate-200 dark:border-slate-700 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {t('commandPalette.noResults')}
            </Command.Empty>

            {/* Navigation group */}
            <Command.Group heading={t('commandPalette.navigation')} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
              <CommandItem
                icon={Home}
                label={t('commandPalette.commandCenter')}
                shortcut="G C"
                onSelect={() => runCommand(() => navigate('/'))}
              />
              <CommandItem
                icon={AlertTriangle}
                label={t('commandPalette.alertQueue')}
                shortcut="G A"
                onSelect={() => runCommand(() => navigate('/alerts'))}
              />
              <CommandItem
                icon={FileText}
                label={t('commandPalette.sarReports')}
                shortcut="G R"
                onSelect={() => runCommand(() => navigate('/reports'))}
              />
            </Command.Group>

            {/* Filter presets group */}
            <Command.Group heading={t('commandPalette.filters')} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
              <CommandItem
                icon={Filter}
                label={t('commandPalette.viewCritical')}
                onSelect={() =>
                  runCommand(() => navigate('/alerts', { state: { scoreRange: '0.90-1.00' } }))
                }
              />
              <CommandItem
                icon={Clock}
                label={t('commandPalette.viewPending')}
                onSelect={() =>
                  runCommand(() => navigate('/alerts', { state: { status: 'PENDING_REVIEW' } }))
                }
              />
              <CommandItem
                icon={CircleDot}
                label={t('commandPalette.viewFalsePositives')}
                onSelect={() =>
                  runCommand(() => navigate('/alerts', { state: { status: 'FALSE_POSITIVE' } }))
                }
              />
            </Command.Group>

            {/* Actions group */}
            <Command.Group heading={t('commandPalette.actions')} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
              <CommandItem
                icon={isDark ? Sun : Moon}
                label={isDark ? t('commandPalette.disableDarkMode') : t('commandPalette.enableDarkMode')}
                onSelect={() => runCommand(() => onToggleDark())}
              />
              <CommandItem
                icon={Download}
                label={t('commandPalette.exportAllSars')}
                onSelect={() => runCommand(() => navigate('/reports', { state: { exportAll: true } }))}
              />
            </Command.Group>

            {/* Dynamic merchant search */}
            {merchantNif && (
              <Command.Group heading={t('commandPalette.merchant')} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                <CommandItem
                  icon={Building2}
                  label={t('commandPalette.viewMerchant', { nif: merchantNif })}
                  onSelect={() => runCommand(() => navigate(`/merchants/${merchantNif}`))}
                />
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

function CommandItem({ icon: Icon, label, shortcut, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer text-slate-700 dark:text-slate-300 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  )
}
