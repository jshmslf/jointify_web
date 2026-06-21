'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, CreditCardIcon, BanknoteIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getDebts, createDebt, updateDebt, deleteDebt } from '@/lib/queries/dashboard';
import QuickTransactDialog, { type QuickTransactMode } from '@/components/dashboard/quick-transact-dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import axios from 'axios';

const fmt = (v: string | number) => Number(v).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['loan', 'credit_card', 'personal']),
  ownership: z.enum(['me', 'partner', 'shared']),
  principal: z.coerce.number().positive(),
  remainingBalance: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(0).optional(),
  minimumPayment: z.coerce.number().positive().optional(),
  dueDate: z.string().optional(),
});
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  interestRate: z.coerce.number().min(0).optional(),
  minimumPayment: z.coerce.number().positive().optional(),
  remainingBalance: z.coerce.number().min(0).optional(),
  dueDate: z.string().optional(),
  status: z.enum(['active', 'paid_off']).optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;

interface Debt { id: string; name: string; type: string; ownership: string; principal: string; remainingBalance: string; interestRate: string | null; minimumPayment: string | null; dueDate: string | null; status: string; isOwner: boolean; }

export default function DebtsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [error, setError] = useState('');
  const [quickMode, setQuickMode] = useState<QuickTransactMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);

  const { data: debts = [] } = useQuery<Debt[]>({ queryKey: ['debts'], queryFn: getDebts });

  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { name: '', type: 'loan', ownership: 'me', principal: 0, remainingBalance: 0, interestRate: undefined, minimumPayment: undefined, dueDate: '' } });
  const updateForm = useForm<UpdateValues>({ resolver: zodResolver(updateSchema), defaultValues: { name: '', remainingBalance: 0, interestRate: undefined, minimumPayment: undefined, dueDate: '', status: 'active' } });

  function openAdd() { createForm.reset({ name: '', type: 'loan', ownership: 'me', principal: 0, remainingBalance: 0 }); setEditing(null); setError(''); setOpen(true); }
  function openEdit(d: Debt) {
    updateForm.reset({ name: d.name, remainingBalance: Number(d.remainingBalance), interestRate: d.interestRate ? Number(d.interestRate) : undefined, minimumPayment: d.minimumPayment ? Number(d.minimumPayment) : undefined, dueDate: d.dueDate ?? '', status: d.status as UpdateValues['status'] });
    setEditing(d); setError(''); setOpen(true);
  }

  const save = useMutation({
    mutationFn: (v: CreateValues | UpdateValues) => editing ? updateDebt(editing.id, v) : createDebt(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); setOpen(false); },
    onError: (e) => setError(axios.isAxiosError(e) ? e.response?.data?.error : 'Failed'),
  });

  const remove = useMutation({
    mutationFn: deleteDebt,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); setDeleteTarget(null); },
  });

  const active = debts.filter(d => d.status === 'active');
  const totalDebt = active.reduce((s, d) => s + Number(d.remainingBalance), 0);
  const form = editing ? updateForm : createForm;

  return (
    <div className="content-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Debts</h1>
          <p className="text-sm text-muted-foreground">{active.length} active · Total: {fmt(totalDebt)}</p>
        </div>
        <Button size="sm" onClick={openAdd}><PlusIcon />Add debt</Button>
      </div>

      {debts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><CreditCardIcon className="size-8 mx-auto mb-2 opacity-40" />No debts recorded</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debts.map((d) => {
            const pct = Number(d.principal) > 0 ? ((1 - Number(d.remainingBalance) / Number(d.principal)) * 100) : 0;
            return (
              <Card key={d.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{d.name}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="outline">{d.type.replace('_', ' ')}</Badge>
                      <Badge variant={d.status === 'paid_off' ? 'secondary' : 'destructive'}>{d.status === 'paid_off' ? 'Paid off' : 'Active'}</Badge>
                    </div>
                  </div>
                  <CardDescription>{d.ownership}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-medium">{fmt(d.remainingBalance)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct.toFixed(1)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pct.toFixed(0)}% paid</span>
                    <span>of {fmt(d.principal)}</span>
                  </div>
                  {d.interestRate && <p className="text-xs text-muted-foreground">Interest: {d.interestRate}%</p>}
                  {d.minimumPayment && <p className="text-xs text-muted-foreground">Min. payment: {fmt(d.minimumPayment)}</p>}
                  {d.dueDate && <p className="text-xs text-muted-foreground">Due: {new Date(d.dueDate).toLocaleDateString()}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {d.status === 'active' && (
                      <Button size="sm" variant="default" onClick={() => setQuickMode({ type: 'debt_repayment', debtId: d.id, debtName: d.name, minimumPayment: d.minimumPayment ? Number(d.minimumPayment) : undefined })}>
                        <BanknoteIcon />Pay
                      </Button>
                    )}
                    {d.isOwner && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}><PencilIcon />Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(d)}><TrashIcon />Delete</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <QuickTransactDialog mode={quickMode} onClose={() => setQuickMode(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['debts'] })} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete this debt record."
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={remove.isPending}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit debt' : 'Add debt'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v as CreateValues & UpdateValues))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Car loan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {!editing && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="type" render={({ field }) => (
                      <FormItem><FormLabel>Type</FormLabel><FormControl>
                        <Select {...field}>
                          <option value="loan">Loan</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="personal">Personal</option>
                        </Select>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createForm.control} name="ownership" render={({ field }) => (
                      <FormItem><FormLabel>Owner</FormLabel><FormControl>
                        <Select {...field}>
                          <option value="me">Me</option>
                          <option value="partner">Partner</option>
                          <option value="shared">Shared</option>
                        </Select>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="principal" render={({ field }) => (
                      <FormItem><FormLabel>Principal</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createForm.control} name="remainingBalance" render={({ field }) => (
                      <FormItem><FormLabel>Remaining</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </>
              )}
              {editing && (
                <>
                  <FormField control={updateForm.control} name="remainingBalance" render={({ field }) => (
                    <FormItem><FormLabel>Remaining balance</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={updateForm.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel><FormControl>
                      <Select {...field}>
                        <option value="active">Active</option>
                        <option value="paid_off">Paid off</option>
                      </Select>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="interestRate" render={({ field }) => (
                  <FormItem><FormLabel>Interest rate %</FormLabel><FormControl><Input type="number" step="0.01" min="0" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="minimumPayment" render={({ field }) => (
                  <FormItem><FormLabel>Min. payment</FormLabel><FormControl><Input type="number" step="0.01" min="0" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Due date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
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
