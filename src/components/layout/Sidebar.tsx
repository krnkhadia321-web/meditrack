'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import {
  LayoutDashboard, Users, Receipt, FileText,
  Shield, Bot, LogOut, Heart, Settings, Pill, Activity, Brain
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/family',    icon: Users,           label: 'Family' },
  { href: '/dashboard/expenses',  icon: Receipt,         label: 'Expenses' },
  { href: '/dashboard/medicines', icon: Pill, label: 'Medicines' },
  { href: '/dashboard/vitals', icon: Activity, label: 'Vitals' },
  { href: '/dashboard/records',   icon: FileText,        label: 'Health Records' },
  { href: '/dashboard/insurance', icon: Shield,          label: 'Insurance' },
  { href: '/dashboard/assistant', icon: Bot, label: 'AI Assistant' },
  { href: '/dashboard/advisor',   icon: Brain,           label: 'Should I?' },
]

type Props = {
  userName: string
  userEmail: string
}

export default function Sidebar({ userName, userEmail }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  return (
    <aside className="sidebar flex flex-col py-6">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 mb-8">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-white" fill="currentColor" />
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">MediTrack</div>
          <div className="text-xs text-muted-foreground">Healthcare Optimizer</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">
          Menu
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={cn('sidebar-link', active && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              
            </Link>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className="px-3 border-t border-border pt-4 mt-4 space-y-0.5">
        <Link href="/dashboard/settings"
          className={cn('sidebar-link', pathname === '/dashboard/settings' && 'active')}>
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button onClick={handleSignOut}
          className="sidebar-link w-full text-left text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* User chip */}
      <div className="mx-3 mt-4 bg-muted rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {getInitials(userName)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{userName}</div>
          <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
        </div>
      </div>
    </aside>
  )
}