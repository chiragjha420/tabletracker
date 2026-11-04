import React from 'react';
import { TableStatus, TaskStatus } from '@/types';

interface StatusBadgeProps {
  status: TableStatus | TaskStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  let badgeStyle = 'bg-neutral-500/10 text-neutral-400';

  switch (status) {
    // Task statuses
    case 'NOT_STARTED':
      badgeStyle = 'bg-neutral-500/15 text-neutral-400 dark:text-neutral-300';
      break;
    case 'IN_PROGRESS':
      badgeStyle = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium';
      break;
    case 'COMPLETED':
      badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium';
      break;
    case 'BLOCKED':
      badgeStyle = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-medium';
      break;

    // Table statuses
    case 'Submitted':
      badgeStyle = 'bg-neutral-500/15 text-neutral-500 dark:text-neutral-400';
      break;
    case 'In Progress':
      badgeStyle = 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium';
      break;
    case 'Needs Attention':
      badgeStyle = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-medium';
      break;
    case 'Ready for Dispatch':
      badgeStyle = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium';
      break;
    case 'Completed / Dispatched':
      badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium';
      break;
    case 'Archived':
      badgeStyle = 'bg-neutral-500/15 text-neutral-500';
      break;
  }

  const label = status.replace(/_/g, ' ');
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-tight shrink-0 select-none ${sizeClasses} ${badgeStyle}`}
    >
      {label}
    </span>
  );
}
