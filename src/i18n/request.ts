import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, isLocale } from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  const locale = isLocale(raw) ? raw : defaultLocale
  const messages = (await import(`./messages/${locale}.json`)).default
  return { locale, messages }
})
