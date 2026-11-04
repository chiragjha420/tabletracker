'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { ActivityEvent, TableOrder } from '@/types';
import { format } from 'date-fns';
import { History, ArrowRight } from 'lucide-react';

export default function ActivityPage() {
  const { currentUser } = useUser();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [tablesMap, setTablesMap] = useState<Record<string, TableOrder>>({});

  useEffect(() => {
    const allTables = dataStore.getTables({
      currentRole: currentUser.role,
      currentUserId: currentUser.id,
    });
    const map: Record<string, TableOrder> = {};
    allTables.forEach(t => {
      map[t.id] = t;
    });
    setTablesMap(map);

    // Aggregate all activity for permitted tables
    const allActivity: ActivityEvent[] = [];
    allTables.forEach(t => {
      const details = dataStore.getTableById(t.id);
      if (details) {
        allActivity.push(...details.activity);
      }
    });

    allActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setEvents(allActivity);
  }, [currentUser]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Production Activity Trail
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Auditable timeline of table claims, task assignments, evidence uploads, and dispatches
        </p>
      </div>

      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-4">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground italic">
            No activity recorded yet in your accessible factories.
          </div>
        ) : (
          <div className="divide-y divide-divider">
            {events.map((act) => {
              const table = tablesMap[act.table_id];
              return (
                <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-foreground">
                        {act.event_type.replace(/_/g, ' ')}
                      </span>
                      {table && (
                        <Link
                          href={`/tables/${table.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          on {table.table_name} ({table.table_code})
                        </Link>
                      )}
                    </div>

                    <div className="text-muted-foreground">
                      Actor: <span className="text-foreground font-medium">{act.actor?.full_name || 'System User'}</span>
                      {act.previous_value && act.new_value && (
                        <span className="ml-1.5 font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-raised border border-border">
                          {act.previous_value} → {act.new_value}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 text-muted-foreground text-[11px]">
                    <span>{format(new Date(act.created_at), 'dd MMM, HH:mm')}</span>
                    {table && (
                      <Link
                        href={`/tables/${table.id}`}
                        className="p-1 rounded hover:bg-surface-raised text-foreground"
                        aria-label="View table"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
