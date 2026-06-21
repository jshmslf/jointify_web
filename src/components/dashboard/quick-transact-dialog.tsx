'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getAccounts, createTransaction } from '@/lib/queries/dashboard';
import { useAuth } from '@/providers/auth-provider';
import axios from 'axios';

const schema = z.object({
  totalAmount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Select an account'),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export type QuickTransactMode =
  | { type: 'goal_contribution'; goalId: string; goalName: string }
  | { type: 'debt_repayment'; debtId: string; debtName: string; minimumPayment?: number }
  | { type: 'bill_payment'; category: string; billName: string };

interface Props {
  mode: QuickTransactMode | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickTransactDialog({ mode, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: allAccounts = [] } = useQuery<{ id: string; name: string; ownership: string; isOwner: boolean }[]>({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: !!mode,
  });

  // only show accounts the current user can actually deduct from
  const accounts = allAccounts.filter(a => a.isOwner || a.ownership === 'shared');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { totalAmount: 0, accountId: '', notes: '' },
  });

  // Pre-fill amount when mode changes
  useEffect(() => {
    if (!mode) return;
    const prefill = mode.type === 'debt_repayment' && mode.minimumPayment ? mode.minimumPayment : 0;
    form.reset({ totalAmount: prefill, accountId: '', notes: '' });
  }, [mode, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      if (!mode) throw new Error('No mode');
      const base = {
        ownership: 'me' as const,
        totalAmount: v.totalAmount,
        notes: v.notes || undefined,
        splits: [{ userId: user!.id, accountId: v.accountId, amount: v.totalAmount }],
      };
      if (mode.type === 'goal_contribution') {
        return createTransaction({ ...base, type: 'goal_contribution', category: 'goal', goalId: mode.goalId });
      }
      if (mode.type === 'debt_repayment') {
        return createTransaction({ ...base, type: 'debt_repayment', category: 'debt', debtId: mode.debtId });
      }
      // bill_payment
      return createTransaction({ ...base, type: 'expense', category: mode.category });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      onSuccess?.();
      onClose();
    },
  });

  const title = !mode ? '' :
    mode.type === 'goal_contribution' ? `Contribute to "${mode.goalName}"` :
    mode.type === 'debt_repayment'    ? `Pay "${mode.debtName}"` :
    `Mark "${mode.billName}" as paid`;

  const amountLabel = !mode ? 'Amount' :
    mode.type === 'debt_repayment' && mode.minimumPayment
      ? `Amount (min. ₱${mode.minimumPayment.toLocaleString()})`
      : 'Amount';

  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="totalAmount" render={({ field }) => (
              <FormItem>
                <FormLabel>{amountLabel}</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0.01" autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="accountId" render={({ field }) => (
              <FormItem>
                <FormLabel>Deduct from account</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Input placeholder="Add a note…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {save.isError && (
              <p className="text-xs text-destructive">
                {axios.isAxiosError(save.error) ? save.error.response?.data?.error : 'Failed'}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
