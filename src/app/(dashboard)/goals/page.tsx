'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, TargetIcon, PiggyBankIcon, HistoryIcon, UsersIcon, UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getGoals, createGoal, updateGoal, deleteGoal, getTransactions } from '@/lib/queries/dashboard';
import QuickTransactDialog, { type QuickTransactMode } from '@/components/dashboard/quick-transact-dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import axios from 'axios';

const fmt = (v: string | number) => Number(v).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const schema = z.object({
  name: z.string().min(1),
  ownership: z.enum(['me', 'partner', 'shared']),
  targetAmount: z.coerce.number().positive(),
  deadline: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Goal { id: string; name: string; ownership: string; targetAmount: string; currentAmount: string; deadline: string | null; status: string; progress: string; isOwner: boolean; }
interface Txn { id: string; type: string; category: string; totalAmount: string; notes: string | null; transactedAt: string; isOwner: boolean; }

const ownershipIcon = { me: <UserIcon className="size-3" />, partner: <UserIcon className="size-3" />, shared: <UsersIcon className="size-3" /> };

export default function GoalsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [error, setError] = useState('');
  const [quickMode, setQuickMode] = useState<QuickTransactMode | null>(null);
  const [historyFor, setHistoryFor] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ['goals'], queryFn: getGoals });
  const { data: allTxns = [] } = useQuery<Txn[]>({ queryKey: ['transactions'], queryFn: () => getTransactions() });

  const contributions = allTxns.filter(t => t.type === 'goal_contribution');

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', ownership: 'shared', targetAmount: 0, deadline: '' } });

  function openAdd() { form.reset({ name: '', ownership: 'shared', targetAmount: 0, deadline: '' }); setEditing(null); setError(''); setOpen(true); }
  function openEdit(g: Goal) { form.reset({ name: g.name, ownership: g.ownership as FormValues['ownership'], targetAmount: Number(g.targetAmount), deadline: g.deadline ?? '' }); setEditing(g); setError(''); setOpen(true); }

  const save = useMutation({
    mutationFn: (v: FormValues) => editing ? updateGoal(editing.id, v) : createGoal(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setOpen(false); },
    onError: (e) => setError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const remove = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setDeleteTarget(null); },
  });

  const statusVariant: Record<string, 'secondary' | 'default' | 'outline'> = { active: 'secondary', reached: 'default', cancelled: 'outline' };

  // group goals
  const sharedGoals = goals.filter(g => g.ownership === 'shared');
  const myGoals = goals.filter(g => g.ownership === 'me');
  const partnerGoals = goals.filter(g => g.ownership === 'partner');

  function GoalCard({ g }: { g: Goal }) {
    const myContribs = contributions.filter(t => t.isOwner);
    const partnerContribs = contributions.filter(t => !t.isOwner);
    const myTotal = myContribs.reduce((s, t) => s + Number(t.totalAmount), 0);
    const partnerTotal = partnerContribs.reduce((s, t) => s + Number(t.totalAmount), 0);
    const target = Number(g.targetAmount);
    const myPct = target > 0 ? Math.min((myTotal / target) * 100, 100) : 0;
    const partnerPct = target > 0 ? Math.min((partnerTotal / target) * 100, 100 - myPct) : 0;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm">{g.name}</CardTitle>
            <div className="flex gap-1 shrink-0">
              <Badge variant="outline" className="gap-1">
                {ownershipIcon[g.ownership as keyof typeof ownershipIcon]}
                {g.ownership}
              </Badge>
              <Badge variant={statusVariant[g.status]}>{g.status}</Badge>
            </div>
          </div>
          <CardDescription>
            {fmt(g.currentAmount)} / {fmt(g.targetAmount)}
            {g.ownership === 'shared' && (partnerTotal > 0 || myTotal > 0) && (
              <span className="block text-muted-foreground mt-1">
                Total: {fmt(myTotal + partnerTotal)}
                {partnerTotal > 0 && (
                  <span className="text-blue-500"> (Partner: {fmt(partnerTotal)})</span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {g.ownership === 'shared' ? (
            <>
              {/* Split progress bar: my contribution (primary) + partner (blue) */}
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-primary transition-all" style={{ width: `${myPct}%` }} />
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${partnerPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-primary" /> You: {fmt(myTotal)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-blue-500" /> Partner: {fmt(partnerTotal)}
                </span>
              </div>
            </>
          ) : (
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(target > 0 ? (Number(g.currentAmount) / target) * 100 : 0, 100)}%` }} />
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{g.progress}</span>
            {g.deadline && <span>Due {new Date(g.deadline).toLocaleDateString()}</span>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {g.status === 'active' && (
              <Button size="sm" variant="default" onClick={() => setQuickMode({ type: 'goal_contribution', goalId: g.id, goalName: g.name })}>
                <PiggyBankIcon />Contribute
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setHistoryFor(g)}>
              <HistoryIcon />History
            </Button>
            {g.isOwner && (
              <>
                <Button size="sm" variant="outline" onClick={() => openEdit(g)}><PencilIcon />Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(g)}><TrashIcon /></Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total contributions across all goals
  const myTotalContributions = contributions.filter(t => t.isOwner).reduce((s, t) => s + Number(t.totalAmount), 0);
  const partnerTotalContributions = contributions.filter(t => !t.isOwner).reduce((s, t) => s + Number(t.totalAmount), 0);
  const totalAllContributions = myTotalContributions + partnerTotalContributions;

  return (
    <div className="content-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Goals</h1>
          <p className="text-sm text-muted-foreground">{goals.filter(g => g.status === 'active').length} active goals</p>
        </div>
        <Button size="sm" onClick={openAdd}><PlusIcon />Add goal</Button>
      </div>

      {/* Total contributions summary */}
      {contributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Contributions</CardTitle>
            <CardDescription>Across all goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{fmt(myTotalContributions)}</p>
                <p className="text-xs text-muted-foreground">Your contributions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{fmt(partnerTotalContributions)}</p>
                <p className="text-xs text-muted-foreground">Partner contributions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{fmt(totalAllContributions)}</p>
                <p className="text-xs text-muted-foreground">Total combined</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><TargetIcon className="size-8 mx-auto mb-2 opacity-40" />No goals yet</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {sharedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><UsersIcon className="size-4" />Couple goals</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sharedGoals.map(g => <GoalCard key={g.id} g={g} />)}
              </div>
            </div>
          )}
          {myGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><UserIcon className="size-4" />My goals</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myGoals.map(g => <GoalCard key={g.id} g={g} />)}
              </div>
            </div>
          )}
          {partnerGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><UserIcon className="size-4" />Partner goals</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {partnerGoals.map(g => <GoalCard key={g.id} g={g} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <QuickTransactDialog mode={quickMode} onClose={() => setQuickMode(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['goals'] })} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete this goal and all its contributions."
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />

      {/* Contribution history sheet */}
      <Sheet open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <SheetContent side="right" className="w-80 sm:max-w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{historyFor?.name} — Contributions</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const isShared = historyFor?.ownership === 'shared';
              const goalContribs = contributions.filter(t =>
                // We can't filter by goalId from the list endpoint, so show all goal_contributions
                // and label by owner. For a specific goal, this is the best we can do without a detail endpoint.
                t.type === 'goal_contribution' && (isShared || t.isOwner)
              );
              if (goalContribs.length === 0) return (
                <p className="p-4 text-sm text-muted-foreground text-center">No contributions yet</p>
              );
              return goalContribs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b">
                  <div className={`size-7 rounded-full flex items-center justify-center shrink-0 ${t.isOwner ? 'bg-primary/10' : 'bg-blue-500/10'}`}>
                    <PiggyBankIcon className={`size-3.5 ${t.isOwner ? 'text-primary' : 'text-blue-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.isOwner ? 'You' : 'Partner'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.transactedAt).toLocaleDateString()}{t.notes && ` · ${t.notes}`}</p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ${t.isOwner ? 'text-primary' : 'text-blue-500'}`}>+{fmt(t.totalAmount)}</p>
                </div>
              ));
            })()}
          </div>
          {contributions.length > 0 && (() => {
            const isShared = historyFor?.ownership === 'shared';
            const myTotal = contributions.filter(t => t.isOwner).reduce((s, t) => s + Number(t.totalAmount), 0);
            const partnerTotal = contributions.filter(t => !t.isOwner).reduce((s, t) => s + Number(t.totalAmount), 0);
            return (
              <div className="p-4 border-t space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-full bg-primary inline-block" />You
                  </span>
                  <span className="font-semibold text-primary">{fmt(myTotal)}</span>
                </div>
                {isShared && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-blue-500 inline-block" />Partner
                    </span>
                    <span className="font-semibold text-blue-500">{fmt(partnerTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-1.5">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{fmt(isShared ? myTotal + partnerTotal : myTotal)}</span>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit goal' : 'Add goal'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Goal name</FormLabel><FormControl><Input placeholder="Emergency Fund" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="targetAmount" render={({ field }) => (
                  <FormItem><FormLabel>Target amount</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ownership" render={({ field }) => (
                  <FormItem><FormLabel>Owner</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="shared">Couple (shared)</option>
                      <option value="me">Me</option>
                      <option value="partner">Partner</option>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="deadline" render={({ field }) => (
                <FormItem><FormLabel>Deadline (optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
