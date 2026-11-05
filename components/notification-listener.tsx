'use client';

import React, { useEffect, useState } from 'react';
import { 
  dispatchNotification, 
  requestNotificationPermission, 
  playChime, 
  triggerVibration 
} from '@/lib/notifications/sound-vibration';
import { dataStore } from '@/lib/data/store';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Bell, CheckCircle2, AlertTriangle, Package, X } from 'lucide-react';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
}

export function NotificationListener() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeToast, setActiveToast] = useState<ToastAlert | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Show Toast Alert with Audio & Haptics
  const triggerLiveAlert = (title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const isAlert = type === 'alert';
    dispatchNotification(title, message, { isAlert });

    const toast: ToastAlert = {
      id: `toast-${Date.now()}`,
      title,
      message,
      type,
    };

    setActiveToast(toast);

    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === toast.id ? null : curr));
    }, 4500);
  };

  // 1. Supabase Realtime Subscription
  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel('tabletracker-live-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_events' },
        (payload) => {
          const newEvent = payload.new as any;
          if (!newEvent) return;

          switch (newEvent.event_type) {
            case 'TABLE_CREATED':
              triggerLiveAlert('New Table Created', 'A new table order was submitted to production.', 'info');
              break;
            case 'TABLE_CLAIMED':
              triggerLiveAlert('Table Claimed', 'A supervisor claimed leadership of a table.', 'info');
              break;
            case 'TASK_STARTED':
              triggerLiveAlert('Task Started', 'A factory task is now in progress.', 'info');
              break;
            case 'TASK_COMPLETED':
              triggerLiveAlert('Task Completed', 'A production task was completed with photo evidence.', 'success');
              break;
            case 'TASK_BLOCKED':
              triggerLiveAlert('Alert: Task Blocked', `Issue reported: ${newEvent.event_metadata?.reason || 'Task needs attention'}`, 'alert');
              break;
            case 'TABLE_DISPATCHED':
              triggerLiveAlert('Table Dispatched', 'Table verified, packed, and dispatched.', 'success');
              break;
            case 'TASK_REOPENED':
              triggerLiveAlert('Task Reopened by Admin', 'A completed task has been reopened for adjustments.', 'alert');
              break;
            default:
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. DataStore Local & Cross-Tab Change Listener
  useEffect(() => {
    let lastTableCount = dataStore.getTables().length;

    const unsub = dataStore.subscribe(() => {
      const currentTables = dataStore.getTables();
      if (currentTables.length > lastTableCount) {
        lastTableCount = currentTables.length;
        triggerLiveAlert('New Table Added', 'A new table order has been added to production.', 'info');
      } else {
        lastTableCount = currentTables.length;
      }
    });

    return unsub;
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      triggerLiveAlert('Notifications Enabled', 'Real-time sound and vibration alerts are now active.', 'success');
    }
  };

  return (
    <>
      {/* Permission Enable Banner (Prompt once if not granted) */}
      {permission === 'default' && !bannerDismissed && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto p-3 rounded-2xl bg-surface-overlay border border-border shadow-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-foreground text-background shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">Enable Real-Time Alerts</div>
              <div className="text-[11px] text-muted-foreground truncate">Get sound & vibration for tasks & dispatches</div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Live Alert Toast (In-App) */}
      {activeToast && (
        <div 
          onClick={() => {
            playChime(activeToast.type === 'alert');
            triggerVibration(activeToast.type === 'alert');
          }}
          className={`fixed top-16 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-xs cursor-pointer animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-xl ${
            activeToast.type === 'alert'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
              : activeToast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : 'bg-surface-overlay/95 border-border text-foreground'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="shrink-0">
              {activeToast.type === 'alert' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : activeToast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Package className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground text-xs leading-tight">{activeToast.title}</div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">{activeToast.message}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveToast(null);
            }}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
