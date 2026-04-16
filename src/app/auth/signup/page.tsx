'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Heart, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const t = useTranslations('auth')

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-border p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-emerald-600" fill="currentColor" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t('checkEmail')}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('checkEmailDesc', { email })}
          </p>
          <Link href="/auth/signin" className="btn-primary mt-6 inline-flex">{t('backToSignIn')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <span className="font-semibold text-lg">MediTrack</span>
        </div>

        <h2 className="text-2xl font-semibold mb-1">{t('signupTitle')}</h2>
        <p className="text-muted-foreground text-sm mb-8">{t('signupSubtitle')}</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('fullName')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={t('fullNamePlaceholder')} required className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')} required className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordMinPlaceholder')} minLength={8} required className="input-field pl-10" />
            </div>
          </div>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('createAccount')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t('haveAccount')}{' '}
          <Link href="/auth/signin" className="text-primary font-medium hover:underline">{t('signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
