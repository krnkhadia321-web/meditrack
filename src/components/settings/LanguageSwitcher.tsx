'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { Check, Loader2, Languages } from 'lucide-react'

export default function LanguageSwitcher() {
  const current = useLocale() as Locale
  const [selected, setSelected] = useState<Locale>(current)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handlePick(locale: Locale) {
    if (locale === selected) return
    setSelected(locale)
    setSaved(false)
    try {
      const res = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setSelected(current)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Languages className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Language / भाषा</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {locales.map((l) => {
          const label = localeLabels[l]
          const isActive = selected === l
          return (
            <button
              key={l}
              onClick={() => handlePick(l)}
              disabled={pending}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm transition-all ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-white hover:bg-accent'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{label.flag}</span>
                <span className="text-left">
                  <span className="block font-medium">{label.native}</span>
                  <span className="block text-xs text-muted-foreground">{label.english}</span>
                </span>
              </span>
              {isActive && (pending ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Check className="w-4 h-4 text-primary" />)}
            </button>
          )
        })}
      </div>
      {saved && !pending && (
        <p className="text-xs text-emerald-600 mt-2">✓ Saved — UI switched to {localeLabels[selected].native}</p>
      )}
    </div>
  )
}
