'use client';

import React, { useState } from 'react';
import { TableOrder, ProductionTask } from '@/types';
import { StatusBadge } from './status-badge';
import { TaskRow } from './task-row';
import { PhotoUploader } from './photo-uploader';
import { dataStore } from '@/lib/data/store';
import { useUser } from './user-context';
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  ExternalLink,
  Maximize2,
  X
} from 'lucide-react';
import Link from 'next/link';

interface TableCardProps {
  table: TableOrder;
  defaultExpanded?: boolean;
}

export function TableCard({ table, defaultExpanded = false }: TableCardProps) {
  const { currentUser } = useUser();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine'>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Dispatch Form State
  const [nagsCount, setNagsCount] = useState<number>(1);
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [packedPhoto, setPackedPhoto] = useState<string>('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const tableData = dataStore.getTableById(table.id);
  const tasks = tableData?.tasks || [];
  const buildTasks = tasks.filter(t => t.task_type === 'BUILD');
  const completedBuildTasks = buildTasks.filter(t => t.status === 'COMPLETED').length;
  const totalBuildTasks = buildTasks.length;
  const percent = totalBuildTasks > 0 ? Math.round((completedBuildTasks / totalBuildTasks) * 100) : 0;

  const myTasksCount = tasks.filter(t => t.assigned_supervisor_id === currentUser.id).length;

  const filteredTasks = taskFilter === 'mine'
    ? tasks.filter(t => t.assigned_supervisor_id === currentUser.id)
    : tasks;

  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAdmin = currentUser.role === 'ADMIN';

  // Atomic Claim handler
  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = dataStore.claimTable(table.id, currentUser.id);
    if (!res.success) {
      alert(res.message);
    }
  };

  // Dispatch completion handler
  const handleCompleteDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchError(null);
    setDispatchSuccess(null);
    setIsSubmittingDispatch(true);

    const res = dataStore.completeDispatch(table.id, currentUser.id, {
      nags_count: Number(nagsCount),
      driver_name: driverName.trim(),
      driver_phone: driverPhone.trim(),
      packed_photo_path: packedPhoto,
    });

    setIsSubmittingDispatch(false);

    if (!res.success) {
      setDispatchError(res.message);
    } else {
      setDispatchSuccess('Dispatch successfully verified and completed.');
    }
  };

  const dispatchTask = tasks.find(t => t.task_type === 'DISPATCH');
  const isReadyForDispatch = table.status === 'Ready for Dispatch';
  const isCompleted = table.status === 'Completed / Dispatched';
  const activeQrToken = tableData?.qrToken;

  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden transition-all duration-200">
      {/* Table Card Header / Overview */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-surface-raised/40 transition-colors"
      >
        <div className="flex items-start space-x-4">
          {/* Reference Photo Thumbnail with Lightbox inspection */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-surface-raised shrink-0 border border-border group"
            title="Click to view full reference design"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={table.reference_photo_path}
              alt={table.table_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Maximize2 className="w-4 h-4" />
            </div>
            <span className="absolute bottom-1 left-1 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/70 text-white backdrop-blur-xs">
              Look
            </span>
          </div>

          {/* Table Meta */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="font-mono text-xs text-muted font-medium">
                {table.table_code}
              </span>
              <span className="text-muted">•</span>
              <span className="text-[11px] font-medium text-foreground px-2 py-0.5 rounded-full bg-surface-raised">
                {table.table_type}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {table.table_name}
            </h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span className={table.lead_supervisor ? 'text-foreground font-medium' : 'italic text-muted'}>
                  {table.lead_supervisor ? table.lead_supervisor.full_name : 'No lead supervisor'}
                </span>
              </span>

              <span>{completedBuildTasks} of {totalBuildTasks} tasks complete ({percent}%)</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-surface-raised rounded-full h-1.5 overflow-hidden mt-1">
              <div 
                className="bg-foreground h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Status & Expand Button */}
        <div className="flex items-center justify-between md:justify-end space-x-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-divider">
          {!table.lead_supervisor_id && (isSupervisor || isAdmin) && table.status === 'Submitted' && (
            <button
              type="button"
              onClick={handleClaim}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Take Responsibility</span>
            </button>
          )}

          <StatusBadge status={table.status} />

          <button
            type="button"
            className="flex items-center space-x-1 text-xs font-medium text-muted-foreground hover:text-foreground p-1 rounded-lg"
          >
            <span>{isExpanded ? 'Hide Tasks' : 'Open Tasks'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Checklist View */}
      {isExpanded && (
        <div className="border-t border-border p-4 sm:p-5 bg-background/50 space-y-4">
          {/* Reference Image Callout: What the final table should look like */}
          <div className="p-3 rounded-2xl bg-surface-raised flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border">
            <div className="flex items-center space-x-3">
              <div 
                onClick={() => setLightboxOpen(true)}
                className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 cursor-pointer border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={table.reference_photo_path}
                  alt={table.table_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Reference Design: Target Finished Look
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  All work must match this reference finish and specifications.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-overlay text-xs font-medium text-foreground transition-colors border border-border flex items-center space-x-1 self-stretch sm:self-auto justify-center"
            >
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Inspect Reference Photo</span>
            </button>
          </div>

          {/* Checklist Task Filter (All vs My Tasks) */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center space-x-1 rounded-xl bg-surface-raised p-1 border border-border text-xs">
              <button
                type="button"
                onClick={() => setTaskFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  taskFilter === 'all'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Tasks ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('mine')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  taskFilter === 'mine'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Tasks ({myTasksCount})
              </button>
            </div>

            <Link
              href={`/tables/${table.id}`}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1 font-medium"
            >
              <span>Full Details & Audit Trail</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Tasks Checklist Rows */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-surface-raised text-xs text-muted-foreground">
                No tasks assigned to you on this table yet. Switch to &quot;All Tasks&quot; to claim or assign tasks.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  leadSupervisorId={table.lead_supervisor_id}
                  factoryId={table.factory_id}
                  isCompletedTable={isCompleted}
                />
              ))
            )}
          </div>

          {/* Final Dispatch Checkpoint Form (When ready or dispatch is not complete) */}
          {(isReadyForDispatch || (!isCompleted && dispatchTask?.status === 'NOT_STARTED')) && (isSupervisor || isAdmin) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-foreground" />
                <h4 className="text-sm font-bold text-foreground">
                  Final Checkpoint: Dispatch & Packing
                </h4>
              </div>

              {dispatchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20">
                  {dispatchError}
                </div>
              )}

              {dispatchSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                  {dispatchSuccess}
                </div>
              )}

              <form onSubmit={handleCompleteDispatch} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Total Nags Prepared <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={nagsCount}
                      onChange={(e) => setNagsCount(parseInt(e.target.value) || 0)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Driver Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="e.g. Jaswinder Singh"
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Driver Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                    />
                  </div>
                </div>

                <PhotoUploader
                  label="Packed Table Photo (Loaded in truck)"
                  required
                  onPhotoSelected={setPackedPhoto}
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingDispatch || !packedPhoto}
                    className="min-h-[44px] px-6 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{isSubmittingDispatch ? 'Verifying...' : 'Complete Dispatch & Release'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* QR Certificate Callout if Dispatched */}
          {isCompleted && activeQrToken && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Table Dispatched — QR Verification Certificate Generated</span>
              </div>
              <Link
                href={`/qr/${activeQrToken}`}
                target="_blank"
                className="min-h-[38px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center space-x-1 shrink-0 transition-colors"
              >
                <span>View Public Certificate</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* High-Resolution Reference Lightbox Modal */}
      {lightboxOpen && (
        <div 
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-surface-overlay rounded-3xl overflow-hidden border border-border"
          >
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{table.table_name}</h3>
                <span className="text-xs text-muted-foreground">{table.table_type} • Finished Reference Design</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded-full bg-surface-raised text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={table.reference_photo_path}
                alt={table.table_name}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
