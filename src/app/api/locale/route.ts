import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isLocale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const ONE_YEAR = 60 * 60 * 24 * 365

export async function POST(request: Request) {
  const { locale } = await request.json()
  if (!isLocale(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set('locale', locale, {
    maxAge: ONE_YEAR,
    path: '/',
    sameSite: 'lax',
  })

  // Best-effort persist to profile (ignore if column missing or not signed in)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ locale }).eq('id', user.id)
    }
  } catch {}

  return NextResponse.json({ ok: true, locale })
}
