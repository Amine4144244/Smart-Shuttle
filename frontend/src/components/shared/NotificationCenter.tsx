import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';
import { Bell, CheckCheck, Trash2, Bus, Clock, AlertTriangle, CheckCircle2, MapPin, XCircle, Info, Loader2 } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const typeIcons: Record<string, any> = {
  TRIP_STARTED: Bus,
  TRIP_ARRIVED: MapPin,
  TRIP_DELAYED: Clock,
  TRIP_CANCELLED: XCircle,
  RESERVATION_CONFIRMATION: CheckCircle2,
  REMINDER: AlertTriangle,
  GENERAL: Info,
};

const typeColors: Record<string, string> = {
  TRIP_STARTED: 'text-primary bg-primary/10 border-primary/20',
  TRIP_ARRIVED: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  TRIP_DELAYED: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  TRIP_CANCELLED: 'text-destructive bg-destructive/10 border-destructive/20',
  RESERVATION_CONFIRMATION: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  REMINDER: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  GENERAL: 'text-muted-foreground bg-secondary border-border/40',
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const socket = useSocket();
  const { user } = useAuthStore();
  const isParticipant = user?.role === 'EMPLOYEE' || user?.role === 'PARTICIPANT';

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ limit: 50 }).then(r => r.data),
    refetchInterval: 30000,
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const unsubscribe = socket.subscribe('user-notifications', 'notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => {
      unsubscribe();
    };
  }, [socket, queryClient]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/80 text-foreground transition-all hover:border-primary/40 hover:bg-card focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl z-50 max-h-[75vh] flex flex-col animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary font-mono">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border/40 scrollbar-thin">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={cn("w-6 h-6 animate-spin", isParticipant ? "text-[#ffac00]" : "text-primary")} />
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No notifications right now</p>
                <p className="text-[11px] text-muted-foreground/70">You're all caught up!</p>
              </div>
            )}
            {notifications.map((n: any) => {
              const Icon = typeIcons[n.type] || Bell;
              const colorClass = typeColors[n.type] || 'text-muted-foreground bg-secondary border-border/40';
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/40',
                    !n.read ? 'bg-primary/5 dark:bg-primary/10' : ''
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-semibold text-foreground leading-tight', !n.read ? 'text-foreground' : 'text-foreground/80')}>
                        {n.title}
                      </p>
                      <div className="flex gap-1 flex-shrink-0">
                        {!n.read && (
                          <button
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-primary transition-colors"
                            title="Mark read"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(n.id)}
                          className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
