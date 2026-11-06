'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { dataStore } from '@/lib/data/store';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CheckCircle2, ShieldCheck, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PublicQrHistoryPage() {
  const params = useParams();
  const token = (params?.token as string) || '';
  const [data, setData] = useState(() => dataStore.getPublicTableHistory(token));
  const [loading, setLoading] = useState(() => !dataStore.getPublicTableHistory(token).found);

  useEffect(() => {
    if (!token) return;

    const localData = dataStore.getPublicTableHistory(token);
    if (localData.found) {
      setData(localData);
      setLoading(false);
      return;
    }

    // Cross-device lookup via Supabase
    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      (async () => {
        try {
          const { data: qrRow } = await supabase
            .from('qr_access')
            .select('table_id, is_active')
            .eq('token_hash', token)
            .single();

          if (qrRow && qrRow.is_active) {
            const { data: tRow } = await supabase
              .from('tables')
              .select('*')
              .eq('id', qrRow.table_id)
              .single();

            const { data: dRow } = await supabase
              .from('dispatch_details')
              .select('*')
              .eq('table_id', qrRow.table_id)
              .single();

            const { data: tasks } = await supabase
              .from('tasks')
              .select('*')
              .eq('table_id', qrRow.table_id)
              .eq('status', 'COMPLETED')
              .order('sequence_number', { ascending: true });

            if (tRow) {
              setData({
                found: true,
                table_code: tRow.table_code,
                table_name: tRow.table_name,
                table_type: tRow.table_type,
                reference_photo_path: tRow.reference_photo_path,
                status: tRow.status,
                dispatched_at: tRow.dispatched_at,
                created_at: tRow.created_at,
                nags_count: dRow?.nags_count,
                driver_name: dRow?.driver_name,
                packed_table_photo_path: dRow?.packed_table_photo_path,
                completed_tasks: (tasks || []).map((tsk: any) => ({
                  sequence_number: tsk.sequence_number,
                  task_name: tsk.task_name,
                  task_type: (tsk.task_type || 'BUILD') as 'BUILD' | 'DISPATCH',
                  completed_at: tsk.completed_at,
                  completed_by_name: 'Factory Supervisor',
                  photos: [],
                })),
              });
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Remote QR certificate lookup error:', err);
        }
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-foreground animate-spin" />
          <span className="text-xs text-muted-foreground">Verifying production certificate...</span>
        </div>
      </div>
    );
  }

  if (!data.found) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
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
      {/* Verified Certificate Header */}
      <div className="p-6 rounded-3xl bg-surface border border-border text-center space-y-3 shadow-xs">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Verified Factory Production Certificate</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {data.table_name}
        </h1>

        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{data.table_code}</span>
          <span>•</span>
          <span>{data.table_type}</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Dispatched</span>
        </div>

        {data.dispatched_at && (
          <div className="text-xs text-muted">
            Dispatched on {format(new Date(data.dispatched_at), 'dd MMMM yyyy, HH:mm')}
          </div>
        )}
      </div>

      {/* Reference & Final Packing Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.reference_photo_path && (
          <div className="rounded-2xl bg-surface p-3.5 space-y-2 border border-border">
            <span className="text-xs font-semibold text-foreground block">
              Reference Design Photo
            </span>
            <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border">
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
          <div className="rounded-2xl bg-surface p-3.5 space-y-2 border border-border">
            <span className="text-xs font-semibold text-foreground block">
              Final Loaded Truck Photo
            </span>
            <div className="aspect-video rounded-xl overflow-hidden bg-black border border-border">
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
      <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-around text-center text-xs">
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
        <h2 className="text-base font-bold tracking-tight text-foreground">
          Step-by-Step Task Completion Evidence
        </h2>

        <div className="space-y-2.5">
          {data.completed_tasks?.map((task) => (
            <div
              key={task.sequence_number}
              className="p-4 rounded-2xl bg-surface border border-border space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
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

                <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Photos */}
              {task.photos && task.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {task.photos.map((photo, i) => (
                    <div
                      key={i}
                      className="w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-border"
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

      <div className="pt-6 border-t border-divider text-center text-xs text-muted">
        JBB TableTracker Production Verification System
      </div>
    </div>
  );
}
