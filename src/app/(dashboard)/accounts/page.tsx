'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, WalletIcon, ArrowUpIcon, ArrowDownIcon, HistoryIcon } from 'lucide-react';
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
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { getAccounts, createAccount, updateAccount, deleteAccount, getTransactions, createTransaction } from '@/lib/queries/dashboard';
import { useAuth } from '@/providers/auth-provider';
import axios from 'axios';

const fmt = (v: string | number) => Number(v).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['bank', 'ewallet', 'cash']),
  ownership: z.enum(['me', 'partner', 'shared']),
  openingBalance: z.coerce.number().min(0),
  currency: z.string().default('PHP'),
});

const incomeSchema = z.object({
  category: z.enum(['salary', 'freelance', 'investment', 'dividend', 'other']),
  totalAmount: z.coerce.number().positive(),
  notes: z.string().optional(),
  transactedAt: z.string().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;
type IncomeForm = z.infer<typeof incomeSchema>;

interface Account { id: string; name: string; type: string; ownership: string; openingBalance: string; currentBalance: string; currency: string; isOwner: boolean; ownerName: string; }
interface Txn { id: string; type: string; category: string; totalAmount: string; notes: string | null; transactedAt: string; isOwner: boolean; }

export default function AccountsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [incomeFor, setIncomeFor] = useState<Account | null>(null);
  const [historyFor, setHistoryFor] = useState<Account | null>(null);
  const [incomeError, setIncomeError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const { data: rawAccounts = [] } = useQuery<Account[]>({ queryKey: ['accounts'], queryFn: getAccounts });
  const accounts = rawAccounts; // all visible — income goes to own accounts only, filtered in form
  const ownAccounts = rawAccounts.filter(a => a.isOwner || a.ownership === 'shared');
  const { data: allTxns = [] } = useQuery<Txn[]>({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });

  const accountForm = useForm<AccountForm>({ resolver: zodResolver(accountSchema), defaultValues: { name: '', type: 'bank', ownership: 'me', openingBalance: 0, currency: 'PHP' } });
  const incomeForm = useForm<IncomeForm>({ resolver: zodResolver(incomeSchema), defaultValues: { category: 'salary', totalAmount: 0 } });

  function openAdd() { accountForm.reset({ name: '', type: 'bank', ownership: 'me', openingBalance: 0, currency: 'PHP' }); setEditing(null); setError(''); setOpen(true); }
  function openEdit(a: Account) { accountForm.reset({ name: a.name, type: a.type as AccountForm['type'], ownership: a.ownership as AccountForm['ownership'], openingBalance: Number(a.openingBalance), currency: a.currency }); setEditing(a); setError(''); setOpen(true); }

  const saveAccount = useMutation({
    mutationFn: (v: AccountForm) => editing ? updateAccount(editing.id, v) : createAccount(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setOpen(false); },
    onError: (e) => setError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setDeleteTarget(null); },
  });

  const addIncome = useMutation({
    mutationFn: (v: IncomeForm) => createTransaction({
      type: 'income',
      category: v.category,
      ownership: 'me',
      totalAmount: v.totalAmount,
      notes: v.notes || undefined,
      transactedAt: v.transactedAt || undefined,
      splits: [{ userId: user!.id, accountId: incomeFor!.id, amount: v.totalAmount }],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setIncomeFor(null);
      incomeForm.reset({ category: 'salary', totalAmount: 0 });
    },
    onError: (e) => setIncomeError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);

  // filter transactions for the selected account (by matching splits — we approximate by checking all txns)
  const historyTxns = historyFor
    ? allTxns.filter(() => true) // all txns visible; ideally filter by accountId but API doesn't expose that in list
    : [];

  return (
    <div className="content-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">Total balance: {fmt(totalBalance)}</p>
        </div>
        <Button size="sm" onClick={openAdd}><PlusIcon />Add account</Button>
      </div>

      {accounts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><WalletIcon className="size-8 mx-auto mb-2 opacity-40" />No accounts yet</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{a.name}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="outline">{a.type}</Badge>
                    <Badge variant="secondary">{a.ownership === 'shared' ? 'shared' : a.ownerName}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-semibold">{fmt(a.currentBalance)}</p>
                <p className="text-xs text-muted-foreground">Opening: {fmt(a.openingBalance)}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(a.isOwner || a.ownership === 'shared') && (
                    <Button size="sm" variant="default" onClick={() => { setIncomeFor(a); setIncomeError(''); incomeForm.reset({ category: 'salary', totalAmount: 0 }); }}>
                      <ArrowUpIcon />Add income
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setHistoryFor(a)}>
                    <HistoryIcon />History
                  </Button>
                  {a.isOwner && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)}><PencilIcon />Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}><TrashIcon /></Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete the account and remove it from all transaction splits."
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />

      <Dialog open={!!incomeFor} onOpenChange={(o) => !o && setIncomeFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add income to {incomeFor?.name}</DialogTitle></DialogHeader>
          <Form {...incomeForm}>
            <form onSubmit={incomeForm.handleSubmit((v) => addIncome.mutate(v))} className="space-y-4">
              <FormField control={incomeForm.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Source</FormLabel><FormControl>
                  <Select {...field}>
                    <option value="salary">Salary</option>
                    <option value="freelance">Freelance</option>
                    <option value="investment">Investment</option>
                    <option value="dividend">Dividend</option>
                    <option value="other">Other</option>
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={incomeForm.control} name="totalAmount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" min="0.01" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={incomeForm.control} name="transactedAt" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={incomeForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input placeholder="e.g. April salary" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {incomeError && <p className="text-xs text-destructive">{incomeError}</p>}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIncomeFor(null)}>Cancel</Button>
                <Button type="submit" disabled={addIncome.isPending}>{addIncome.isPending ? 'Saving…' : 'Confirm'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Transaction history sheet */}
      <Sheet open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <SheetContent side="right" className="w-80 sm:max-w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{historyFor?.name} — History</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {allTxns.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No transactions yet</p>
            ) : (
              allTxns.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b">
                  <div className={`size-7 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                    {t.type === 'income'
                      ? <ArrowUpIcon className="size-3.5 text-green-500" />
                      : <ArrowDownIcon className="size-3.5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{t.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.transactedAt).toLocaleDateString()}{t.notes && ` · ${t.notes}`}</p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.totalAmount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/edit account dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit account' : 'Add account'}</DialogTitle></DialogHeader>
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit((v) => saveAccount.mutate(v))} className="space-y-4">
              <FormField control={accountForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="BDO Savings" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={accountForm.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="bank">Bank</option>
                      <option value="ewallet">E-Wallet</option>
                      <option value="cash">Cash</option>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={accountForm.control} name="ownership" render={({ field }) => (
                  <FormItem><FormLabel>Owner</FormLabel><FormControl>
                    <Select {...field}>
                      <option value="me">Me</option>
                      <option value="partner">Partner</option>
                      <option value="shared">Shared</option>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
              {!editing && (
                <FormField control={accountForm.control} name="openingBalance" render={({ field }) => (
                  <FormItem><FormLabel>Opening balance</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={saveAccount.isPending}>{saveAccount.isPending ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
