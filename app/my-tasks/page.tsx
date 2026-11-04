'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { TaskRow } from '@/components/task-row';
import { ProductionTask } from '@/types';
import { ArrowRight, Filter } from 'lucide-react';

export default function MyTasksPage() {
  const { currentUser } = useUser();
  const [filter, setFilter] = useState('All Active');
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [, setRefreshKey] = useState(0);

  const loadTasks = () => {
    const list = dataStore.getSupervisorTasks(currentUser.id, filter);
    setTasks(list);
  };

  useEffect(() => {
    loadTasks();
    const unsub = dataStore.subscribe(() => {
      loadTasks();
      setRefreshKey(k => k + 1);
    });
    return unsub;
  }, [currentUser.id, filter]);

  // Summary Metrics as inline values (PRD: "No oversized cards, simple inline metrics")
  const allSupervisorTasks = dataStore.getSupervisorTasks(currentUser.id, 'All Active');
  const activeCount = allSupervisorTasks.length;
  const inProgressCount = allSupervisorTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const blockedCount = allSupervisorTasks.filter(t => t.status === 'BLOCKED').length;

  const filters = ['All Active', 'Not Started', 'In Progress', 'Blocked', 'Completed'];

  return (
    <div className="space-y-6">
      {/* Header and Inline Metrics */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              My Production Tasks
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigned tasks for {currentUser.full_name}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-foreground hover:text-muted-foreground transition-colors self-start sm:self-auto px-3 py-2 rounded-lg border border-border bg-surface"
          >
            <span>View All Factory Tables</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Compact Summary Metrics Bar (Apple-restrained inline style) */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-surface">
          <div>
            <div className="text-xs text-muted-foreground font-medium">My Active Tasks</div>
            <div className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {activeCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">In Progress</div>
            <div className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 mt-0.5">
              {inProgressCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Needs Attention</div>
            <div className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400 mt-0.5">
              {blockedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-foreground text-background'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface">
            <p className="text-sm font-medium text-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'All Active' 
                ? 'You currently have no active assigned tasks. Check All Tables to claim responsibility or assign tasks.' 
                : `No tasks match the filter "${filter}".`}
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const parentTable = dataStore.getTableById(task.table_id)?.table;
            return (
              <div key={task.id} className="space-y-1">
                {parentTable && (
                  <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                    <Link
                      href={`/tables/${parentTable.id}`}
                      className="font-medium text-foreground hover:underline flex items-center space-x-1"
                    >
                      <span>{parentTable.table_name}</span>
                      <span className="text-muted-foreground font-mono">({parentTable.table_code})</span>
                    </Link>
                    <span>{parentTable.factory?.factory_name}</span>
                  </div>
                )}
                <TaskRow
                  task={task}
                  leadSupervisorId={parentTable?.lead_supervisor_id}
                  factoryId={parentTable?.factory_id}
                  onUpdate={loadTasks}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
