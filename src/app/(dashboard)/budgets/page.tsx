'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, PieChartIcon, ReceiptIcon, HistoryIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getBudgets, createBudget, updateBudget, deleteBudget, getTransactions, createTransaction, getAccounts } from '@/lib/queries/dashboard';
import { useAuth } from '@/providers/auth-provider';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import axios from 'axios';

const fmt = (v: string | number) => Number(v).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const budgetSchema = z.object({
  category: z.string().min(1),
  ownership: z.enum(['me', 'partner', 'shared']),
  periodType: z.enum(['monthly', 'yearly']),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  allocatedAmount: z.coerce.number().positive(),
});

const expenseSchema = z.object({
  totalAmount: z.coerce.number().positive(),
  notes: z.string().optional(),
  transactedAt: z.string().optional(),
  accountId: z.string().min(1, 'Select an account'),
  ownership: z.enum(['me', 'partner', 'shared']),
});

type BudgetForm = z.infer<typeof budgetSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

interface Budget { id: string; category: string; ownership: string; periodType: string; periodYear: string; periodMonth: string | null; allocatedAmount: string; spent: string; remaining: string; usedPercentage: string; isOwner: boolean; }
interface Txn { id: string; type: string; category: string; totalAmount: string; notes: string | null; transactedAt: string; ownership: string; isOwner: boolean; }
interface Account { id: string; name: string; isOwner: boolean; ownership: string; }

export default function BudgetsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [error, setError] = useState('');
  const [expenseFor, setExpenseFor] = useState<Budget | null>(null);
  const [expenseError, setExpenseError] = useState('');
  const [historyFor, setHistoryFor] = useState<Budget | null>(null);

  const { data: budgets = [] } = useQuery<Budget[]>({
    queryKey: ['budgets', year, month],
    queryFn: () => getBudgets({ periodType: 'monthly', periodYear: String(year), periodMonth: String(month) }),
  });

  const { data: allTxns = [] } = useQuery<Txn[]>({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });

  const { data: rawAccounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  });
  const accounts = rawAccounts.filter((a: Account) => a.isOwner || a.ownership === 'shared');

  const budgetForm = useForm<BudgetForm>({ resolver: zodResolver(budgetSchema), defaultValues: { category: '', ownership: 'me', periodType: 'monthly', periodYear: year, periodMonth: month, allocatedAmount: 0 } });
  const expenseForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema), defaultValues: { totalAmount: 0, ownership: 'me', accountId: '' } });

  function openAdd() { budgetForm.reset({ category: '', ownership: 'me', periodType: 'monthly', periodYear: year, periodMonth: month, allocatedAmount: 0 }); setEditing(null); setError(''); setOpen(true); }
  function openEdit(b: Budget) { budgetForm.reset({ category: b.category, ownership: b.ownership as BudgetForm['ownership'], periodType: b.periodType as BudgetForm['periodType'], periodYear: Number(b.periodYear), periodMonth: b.periodMonth ? Number(b.periodMonth) : undefined, allocatedAmount: Number(b.allocatedAmount) }); setEditing(b); setError(''); setOpen(true); }

  const saveBudget = useMutation({
    mutationFn: (v: BudgetForm) => editing ? updateBudget(editing.id, { allocatedAmount: v.allocatedAmount, category: v.category }) : createBudget(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setOpen(false); },
    onError: (e) => setError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const remove = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const logExpense = useMutation({
    mutationFn: (v: ExpenseForm) => createTransaction({
      type: 'expense',
      category: expenseFor!.category,
      ownership: v.ownership,
      totalAmount: v.totalAmount,
      notes: v.notes || undefined,
      transactedAt: v.transactedAt || undefined,
      splits: [{ userId: user!.id, accountId: v.accountId, amount: v.totalAmount }],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setExpenseFor(null);
      expenseForm.reset({ totalAmount: 0, ownership: 'me', accountId: '' });
    },
    onError: (e) => setExpenseError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const historyTxns = historyFor
    ? allTxns.filter(t => {
        if (t.type !== 'expense') return false;
        if (t.category.toLowerCase() !== historyFor.category.toLowerCase()) return false;
        const d = new Date(t.transactedAt);
        const yearMatch = String(d.getFullYear()) === historyFor.periodYear;
        const monthMatch = historyFor.periodMonth ? String(d.getMonth() + 1) === historyFor.periodMonth : true;
        return yearMatch && monthMatch;
      })
    : [];

  return (
    <div className="content-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground">{months[month - 1]} {year}</p>
        </div>
        <Button size="sm" onClick={openAdd}><PlusIcon />Add budget</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => { const d = new Date(year, month - 2); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }}>← Prev</Button>
        <span className="flex items-center text-sm px-2">{months[month - 1]} {year}</span>
        <Button size="sm" variant="outline" onClick={() => { const d = new Date(year, month); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }}>Next →</Button>
      </div>

      {budgets.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><PieChartIcon className="size-8 mx-auto mb-2 opacity-40" />No budgets for this period</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = parseFloat(b.usedPercentage);
            const over = Number(b.spent) > Number(b.allocatedAmount);
            return (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm capitalize">{b.category}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="outline">{b.ownership}</Badge>
                      {over && <Badge variant="destructive">Over budget</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className={over ? 'text-destructive font-medium' : 'font-medium'}>{fmt(b.spent)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{b.usedPercentage} used</span>
                    <span>of {fmt(b.allocatedAmount)}</span>
                  </div>
                  <p className={`text-xs font-medium ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {over ? `Over by ${fmt(Math.abs(Number(b.remaining)))}` : `${fmt(b.remaining)} remaining`}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="default" onClick={() => { setExpenseFor(b); setExpenseError(''); expenseForm.reset({ totalAmount: 0, ownership: b.ownership as ExpenseForm['ownership'], accountId: '' }); }}>
                      <ReceiptIcon />Log expense
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setHistoryFor(b)}>
                      <HistoryIcon />History
                    </Button>
                    {b.isOwner && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)}><PencilIcon />Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove.mutate(b.id)}><TrashIcon /></Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log expense dialog */}
      <Dialog open={!!expenseFor} onOpenChange={(o) => !o && setExpenseFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log expense — <span className="capitalize">{expenseFor?.category}</span></DialogTitle></DialogHeader>
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit((v) => logExpense.mutate(v))} className="space-y-4">
              <FormField control={expenseForm.control} name="totalAmount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" min="0.01" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={expenseForm.control} name="accountId" render={({ field }) => (
                <FormItem><FormLabel>Deduct from account</FormLabel><FormControl>
                  <Select {...field}>
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={expenseForm.control} name="ownership" render={({ field }) => (
                <FormItem><FormLabel>Owner</FormLabel><FormControl>
                  <Select {...field}>
                    <option value="me">Me</option>
                    <option value="partner">Partner</option>
                    <option value="shared">Shared</option>
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={expenseForm.control} name="transactedAt" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={expenseForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input placeholder="e.g. Meralco bill" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {expenseError && <p className="text-xs text-destructive">{expenseError}</p>}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setExpenseFor(null)}>Cancel</Button>
                <Button type="submit" disabled={logExpense.isPending}>{logExpense.isPending ? 'Saving…' : 'Confirm'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Spending history sheet */}
      <Sheet open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <SheetContent side="right" className="w-80 sm:max-w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="capitalize">{historyFor?.category} — Spending</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {historyTxns.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No spending recorded</p>
            ) : (
              historyTxns.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.isOwner ? 'You' : 'Partner'} · <span className="text-muted-foreground capitalize">{t.ownership}</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(t.transactedAt).toLocaleDateString()}{t.notes && ` · ${t.notes}`}</p>
                  </div>
                  <p className="text-sm font-semibold text-destructive shrink-0">-{fmt(t.totalAmount)}</p>
                </div>
              ))
            )}
          </div>
          {historyTxns.length > 0 && (
            <div className="p-4 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total spent</span>
                <span className="font-semibold text-destructive">{fmt(historyTxns.reduce((s, t) => s + Number(t.totalAmount), 0))}</span>
              </div>
              {historyFor && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-semibold">{fmt(historyFor.allocatedAmount)}</span>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/edit budget dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit budget' : 'Add budget'}</DialogTitle></DialogHeader>
          <Form {...budgetForm}>
            <form onSubmit={budgetForm.handleSubmit((v) => saveBudget.mutate(v))} className="space-y-4">
              <FormField control={budgetForm.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="Groceries" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {!editing && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={budgetForm.control} name="ownership" render={({ field }) => (
                    <FormItem><FormLabel>Owner</FormLabel><FormControl>
                      <Select {...field}>
                        <option value="me">Me</option>
                        <option value="partner">Partner</option>
                        <option value="shared">Shared</option>
                      </Select>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={budgetForm.control} name="periodType" render={({ field }) => (
                    <FormItem><FormLabel>Period</FormLabel><FormControl>
                      <Select {...field}>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </Select>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              )}
              <FormField control={budgetForm.control} name="allocatedAmount" render={({ field }) => (
                <FormItem><FormLabel>Allocated amount</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={saveBudget.isPending}>{saveBudget.isPending ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
