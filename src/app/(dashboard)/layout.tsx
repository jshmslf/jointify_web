'use client';

import DashboardHeader from '@/components/dashboard/header';
import SideNav from '@/components/dashboard/side-nav';
import { SidebarProvider, useSidebar } from '@/providers/sidebar-provider';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className="min-h-screen bg-background transition-all duration-200"
      style={{ paddingLeft: collapsed ? '3.5rem' : '13rem' }}
    >
      <DashboardHeader />
      <main className="pt-14 pb-16 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SideNav />
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
