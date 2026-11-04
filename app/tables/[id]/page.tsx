'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { StatusBadge } from '@/components/status-badge';
import { TaskRow } from '@/components/task-row';
import { PhotoUploader } from '@/components/photo-uploader';
import { 
  ArrowLeft, 
  User, 
  Factory, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  Truck, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';

export default function TableDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { currentUser } = useUser();

  const [tableData, setTableData] = useState<ReturnType<typeof dataStore.getTableById>>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Dispatch Form State
  const [nagsCount, setNagsCount] = useState<number>(1);
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [packedPhoto, setPackedPhoto] = useState<string>('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);

  const loadData = () => {
    const data = dataStore.getTableById(resolvedParams.id);
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
  }, [resolvedParams.id]);

  if (!tableData) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Table record not found. <Link href="/dashboard" className="text-foreground underline ml-1">Return to dashboard</Link>
      </div>
    );
  }

  const { table, tasks, activity, dispatch, qrToken } = tableData;

  const buildTasks = tasks.filter(t => t.task_type === 'BUILD');
  const completedBuildTasks = buildTasks.filter(t => t.status === 'COMPLETED').length;
  const totalBuildTasks = buildTasks.length;
  const percentComplete = totalBuildTasks > 0 ? Math.round((completedBuildTasks / totalBuildTasks) * 100) : 0;

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
      setActionSuccess('Dispatch successfully recorded! Table completed and QR certificate generated.');
      loadData();
    }
  };

  // Admin QR Revocation / Regeneration
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
      {/* Top Navigation */}
      <div className="flex items-center space-x-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {table.table_code}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium text-foreground px-2 py-0.5 rounded bg-surface border border-border">
              {table.table_type}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            {table.table_name}
          </h1>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-status-red-bg border border-status-red-border text-status-red-text text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-status-green-bg border border-status-green-border text-status-green-text text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 dark:text-green-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Table Info Card */}
      <div className="p-4 sm:p-6 rounded-xl border border-border bg-surface space-y-4">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Reference Photo Thumbnail / Viewer */}
          <div className="relative w-full md:w-56 aspect-video md:aspect-[4/3] rounded-xl overflow-hidden bg-surface-raised border border-border shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={table.reference_photo_path}
              alt={table.table_name}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-background/80 text-foreground backdrop-blur-md border border-border">
              Reference
            </span>
          </div>

          {/* Details & Metadata */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={table.status} size="md" />

              {/* Take Responsibility Button (PRD 3.3) */}
              {!table.lead_supervisor_id && (isSupervisor || isAdmin) && table.status === 'Submitted' && (
                <button
                  type="button"
                  onClick={handleClaimTable}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Take Responsibility (Lead Supervisor)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
              <div>
                <span className="block font-medium text-foreground">Salesperson</span>
                <span>{table.salesperson?.full_name}</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Factory</span>
                <span>{table.factory?.factory_name}</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Lead Supervisor</span>
                <span className={table.lead_supervisor ? 'text-foreground font-medium' : 'italic'}>
                  {table.lead_supervisor ? table.lead_supervisor.full_name : 'Unclaimed'}
                </span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Order Date</span>
                <span>{format(new Date(table.created_at), 'dd MMM yyyy')}</span>
              </div>
              {table.dispatched_at && (
                <div>
                  <span className="block font-medium text-foreground">Dispatched At</span>
                  <span>{format(new Date(table.dispatched_at), 'dd MMM yyyy, HH:mm')}</span>
                </div>
              )}
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Production Progress</span>
                <span className="text-muted-foreground font-medium">
                  {completedBuildTasks} of {totalBuildTasks} build tasks complete ({percentComplete}%)
                </span>
              </div>
              <div className="w-full bg-surface-raised rounded-full h-2 overflow-hidden border border-border/50">
                <div
                  className="bg-foreground h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Certificate Section (Displayed when completed) */}
      {isCompleted && qrToken && qrCodeDataUrl && (
        <div className="p-4 sm:p-5 rounded-xl border border-status-green-border bg-status-green-bg space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <div className="p-2 bg-surface rounded-xl border border-border shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="Table Production QR Code" className="w-24 h-24" />
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-status-green-text">
                  Production Certificate Ready
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  Unique Table QR Code
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scanning opens the public verifiable production history with completion evidence.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/qr/${qrToken}`}
                    target="_blank"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-foreground hover:bg-surface-raised transition-colors"
                  >
                    <span>Open Public Certificate</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={handleRegenerateQr}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-foreground hover:bg-surface-raised"
                        title="Regenerate token"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Regenerate</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeQr}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-status-red-text hover:bg-red-500/10"
                        title="Revoke public access"
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

      {/* Production Checklist Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Production Checklist
            </h2>
            <p className="text-xs text-muted-foreground">
              Step-by-step tasks. Each requires mandatory photo evidence upon completion.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              leadSupervisorId={table.lead_supervisor_id}
              factoryId={table.factory_id}
              isCompletedTable={isCompleted}
              onUpdate={loadData}
            />
          ))}
        </div>
      </div>

      {/* Mandatory Final Dispatch Form (PRD Section 4 & Section 9 Master Build Prompt) */}
      {/* Appears when table is Ready for Dispatch or when completing the dispatch task */}
      {(isReadyForDispatch || (!isCompleted && dispatchTask?.status === 'NOT_STARTED')) && (isSupervisor || isAdmin) && (
        <div className="p-4 sm:p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-4">
          <div className="border-b border-divider pb-2">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-foreground">
                Final Checkpoint: Dispatch & Packing Form
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production gate: Dispatch cannot proceed until all build tasks are completed with valid photos.
            </p>
          </div>

          <form onSubmit={handleCompleteDispatch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nags Prepared */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Total Nags Prepared <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={nagsCount}
                  onChange={(e) => setNagsCount(parseInt(e.target.value) || 0)}
                  required
                  className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Driver Name */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Driver Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Jaswinder Singh"
                  required
                  className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Driver Phone Number */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Driver Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            {/* Packed Table Photo */}
            <PhotoUploader
              label="Packed & Loaded Truck Photo (Mandatory)"
              required
              onPhotoSelected={setPackedPhoto}
            />

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingDispatch || !packedPhoto}
                className="min-h-[44px] px-6 py-2.5 rounded-lg bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>{isSubmittingDispatch ? 'Verifying & Dispatching...' : 'Complete Dispatch & Release Table'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Production Activity Audit Trail */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-4">
        <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-divider pb-2">
          Production Activity History
        </h2>

        <div className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No activity recorded yet.</p>
          ) : (
            activity.map((act) => (
              <div key={act.id} className="flex items-start space-x-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-foreground shrink-0 mt-1.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {act.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(act.created_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    by <span className="font-medium text-foreground">{act.actor?.full_name || 'System'}</span>
                    {act.previous_value && act.new_value && (
                      <span className="ml-1">
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
    </div>
  );
}
