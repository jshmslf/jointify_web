'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboardIcon, ArrowLeftRightIcon, WalletIcon,
  CreditCardIcon, TargetIcon, PieChartIcon, BarChart3Icon,
  ChevronLeftIcon, ChevronRightIcon, LogOutIcon, MoonIcon, SunIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/providers/sidebar-provider';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboardIcon },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRightIcon },
  { href: '/accounts',     label: 'Accounts',     icon: WalletIcon },
  { href: '/debts',        label: 'Debts',        icon: CreditCardIcon },
  { href: '/goals',        label: 'Goals',        icon: TargetIcon },
  { href: '/budgets',      label: 'Budgets',      icon: PieChartIcon },
  { href: '/reports',      label: 'Reports',      icon: BarChart3Icon },
];

export default function SideNav() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials = user
    ? `${user.givenName[0]}${user.surname[0]}`.toUpperCase()
    : '??';

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 border-r border-border bg-background transition-all duration-200',
          collapsed ? 'w-14' : 'w-52'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn('flex items-center h-14 border-b border-border shrink-0 px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <span className="text-base font-semibold tracking-tight">Jointify</span>}
          <Button variant="ghost" size="icon-sm" onClick={toggle} className="shrink-0">
            {collapsed ? <ChevronRightIcon className="size-4" /> : <ChevronLeftIcon className="size-4" />}
          </Button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors',
                collapsed ? 'justify-center' : '',
                pathname === href
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Profile + actions at bottom */}
        <div className="border-t border-border px-2 py-3 space-y-0.5 shrink-0">
          {/* Theme toggle — only render after mount to avoid hydration mismatch */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
              className={cn(
                'flex items-center gap-2.5 w-full px-2 py-2 text-sm rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50',
                collapsed ? 'justify-center' : ''
              )}
            >
              {theme === 'dark' ? <SunIcon className="size-4 shrink-0" /> : <MoonIcon className="size-4 shrink-0" />}
              {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            title={collapsed ? 'Log out' : undefined}
            className={cn(
              'flex items-center gap-2.5 w-full px-2 py-2 text-sm rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-muted/50',
              collapsed ? 'justify-center' : ''
            )}
          >
            <LogOutIcon className="size-4 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>

          {/* Profile */}
          <div className={cn('flex items-center gap-2.5 px-2 py-2 rounded-lg', collapsed ? 'justify-center' : '')}>
            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.givenName} {user?.surname}</p>
                <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background flex">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
              pathname === href ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
