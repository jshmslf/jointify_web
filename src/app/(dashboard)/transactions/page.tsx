'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, ArrowLeftRightIcon, ArrowUpIcon, ArrowDownIcon, RefreshCwIcon, CheckCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getTransactions, createTransaction, deleteTransaction, getAccounts, getDebts, getGoals } from '@/lib/queries/dashboard';
import { useAuth } from '@/providers/auth-provider';
import QuickTransactDialog, { type QuickTransactMode } from '@/components/dashboard/quick-transact-dialog';
import axios from 'axios';

const fmt = (v: string | number) => Number(v).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const INCOME_CATS = ['Salary', 'Freelance', 'Investment', 'Dividend', 'Other'];
const EXPENSE_CATS = ['Bills', 'Grocery', 'Subscription', 'Transport', 'Food', 'Health', 'Entertainment', 'Other'];

const schema = z.object({
  type: z.enum(['income', 'expense', 'debt_repayment', 'goal_contribution']),
  category: z.string().min(1),
  ownership: z.enum(['me', 'partner', 'shared']),
  totalAmount: z.coerce.number().positive(),
  notes: z.string().optional(),
  transactedAt: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  debtId: z.string().optional(),
  goalId: z.string().optional(),
  accountId: z.string().min(1, 'Select an account'),
});
type FormValues = z.infer<typeof schema>;

interface Transaction { id: string; type: string; category: string; ownership: string; totalAmount: string; currency: string; isRecurring: boolean; notes: string | null; transactedAt: string; isOwner: boolean; createdByName: string; }
interface Account { id: string; name: string; type: string; isOwner: boolean; ownership: string; }
interface Debt { id: string; name: string; }
interface Goal { id: string; name: string; }

const typeIcon: Record<string, React.ReactNode> = {
  income: <ArrowUpIcon className="size-3.5 text-green-500" />,
  expense: <ArrowDownIcon className="size-3.5 text-destructive" />,
  debt_repayment: <RefreshCwIcon className="size-3.5 text-muted-foreground" />,
  goal_contribution: <ArrowUpIcon className="size-3.5 text-blue-500" />,
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [quickMode, setQuickMode] = useState<QuickTransactMode | null>(null);

  const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey: ['transactions', typeFilter], queryFn: () => getTransactions(typeFilter ? { type: typeFilter } : undefined) });
  const { data: rawAccounts = [] } = useQuery<Account[]>({ queryKey: ['accounts'], queryFn: getAccounts });
  const accounts = rawAccounts.filter(a => a.isOwner || a.ownership === 'shared');
  const { data: debts = [] } = useQuery<Debt[]>({ queryKey: ['debts'], queryFn: getDebts });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ['goals'], queryFn: getGoals });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'expense', category: '', ownership: 'me', totalAmount: 0, isRecurring: false, accountId: '' } });
  const txType = form.watch('type');
  const isRecurring = form.watch('isRecurring');
  const cats = txType === 'income' ? INCOME_CATS : EXPENSE_CATS;

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const { accountId, ...rest } = v;
      return createTransaction({ ...rest, splits: [{ userId: user!.id, accountId, amount: v.totalAmount }] });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); setOpen(false); },
    onError: (e) => setError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const remove = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); },
  });

  const filters = [
    { label: 'All', value: '' },
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
    { label: 'Debt', value: 'debt_repayment' },
    { label: 'Goal', value: 'goal_contribution' },
  ];

  return (
    <div className="content-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">{transactions.length} records</p>
        </div>
        <Button size="sm" onClick={() => { form.reset({ type: 'expense', category: '', ownership: 'me', totalAmount: 0, isRecurring: false, accountId: '' }); setError(''); setOpen(true); }}>
          <PlusIcon />Add
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <Button key={f.value} size="sm" variant={typeFilter === f.value ? 'default' : 'outline'} onClick={() => setTypeFilter(f.value)}>{f.label}</Button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ArrowLeftRightIcon className="size-8 mx-auto mb-2 opacity-40" />No transactions</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex items-center justify-center size-8 rounded-full bg-muted shrink-0">
                  {typeIcon[t.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{t.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.type.replace(/_/g, ' ')} · {t.createdByName}
                    {t.isRecurring && ' · recurring'}
                    {t.notes && ` · ${t.notes}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(t.transactedAt).toLocaleDateString()}</p>
                </div>
                {t.isOwner && t.type === 'expense' && (
                  <Button size="icon-sm" variant="ghost" className="text-green-500 hover:text-green-500 shrink-0" title="Mark as paid" onClick={() => setQuickMode({ type: 'bill_payment', category: t.category, billName: t.notes ?? t.category })}>
                    <CheckCircleIcon className="size-3.5" />
                  </Button>
                )}
                {t.isOwner && (
                  <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => remove.mutate(t.id)}>
                    <TrashIcon className="size-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuickTransactDialog mode={quickMode} onClose={() => setQuickMode(null)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add transaction</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="debt_repayment">Debt repayment</option>
                      <option value="goal_contribution">Goal contribution</option>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ownership" render={({ field }) => (
                  <FormItem><FormLabel>Owner</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="me">Me</option>
                      <option value="partner">Partner</option>
                      <option value="shared">Shared</option>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl>
                  {txType === 'income' || txType === 'expense' ? (
                    <Select {...field}>
                      <option value="">Select category</option>
                      {cats.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                    </Select>
                  ) : (
                    <Input placeholder="Category" {...field} />
                  )}
                </FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="totalAmount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem><FormLabel>Account</FormLabel><FormControl>
                  <Select {...field}>
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />

              {txType === 'debt_repayment' && (
                <FormField control={form.control} name="debtId" render={({ field }) => (
                  <FormItem><FormLabel>Debt</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="">Select debt</option>
                      {debts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              )}

              {txType === 'goal_contribution' && (
                <FormField control={form.control} name="goalId" render={({ field }) => (
                  <FormItem><FormLabel>Goal</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="">Select goal</option>
                      {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              )}

              <FormField control={form.control} name="transactedAt" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input placeholder="Add a note…" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex items-center gap-2">
                <input type="checkbox" id="recurring" {...form.register('isRecurring')} className="rounded" />
                <label htmlFor="recurring" className="text-sm">Recurring</label>
              </div>

              {isRecurring && (
                <FormField control={form.control} name="recurFrequency" render={({ field }) => (
                  <FormItem><FormLabel>Frequency</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              )}

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
