'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { StatusBadge } from '@/components/status-badge';
import { TaskRow } from '@/components/task-row';
import { PhotoUploader } from '@/components/photo-uploader';
import { 
  ArrowLeft, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  Ban,
  Maximize2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';

export default function TableDetailsPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const { currentUser } = useUser();

  const [tableData, setTableData] = useState<ReturnType<typeof dataStore.getTableById>>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine'>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Dispatch Form State
  const [nagsCount, setNagsCount] = useState<number>(1);
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [packedPhoto, setPackedPhoto] = useState<string>('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);

  const loadData = () => {
    if (!id) return;
    const data = dataStore.getTableById(id);
    setTableData(data);

    if (data?.qrToken) {
      const publicUrl = `${window.location.origin}/qr/${data.qrToken}`;
      QRCode.toDataURL(publicUrl, { width: 256, margin: 2 }, (err, url) => {
        if (!err) setQrCodeDataUrl(url);
      });
    } else {
      setQrCodeDataUrl(null);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dataStore.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [id]);

  if (!tableData) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        Table record not found. <Link href="/dashboard" className="text-foreground underline ml-1">Return to tables</Link>
      </div>
    );
  }

  const { table, tasks, activity, dispatch, qrToken } = tableData;

  const buildTasks = tasks.filter(t => t.task_type === 'BUILD');
  const completedBuildTasks = buildTasks.filter(t => t.status === 'COMPLETED').length;
  const totalBuildTasks = buildTasks.length;
  const percentComplete = totalBuildTasks > 0 ? Math.round((completedBuildTasks / totalBuildTasks) * 100) : 0;

  const myTasksCount = tasks.filter(t => t.assigned_supervisor_id === currentUser.id).length;

  const filteredTasks = taskFilter === 'mine'
    ? tasks.filter(t => t.assigned_supervisor_id === currentUser.id)
    : tasks;

  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAdmin = currentUser.role === 'ADMIN';

  // Atomic Claim handler
  const handleClaimTable = () => {
    setActionError(null);
    setActionSuccess(null);
    const res = dataStore.claimTable(table.id, currentUser.id);
    if (!res.success) {
      setActionError(res.message);
    } else {
      setActionSuccess('You have successfully claimed responsibility as Lead Supervisor.');
      loadData();
    }
  };

  // Dispatch completion handler
  const handleCompleteDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setIsSubmittingDispatch(true);

    const res = dataStore.completeDispatch(table.id, currentUser.id, {
      nags_count: Number(nagsCount),
      driver_name: driverName.trim(),
      driver_phone: driverPhone.trim(),
      packed_photo_path: packedPhoto,
    });

    setIsSubmittingDispatch(false);

    if (!res.success) {
      setActionError(res.message);
    } else {
      setActionSuccess('Dispatch successfully recorded. Unique QR certificate generated.');
      loadData();
    }
  };

  const handleRevokeQr = () => {
    setActionError(null);
    const ok = dataStore.revokeQr(table.id, currentUser.id);
    if (ok) {
      setActionSuccess('Public QR access token revoked.');
      loadData();
    }
  };

  const handleRegenerateQr = () => {
    setActionError(null);
    const newToken = dataStore.regenerateQr(table.id, currentUser.id);
    if (newToken) {
      setActionSuccess('New QR token generated successfully.');
      loadData();
    }
  };

  const dispatchTask = tasks.find(t => t.task_type === 'DISPATCH');
  const isReadyForDispatch = table.status === 'Ready for Dispatch';
  const isCompleted = table.status === 'Completed / Dispatched';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-surface hover:bg-surface-raised text-foreground transition-colors border border-border"
          aria-label="Back to tables"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-muted font-medium">
              {table.table_code}
            </span>
            <span className="text-muted">•</span>
            <span className="text-[11px] font-medium text-foreground px-2 py-0.5 rounded-full bg-surface-raised">
              {table.table_type}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            {table.table_name}
          </h1>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 text-xs flex items-center space-x-2 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Table Info Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Reference Photo Box with Lightbox */}
          <div 
            onClick={() => setLightboxOpen(true)}
            className="relative w-full md:w-56 aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden bg-black shrink-0 border border-border cursor-pointer group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={table.reference_photo_path}
              alt={table.table_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Maximize2 className="w-5 h-5" />
            </div>
            <span className="absolute bottom-2 left-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-xs">
              Finished Look
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={table.status} size="md" />

              {!table.lead_supervisor_id && (isSupervisor || isAdmin) && table.status === 'Submitted' && (
                <button
                  type="button"
                  onClick={handleClaimTable}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Take Responsibility (Lead)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
              <div>
                <span className="block font-medium text-foreground">Salesperson</span>
                <span>{table.salesperson?.full_name}</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Lead Supervisor</span>
                <span className={table.lead_supervisor ? 'text-foreground font-medium' : 'italic text-muted'}>
                  {table.lead_supervisor ? table.lead_supervisor.full_name : 'Unclaimed'}
                </span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Created</span>
                <span>{format(new Date(table.created_at), 'dd MMM yyyy')}</span>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Production Progress</span>
                <span className="text-muted-foreground font-medium">
                  {completedBuildTasks} of {totalBuildTasks} tasks complete ({percentComplete}%)
                </span>
              </div>
              <div className="w-full bg-surface-raised rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-foreground h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Certificate Box */}
      {isCompleted && qrToken && qrCodeDataUrl && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white rounded-xl shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="Table QR Code" className="w-20 h-20" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Production Certificate Ready
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unique QR certificate generated for this completed table.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/qr/${qrToken}`}
                    target="_blank"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                  >
                    <span>Open Certificate</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={handleRegenerateQr}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-overlay border border-border text-xs font-medium text-foreground transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Regenerate</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeQr}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-rose-500/10 border border-border text-xs font-medium text-rose-400 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Tasks Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Production Tasks
          </h2>

          {/* Task Filter (All vs My Tasks) */}
          <div className="flex items-center space-x-1 rounded-xl bg-surface p-1 border border-border text-xs">
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
        </div>

        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-surface border border-border text-xs text-muted-foreground">
              No tasks currently assigned to you on this table.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                leadSupervisorId={table.lead_supervisor_id}
                factoryId={table.factory_id}
                isCompletedTable={isCompleted}
                onUpdate={loadData}
              />
            ))
          )}
        </div>
      </div>

      {/* Dispatch Checkpoint Form */}
      {(isReadyForDispatch || (!isCompleted && dispatchTask?.status === 'NOT_STARTED')) && (isSupervisor || isAdmin) && (
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-foreground" />
            <h3 className="text-sm font-bold text-foreground">
              Final Checkpoint: Dispatch & Packing Form
            </h3>
          </div>

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
              label="Packed & Loaded Truck Photo (Mandatory)"
              required
              onPhotoSelected={setPackedPhoto}
            />

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmittingDispatch || !packedPhoto}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>{isSubmittingDispatch ? 'Verifying...' : 'Complete Dispatch & Release Table'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Production Activity History */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Production Activity Trail
        </h3>

        <div className="space-y-2.5 text-xs">
          {activity.length === 0 ? (
            <p className="text-muted-foreground italic">No activity recorded yet.</p>
          ) : (
            activity.map((act) => (
              <div key={act.id} className="flex items-start space-x-3 text-xs py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0 mt-2" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {act.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(act.created_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    by <span className="font-medium text-foreground">{act.actor?.full_name || 'System'}</span>
                    {act.previous_value && act.new_value && (
                      <span className="ml-1 text-[11px] text-muted">
                        ({act.previous_value} → {act.new_value})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox Modal for Reference Design Inspection */}
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
