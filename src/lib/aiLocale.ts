import { cookies } from 'next/headers'
import { isLocale, defaultLocale, type Locale } from '@/i18n/config'

export async function getAILocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  return isLocale(raw) ? raw : defaultLocale
}

/**
 * Instruction to append to AI system prompts so the assistant replies
 * in the user's chosen language. Currency (₹), medical terms and hospital
 * names stay untouched — the UX rule is "translate the explanation, not the data".
 */
export function aiLanguageInstruction(locale: Locale): string {
  if (locale === 'hi') {
    return `\n\nIMPORTANT LANGUAGE RULE: Reply in Hindi (Devanagari script). Keep medical terms, medicine names, hospital names, scheme names (PMJAY, CGHS, ESIC, 80D) and currency symbols (₹) exactly as they are. Use simple conversational Hindi a middle-class Indian family would use in daily speech. Never mix English sentences.`
  }
  return ''
}
