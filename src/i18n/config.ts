export const locales = ['en', 'hi'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, { native: string; english: string; flag: string }> = {
  en: { native: 'English',  english: 'English', flag: '🇬🇧' },
  hi: { native: 'हिन्दी',   english: 'Hindi',   flag: '🇮🇳' },
}

export function isLocale(x: string | undefined | null): x is Locale {
  return !!x && (locales as readonly string[]).includes(x)
}
