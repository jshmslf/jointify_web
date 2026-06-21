'use client';

import { useState, useEffect } from 'react';
import { BellIcon, CheckIcon, CheckCheckIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/queries/dashboard';

interface Notification {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export default function NotificationsPanel() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Notification | null>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Jointify` : 'Jointify';
  }, [unreadCount]);

  function handleClick(n: Notification) {
    setSelected(n);
    if (n.status === 'unread') markRead.mutate(n.id);
  }

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-80 sm:max-w-80 flex flex-col gap-0 p-0">
          <SheetHeader className="p-4 border-b flex-row items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} className="gap-1 text-xs">
                <CheckCheckIcon className="size-3.5" />
                Mark all read
              </Button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{n.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {typeof n.payload?.message === 'string' ? n.payload.message : JSON.stringify(n.payload)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {n.status === 'unread' && (
                    <span className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                  )}
                  {n.status === 'read' && (
                    <CheckIcon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{selected?.type.replace(/_/g, ' ')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{selected?.status}</Badge>
            <p>
              {typeof selected?.payload?.message === 'string'
                ? selected.payload.message
                : JSON.stringify(selected?.payload)}
            </p>
            <p className="text-xs text-muted-foreground">
              {selected && new Date(selected.createdAt).toLocaleString()}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
