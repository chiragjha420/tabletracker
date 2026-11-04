'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { TableRow } from '@/components/table-row';
import { TableOrder } from '@/types';
import { Plus, Search, Filter } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser } = useUser();
  const [tables, setTables] = useState<TableOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [factoryFilter, setFactoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setRefreshKey] = useState(0);

  const loadTables = () => {
    let filterStatus = statusFilter;
    if (statusFilter === 'Unclaimed') filterStatus = 'Submitted';

    const list = dataStore.getTables({
      status: filterStatus === 'All' ? undefined : filterStatus,
      factoryId: factoryFilter === 'All' ? undefined : factoryFilter,
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
  }, [currentUser, statusFilter, factoryFilter, searchQuery]);

  // Global metric counters for authorized tables
  const allPermitted = dataStore.getTables({
    currentRole: currentUser.role,
    currentUserId: currentUser.id,
  });

  const activeCount = allPermitted.filter(t => t.status === 'In Progress' || t.status === 'Submitted').length;
  const readyCount = allPermitted.filter(t => t.status === 'Ready for Dispatch').length;
  const completedCount = allPermitted.filter(t => t.status === 'Completed / Dispatched').length;
  const attentionCount = allPermitted.filter(t => t.status === 'Needs Attention').length;

  const factories = dataStore.getFactories();

  const statusOptions = [
    { label: 'All Tables', value: 'All' },
    { label: 'Unclaimed', value: 'Submitted' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Ready for Dispatch', value: 'Ready for Dispatch' },
    { label: 'Needs Attention', value: 'Needs Attention' },
    { label: 'Completed', value: 'Completed / Dispatched' },
  ];

  const canCreateTable = currentUser.role === 'ADMIN' || currentUser.role === 'SALES';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Factory Production
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time table orders, task progress, and dispatch control
          </p>
        </div>

        {canCreateTable && (
          <Link
            href="/create"
            className="inline-flex items-center space-x-1.5 min-h-[44px] px-4 py-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity self-start sm:self-auto text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Table</span>
          </Link>
        )}
      </div>

      {/* Summary Metrics Bar (PRD: "Simple inline metrics, not oversized cards") */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-surface">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Active Tables</div>
          <div className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {activeCount}
          </div>
        </div>

        <div>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ready for Dispatch</div>
          <div className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 mt-0.5">
            {readyCount}
          </div>
        </div>

        <div>
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">Needs Attention</div>
          <div className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400 mt-0.5">
            {attentionCount}
          </div>
        </div>

        <div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</div>
          <div className="text-xl font-bold tracking-tight text-green-600 dark:text-green-400 mt-0.5">
            {completedCount}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by table name, code (e.g. JBB-2026-001) or type..."
              className="w-full pl-9 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Factory Dropdown Filter */}
          <select
            value={factoryFilter}
            onChange={(e) => setFactoryFilter(e.target.value)}
            className="min-h-[44px] px-3 py-2 text-xs sm:text-sm rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="All">All Factories</option>
            {factories.map((fac) => (
              <option key={fac.id} value={fac.id}>
                {fac.factory_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === opt.value
                  ? 'bg-foreground text-background'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Order Listing */}
      <div className="space-y-3">
        {tables.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface">
            <p className="text-sm font-medium text-foreground">No production tables found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search criteria or status filter.
            </p>
          </div>
        ) : (
          tables.map((table) => <TableRow key={table.id} table={table} />)
        )}
      </div>
    </div>
  );
}
