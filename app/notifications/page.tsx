'use client';

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/components/user-context';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, ArrowRight } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useUser();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational alerts, assignments, and production updates
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="text-xs font-medium text-foreground hover:underline flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are completely caught up on all factory alerts.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read_at;
            return (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isUnread
                    ? 'border-foreground/30 bg-surface shadow-xs'
                    : 'border-border bg-surface/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-foreground text-background">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="text-[11px] text-muted-foreground pt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <Link
                      href={`/tables/${notif.related_table_id}`}
                      onClick={() => markNotificationRead(notif.id)}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-foreground hover:underline"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
