'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSummary, getSpending, getFairShare, getNetWorth } from '@/lib/queries/dashboard';

const fmt = (v: string | number) => Number(v).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: summary } = useQuery({ queryKey: ['summary', year, month], queryFn: () => getSummary(year, month) });
  const { data: spending } = useQuery({ queryKey: ['spending', year, month], queryFn: () => getSpending(year, month) });
  const { data: fairShare } = useQuery({ queryKey: ['fair-share', year, month], queryFn: () => getFairShare(year, month) });
  const { data: netWorth } = useQuery({ queryKey: ['net-worth'], queryFn: getNetWorth });

  function prev() { const d = new Date(year, month - 2); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }
  function next() { const d = new Date(year, month); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }

  return (
    <div className="content-container py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Financial insights</p>
      </div>

      {/* Period nav */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={prev}>← Prev</Button>
        <span className="text-sm font-medium px-2">{months[month - 1]} {year}</span>
        <Button size="sm" variant="outline" onClick={next}>Next →</Button>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Income', value: summary?.income ?? '0', color: 'text-foreground' },
          { label: 'Expenses', value: summary?.expenses ?? '0', color: 'text-destructive' },
          { label: 'Debt payments', value: summary?.debtPayments ?? '0', color: 'text-muted-foreground' },
          { label: 'Net cash flow', value: summary?.netCashFlow ?? '0', color: Number(summary?.netCashFlow) >= 0 ? 'text-foreground' : 'text-destructive' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader><CardDescription>{label}</CardDescription></CardHeader>
            <CardContent><p className={`text-lg font-semibold ${color}`}>{fmt(value)}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Savings rates */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Savings rates</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Basic savings rate</p>
            <p className="text-2xl font-semibold">{summary?.basicSavingsRate ?? '0%'}</p>
            <p className="text-xs text-muted-foreground">(Income − Expenses) ÷ Income</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">True savings rate</p>
            <p className="text-2xl font-semibold">{summary?.trueSavingsRate ?? '0%'}</p>
            <p className="text-xs text-muted-foreground">(Income − Expenses − Debt) ÷ Income</p>
          </div>
        </CardContent>
      </Card>

      {/* Spending breakdown */}
      {spending?.breakdown?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Spending breakdown</CardTitle><CardDescription>Total: {fmt(spending.total)}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {spending.breakdown.map((b: { category: string; amount: string; percentage: string }) => (
              <div key={b.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{b.category}</span>
                  <span className="text-muted-foreground">{fmt(b.amount)} · {b.percentage}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: b.percentage }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fair share */}
      {fairShare && !fairShare.error && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Fair share</CardTitle><CardDescription>{fairShare.fairShareNote}</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">You</p>
              <p className="text-lg font-semibold">{fmt(fairShare.me.total)}</p>
              <p className="text-xs text-muted-foreground">{fairShare.me.percentage}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Partner</p>
              <p className="text-lg font-semibold">{fmt(fairShare.partner.total)}</p>
              <p className="text-xs text-muted-foreground">{fairShare.partner.percentage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net worth */}
      {netWorth && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Net worth</CardTitle>
              <Badge variant={netWorth.health === 'positive' ? 'default' : netWorth.health === 'neutral' ? 'secondary' : 'destructive'}>
                {netWorth.health}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assets</p>
              <p className="text-lg font-semibold">{fmt(netWorth.assets.total)}</p>
              <p className="text-xs text-muted-foreground">Accounts: {fmt(netWorth.assets.accounts)}</p>
              <p className="text-xs text-muted-foreground">Savings: {fmt(netWorth.assets.savings)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Debts</p>
              <p className="text-lg font-semibold text-destructive">{fmt(netWorth.debts.total)}</p>
              <p className="text-xs text-muted-foreground">{netWorth.debts.count} active</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Net worth</p>
              <p className={`text-lg font-semibold ${Number(netWorth.netWorth) >= 0 ? '' : 'text-destructive'}`}>{fmt(netWorth.netWorth)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
