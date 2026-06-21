'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useSidebar } from '@/providers/sidebar-provider';
import NotificationsPanel from './notifications-panel';

export default function DashboardHeader() {
  const { user } = useAuth();
  const { collapsed } = useSidebar();

  return (
    <header
      className="fixed top-0 right-0 z-40 h-14 border-b border-border bg-background flex items-center px-4 gap-3 transition-all duration-200"
      style={{ left: collapsed ? '3.5rem' : '13rem' }}
    >
      <div className="flex-1" />

      <NotificationsPanel />

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground hidden sm:block">
          {user?.givenName} {user?.surname}
        </span>
      </div>
    </header>
  );
}
