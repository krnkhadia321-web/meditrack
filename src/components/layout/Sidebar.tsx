"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Receipt,
  FileText,
  Shield,
  Bot,
  LogOut,
  Heart,
  Settings,
  Pill,
  Activity,
  Brain,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" as const },
  { href: "/dashboard/family", icon: Users, key: "family" as const },
  { href: "/dashboard/expenses", icon: Receipt, key: "expenses" as const },
  { href: "/dashboard/medicines", icon: Pill, key: "medicines" as const },
  { href: "/dashboard/vitals", icon: Activity, key: "vitals" as const },
  { href: "/dashboard/records", icon: FileText, key: "records" as const },
  { href: "/dashboard/insurance", icon: Shield, key: "insurance" as const },
  { href: "/dashboard/assistant", icon: Bot, key: "assistant" as const },
  { href: "/dashboard/advisor", icon: Brain, key: "advisor" as const },
  { href: "/dashboard/health-score", icon: Heart, key: "healthScore" as const },
];

type Props = {
  userName: string;
  userEmail: string;
};

export default function Sidebar({ userName, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("nav");

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/signin");
    router.refresh();
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
          <div className="text-xs text-muted-foreground">
            Healthcare Optimizer
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">
          {t("menu")}
        </p>
        {navItems.map(({ href, icon: Icon, key }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn("sidebar-link", active && "active")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="px-3 border-t border-border pt-4 mt-4 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className={cn(
            "sidebar-link",
            pathname === "/dashboard/settings" && "active",
          )}
        >
          <Settings className="w-4 h-4" />
          {t("settings")}
        </Link>
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-left text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          {t("signOut")}
        </button>
      </div>

      {/* User chip */}
      <div className="mx-3 mt-4 bg-muted rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {getInitials(userName)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{userName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {userEmail}
          </div>
        </div>
      </div>
    </aside>
  );
}
