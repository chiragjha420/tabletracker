'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { TableCard } from '@/components/table-card';
import { TableOrder } from '@/types';
import { Plus, Search } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser } = useUser();
  const [tables, setTables] = useState<TableOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadTables = () => {
    let filterStatus = statusFilter;
    if (statusFilter === 'Unclaimed') filterStatus = 'Submitted';

    const list = dataStore.getTables({
      status: filterStatus === 'All' ? undefined : filterStatus,
      search: searchQuery,
      currentRole: currentUser.role,
      currentUserId: currentUser.id,
    });
    setTables(list);
  };

  useEffect(() => {
    loadTables();
    const unsub = dataStore.subscribe(() => {
      loadTables();
      setRefreshKey(k => k + 1);
    });
    return unsub;
  }, [currentUser, statusFilter, searchQuery]);

  const allPermitted = dataStore.getTables({
    currentRole: currentUser.role,
    currentUserId: currentUser.id,
  });

  const activeCount = allPermitted.filter(t => t.status === 'In Progress' || t.status === 'Submitted').length;
  const readyCount = allPermitted.filter(t => t.status === 'Ready for Dispatch').length;
  const completedCount = allPermitted.filter(t => t.status === 'Completed / Dispatched').length;
  const attentionCount = allPermitted.filter(t => t.status === 'Needs Attention').length;

  const statusOptions = [
    { label: 'All Tables', value: 'All', count: allPermitted.length },
    { label: 'In Progress', value: 'In Progress', count: activeCount },
    { label: 'Needs Attention', value: 'Needs Attention', count: attentionCount },
    { label: 'Ready for Dispatch', value: 'Ready for Dispatch', count: readyCount },
    { label: 'Completed', value: 'Completed / Dispatched', count: completedCount },
  ];

  const canCreateTable = currentUser.role === 'ADMIN' || currentUser.role === 'SALES';

  if (!mounted) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-44 rounded-xl bg-surface-raised" />
          <div className="h-8 w-28 rounded-xl bg-surface-raised" />
        </div>
        <div className="h-10 w-full rounded-xl bg-surface" />
        <div className="flex space-x-2">
          <div className="h-8 w-24 rounded-full bg-surface" />
          <div className="h-8 w-24 rounded-full bg-surface" />
          <div className="h-8 w-24 rounded-full bg-surface" />
        </div>
        <div className="space-y-3">
          <div className="h-32 rounded-2xl bg-surface border border-border" />
          <div className="h-32 rounded-2xl bg-surface border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Factory Tables
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-raised text-muted-foreground font-semibold border border-border">
            {allPermitted.length}
          </span>
        </div>

        {canCreateTable && (
          <Link
            href="/create"
            className="inline-flex items-center space-x-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Create Table</span>
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by table name, code (e.g. JBB-2026-001) or type..."
          className="w-full pl-10 pr-4 py-2.5 min-h-[42px] text-xs sm:text-sm rounded-xl bg-surface text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 transition-colors"
        />
      </div>

      {/* Apple-style Filter Capsules */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
              statusFilter === opt.value
                ? 'bg-foreground text-background font-semibold'
                : 'bg-surface text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <span>{opt.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              statusFilter === opt.value 
                ? 'bg-background/20 text-background' 
                : 'bg-surface-raised text-muted'
            }`}>
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tables List with Expandable Checklists */}
      <div className="space-y-3">
        {tables.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-surface border border-border">
            <p className="text-sm font-medium text-foreground">No tables found</p>
            <p className="text-xs text-muted-foreground mt-1">
              No factory tables match the current filter.
            </p>
          </div>
        ) : (
          tables.map((table, index) => (
            <TableCard 
              key={table.id} 
              table={table} 
              defaultExpanded={index === 0 && tables.length === 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
