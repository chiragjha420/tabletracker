'use client';

import React, { use } from 'react';
import { dataStore } from '@/lib/data/store';
import { CheckCircle2, ShieldCheck, Clock, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PublicQrHistoryPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const data = dataStore.getPublicTableHistory(resolvedParams.token);

  if (!data.found) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl border border-status-red-border bg-status-red-bg text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-status-red-text mx-auto" />
          <h1 className="text-lg font-bold text-foreground">
            Invalid or Revoked Certificate
          </h1>
          <p className="text-xs text-muted-foreground">
            {data.error || 'The QR token does not exist or has been revoked following a production rework.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Official Certificate Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface text-center space-y-3 shadow-sm">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-status-green-bg border border-status-green-border text-status-green-text text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span>Verified Factory Production Certificate</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {data.table_name}
        </h1>

        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{data.table_code}</span>
          <span>•</span>
          <span>{data.table_type}</span>
          <span>•</span>
          <span className="text-status-green-text font-medium">Completed & Dispatched</span>
        </div>

        {data.dispatched_at && (
          <div className="text-xs text-muted-foreground">
            Dispatched on {format(new Date(data.dispatched_at), 'dd MMMM yyyy, HH:mm')}
          </div>
        )}
      </div>

      {/* Reference & Final Packing Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.reference_photo_path && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden space-y-2 p-3">
            <span className="text-xs font-semibold text-foreground block">
              Reference Design Photo
            </span>
            <div className="aspect-video rounded-lg overflow-hidden bg-surface-raised border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.reference_photo_path}
                alt="Reference Design"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {data.packed_table_photo_path && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden space-y-2 p-3">
            <span className="text-xs font-semibold text-foreground block">
              Final Loaded Truck Photo
            </span>
            <div className="aspect-video rounded-lg overflow-hidden bg-surface-raised border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.packed_table_photo_path}
                alt="Packed & Loaded Table"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Logistics Summary (Strictly excludes driver phone number) */}
      <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-around text-center text-xs">
        <div>
          <span className="text-muted-foreground block">Total Nags Prepared</span>
          <span className="text-base font-bold text-foreground mt-0.5 block">
            {data.nags_count ?? 0}
          </span>
        </div>
        <div className="w-px h-8 bg-divider" />
        <div>
          <span className="text-muted-foreground block">Dispatch Driver</span>
          <span className="text-sm font-semibold text-foreground mt-0.5 block">
            {data.driver_name || 'Designated Driver'}
          </span>
        </div>
      </div>

      {/* Chronological Production Tasks & Evidence */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Step-by-Step Task Completion Evidence
        </h2>

        <div className="space-y-3">
          {data.completed_tasks?.map((task) => (
            <div
              key={task.sequence_number}
              className="p-4 rounded-xl border border-status-green-border bg-status-green-bg/50 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-status-green-text text-background flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    {task.sequence_number}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {task.task_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Completed by {task.completed_by_name}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(new Date(task.completed_at), 'dd MMM yyyy, HH:mm')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-status-green-text flex items-center space-x-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Task Evidence Photos */}
              {task.photos && task.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {task.photos.map((photo, i) => (
                    <div
                      key={i}
                      className="w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden border border-border bg-surface-raised shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`${task.task_name} evidence`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
        JBB TableTracker Production Verification System
      </div>
    </div>
  );
}
