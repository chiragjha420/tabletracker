import React from 'react';
import { TableStatus, TaskStatus } from '@/types';

interface StatusBadgeProps {
  status: TableStatus | TaskStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  let bgClass = 'bg-surface-raised text-foreground border-border';

  switch (status) {
    // Task statuses
    case 'NOT_STARTED':
      bgClass = 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
      break;
    case 'IN_PROGRESS':
      bgClass = 'bg-status-blue-bg text-status-blue-text border-status-blue-border font-medium';
      break;
    case 'COMPLETED':
      bgClass = 'bg-status-green-bg text-status-green-text border-status-green-border font-medium';
      break;
    case 'BLOCKED':
      bgClass = 'bg-status-red-bg text-status-red-text border-status-red-border font-medium';
      break;

    // Table statuses
    case 'Submitted':
      bgClass = 'bg-surface-raised text-muted-foreground border-border';
      break;
    case 'In Progress':
      bgClass = 'bg-status-blue-bg text-status-blue-text border-status-blue-border font-medium';
      break;
    case 'Needs Attention':
      bgClass = 'bg-status-red-bg text-status-red-text border-status-red-border font-medium';
      break;
    case 'Ready for Dispatch':
      bgClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium';
      break;
    case 'Completed / Dispatched':
      bgClass = 'bg-status-green-bg text-status-green-text border-status-green-border font-medium';
      break;
    case 'Archived':
      bgClass = 'bg-surface-raised text-muted-foreground border-border';
      break;
  }

  // Format label text
  const label = status.replace('_', ' ');

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-tight ${sizeClasses} ${bgClass}`}
    >
      {label}
    </span>
  );
}
