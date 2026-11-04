'use client';

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/components/user-context';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, ArrowRight } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useUser();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Notifications
        </h1>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="text-xs font-semibold text-foreground hover:underline flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-surface border border-border">
            <Bell className="w-7 h-7 text-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No alerts</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You are up to date on all factory events.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read_at;
            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-colors ${
                  isUnread
                    ? 'border-blue-500/30 bg-blue-500/[0.04]'
                    : 'border-border bg-surface text-muted-foreground'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-foreground text-background">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="text-[11px] text-muted pt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <Link
                      href={`/tables/${notif.related_table_id}`}
                      onClick={() => markNotificationRead(notif.id)}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-foreground hover:underline"
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
