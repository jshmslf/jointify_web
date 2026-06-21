'use client';

import { useState } from 'react';
import { UserPlusIcon, ClockIcon, UserCheckIcon, XIcon, CheckIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  sendInvite,
  getSentInvitation,
  getIncomingInvitations,
  respondToInvitation,
  cancelInvitation,
} from '@/lib/queries/dashboard';
import axios from 'axios';

interface SentInvite {
  token: string;
  to: { username: string; givenName: string; surname: string };
  expiresAt: string;
}

interface IncomingInvite {
  token: string;
  from: { username: string; givenName: string; surname: string };
  expiresAt: string;
}

export default function PartnerInviteCard() {
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  const { data: sent, isLoading: sentLoading } = useQuery<SentInvite | null>({
    queryKey: ['couple-sent'],
    queryFn: getSentInvitation,
    refetchInterval: 15000,
  });

  const { data: incoming = [] } = useQuery<IncomingInvite[]>({
    queryKey: ['couple-incoming'],
    queryFn: getIncomingInvitations,
    refetchInterval: 15000,
  });

  const invite = useMutation({
    mutationFn: () => sendInvite(identifier),
    onSuccess: () => {
      setIdentifier('');
      setError('');
      qc.invalidateQueries({ queryKey: ['couple-sent'] });
    },
    onError: (err) => {
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Failed to send invite') : 'Failed to send invite');
    },
  });

  const cancel = useMutation({
    mutationFn: (token: string) => cancelInvitation(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple-sent'] }),
  });

  const respond = useMutation({
    mutationFn: ({ token, action }: { token: string; action: 'accept' | 'decline' }) =>
      respondToInvitation(token, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-incoming'] });
      qc.invalidateQueries({ queryKey: ['couple'] });
    },
  });

  if (sentLoading) return null;

  return (
    <div className="space-y-3">
      {/* Incoming invitations */}
      {incoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCheckIcon className="size-4" />
              Pairing requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incoming.map((inv) => (
              <div key={inv.token} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{inv.from.givenName} {inv.from.surname}</p>
                  <p className="text-xs text-muted-foreground">@{inv.from.username}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => respond.mutate({ token: inv.token, action: 'accept' })}
                    disabled={respond.isPending}
                  >
                    <CheckIcon className="size-3.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond.mutate({ token: inv.token, action: 'decline' })}
                    disabled={respond.isPending}
                  >
                    <XIcon className="size-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending sent invite */}
      {sent ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <ClockIcon className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Invitation pending</p>
              <p className="text-xs text-muted-foreground">
                Sent to <span className="font-medium">@{sent.to.username}</span> · waiting for response
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">Pending</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancel.mutate(sent.token)}
              disabled={cancel.isPending}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <XIcon className="size-3.5" />
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Send invite form */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlusIcon className="size-4" />
              Find your partner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Enter your partner&apos;s email or username.</p>
            <div className="flex gap-2">
              <Input
                placeholder="email or @username"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && identifier && invite.mutate()}
              />
              <Button onClick={() => invite.mutate()} disabled={!identifier || invite.isPending} size="sm">
                {invite.isPending ? 'Sending…' : 'Invite'}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
