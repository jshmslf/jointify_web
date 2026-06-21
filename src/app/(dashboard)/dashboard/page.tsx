'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUpIcon, WalletIcon, CreditCardIcon, TargetIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAccounts, getDebts, getGoals, getCouple, getSummary } from '@/lib/queries/dashboard';
import PartnerInviteCard from '@/components/dashboard/partner-invite-card';

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

export default function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: summary } = useQuery({ queryKey: ['summary', year, month], queryFn: () => getSummary(year, month) });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts });
  const { data: debts } = useQuery({ queryKey: ['debts'], queryFn: getDebts });
  const { data: goals } = useQuery({ queryKey: ['goals'], queryFn: getGoals });
  const { data: couple } = useQuery({ queryKey: ['couple'], queryFn: getCouple });

  const totalBalance = (accounts ?? []).reduce((s: number, a: { currentBalance: string }) => s + Number(a.currentBalance), 0);
  const activeDebts = (debts ?? []).filter((d: { status: string }) => d.status === 'active');
  const totalDebt = activeDebts.reduce((s: number, d: { remainingBalance: string }) => s + Number(d.remainingBalance), 0);
  const activeGoals = (goals ?? []).filter((g: { status: string }) => g.status === 'active');

  return (
    <div className="content-container py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleString('default', { month: 'long' })} {year}
        </p>
      </div>

      {/* Partner status */}
      {couple?.paired ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="text-sm">Paired with <span className="font-medium">@{couple.partner?.username}</span></span>
            <Badge variant="secondary" className="ml-auto">Active</Badge>
          </CardContent>
        </Card>
      ) : (
        <PartnerInviteCard />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUpIcon className="size-3.5" /> Income this month
            </CardDescription>
            <CardTitle className="text-2xl">{fmt(summary?.income ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Expenses: {fmt(summary?.expenses ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Net: {fmt(summary?.netCashFlow ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <WalletIcon className="size-3.5" /> Total balance
            </CardDescription>
            <CardTitle className="text-2xl">{fmt(totalBalance)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{(accounts ?? []).length} account{(accounts ?? []).length !== 1 ? 's' : ''}</p>
            {(accounts ?? []).slice(0, 2).map((a: { id: string; name: string; currentBalance: string; type: string }) => (
              <p key={a.id} className="text-xs text-muted-foreground truncate">{a.name}: {fmt(a.currentBalance)}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CreditCardIcon className="size-3.5" /> Total debt
            </CardDescription>
            <CardTitle className="text-2xl">{fmt(totalDebt)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{activeDebts.length} active debt{activeDebts.length !== 1 ? 's' : ''}</p>
            {activeDebts.slice(0, 2).map((d: { id: string; name: string; remainingBalance: string }) => (
              <p key={d.id} className="text-xs text-muted-foreground truncate">{d.name}: {fmt(d.remainingBalance)}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <TargetIcon className="size-4" /> Goals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGoals.map((g: { id: string; name: string; currentAmount: string; targetAmount: string; progress: string; deadline?: string; ownership: string }) => (
              <Card key={g.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{g.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0">{g.ownership}</Badge>
                  </div>
                  <CardDescription>{fmt(g.currentAmount)} / {fmt(g.targetAmount)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: g.progress }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{g.progress}</span>
                    {g.deadline && <span>Due {new Date(g.deadline).toLocaleDateString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
