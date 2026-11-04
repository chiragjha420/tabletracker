'use client';

import React from 'react';
import Link from 'next/link';
import { TableOrder } from '@/types';
import { StatusBadge } from './status-badge';
import { formatDistanceToNow } from 'date-fns';
import { User, Factory, CheckSquare } from 'lucide-react';
import { dataStore } from '@/lib/data/store';

interface TableRowProps {
  table: TableOrder;
}

export function TableRow({ table }: TableRowProps) {
  // Calculate build tasks progress
  const tasks = dataStore.getTableById(table.id)?.tasks || [];
  const buildTasks = tasks.filter(t => t.task_type === 'BUILD');
  const completedBuildTasks = buildTasks.filter(t => t.status === 'COMPLETED').length;
  const totalBuildTasks = buildTasks.length;
  const percent = totalBuildTasks > 0 ? Math.round((completedBuildTasks / totalBuildTasks) * 100) : 0;

  return (
    <Link
      href={`/tables/${table.id}`}
      className="block p-4 rounded-xl border border-border bg-surface hover:bg-surface-raised transition-all duration-200 select-none group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Thumbnail & Main Info */}
        <div className="flex items-start space-x-3.5">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-raised border border-border shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={table.reference_photo_path}
              alt={table.table_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-mono font-medium text-muted-foreground">
                {table.table_code}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-medium text-foreground px-2 py-0.5 rounded bg-surface-raised border border-border">
                {table.table_type}
              </span>
            </div>

            <h3 className="font-semibold text-foreground text-sm sm:text-base tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {table.table_name}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
              <span className="flex items-center space-x-1">
                <Factory className="w-3.5 h-3.5" />
                <span>{table.factory?.factory_name || 'Main Factory'}</span>
              </span>

              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span>
                  {table.lead_supervisor ? (
                    <span className="text-foreground font-medium">{table.lead_supervisor.full_name}</span>
                  ) : (
                    <span className="italic">Unclaimed</span>
                  )}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Progress & Status */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0 shrink-0 gap-2">
          <StatusBadge status={table.status} />

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground">
              {completedBuildTasks}/{totalBuildTasks} tasks
            </span>
            <span className="text-[11px] text-muted-foreground">({percent}%)</span>
          </div>

          <div className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(table.updated_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    </Link>
  );
}
