'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { PhotoUploader } from '@/components/photo-uploader';
import { TableType } from '@/types';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  AlertCircle, 
  Lock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface ChecklistDraftItem {
  id: string;
  task_name: string;
  remark: string;
}

export default function CreateTablePage() {
  const router = useRouter();
  const { currentUser } = useUser();

  const factories = dataStore.getFactories();
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>(() => factories[0]?.id || '');

  const [tableName, setTableName] = useState('');
  const [tableType, setTableType] = useState<TableType>('Snooker');
  const [referencePhoto, setReferencePhoto] = useState<string>('');

  const [checklist, setChecklist] = useState<ChecklistDraftItem[]>([
    { id: '1', task_name: '', remark: '' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checklist management
  const addRow = () => {
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), task_name: '', remark: '' },
    ]);
  };

  const removeRow = (id: string) => {
    if (checklist.length <= 1) {
      setChecklist([{ id: Date.now().toString(), task_name: '', remark: '' }]);
      return;
    }
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const updateRow = (id: string, field: 'task_name' | 'remark', value: string) => {
    setChecklist(
      checklist.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === checklist.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...checklist];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setChecklist(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tableName.trim()) {
      setError('Please provide a table name.');
      return;
    }

    if (!referencePhoto) {
      setError('A reference photo of the table is required before submitting.');
      return;
    }

    const invalidTasks = checklist.some((t) => !t.task_name.trim());
    if (invalidTasks) {
      setError('All checklist tasks must have a valid task name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTable = dataStore.createTable({
        table_name: tableName.trim(),
        table_type: tableType,
        reference_photo_path: referencePhoto,
        salesperson_id: currentUser.id,
        factory_id: selectedFactoryId || factories[0]?.id || 'fac-default',
        checklist: checklist.map((t) => ({
          task_name: t.task_name.trim(),
          remark: t.remark.trim() || undefined,
        })),
      });

      // Sync table record to Supabase if configured
      const supabase = createClient();
      if (supabase && isSupabaseConfigured()) {
        supabase.from('tables').insert({
          id: newTable.id,
          table_code: newTable.table_code,
          table_name: newTable.table_name,
          table_type: newTable.table_type,
          reference_photo_path: newTable.reference_photo_path,
          salesperson_id: currentUser.id,
          factory_id: (selectedFactoryId && selectedFactoryId.length > 20) ? selectedFactoryId : null,
          status: 'Submitted',
        }).then();
      }

      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create table order.');
      setIsSubmitting(false);
    }
  };

  const tableTypes: TableType[] = ['Pool', 'Snooker', 'Mini Snooker', 'American Pool'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Back button — strictly NO subtitles */}
      <div className="flex items-center space-x-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-surface hover:bg-surface-raised text-foreground transition-colors border border-border"
          aria-label="Back to tables"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Create Table Order
        </h1>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Main Details Card */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
          {/* Reference Photo Uploader */}
          <PhotoUploader
            label="Finished Reference Photo"
            required
            onPhotoSelected={setReferencePhoto}
          />

          {/* Table Name */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Table Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g. Master Tournament Snooker 12ft"
              required
              className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 transition-colors"
            />
          </div>

          {/* Table Type Pill Selector */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Table Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTableType(type)}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    tableType === type
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Facility Selector if Admin configured multiple facilities */}
          {factories.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Manufacturing Facility
              </label>
              <select
                value={selectedFactoryId}
                onChange={(e) => setSelectedFactoryId(e.target.value)}
                className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500 transition-colors"
              >
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.factory_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Production Checklist Builder */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-surface border border-border space-y-3 overflow-hidden">
          <div className="flex items-center justify-between pb-1">
            <span className="text-sm font-bold text-foreground">
              Production Checklist
            </span>

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center space-x-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-xs font-semibold text-foreground transition-colors border border-border"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Checklist Rows */}
          <div className="space-y-2.5">
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className="p-2.5 sm:p-3 rounded-xl bg-surface-raised border border-border space-y-2 overflow-hidden"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                  <span className="w-5 h-5 rounded-full bg-surface-overlay flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0 border border-border">
                    {index + 1}
                  </span>

                  <input
                    type="text"
                    value={item.task_name}
                    onChange={(e) => updateRow(item.id, 'task_name', e.target.value)}
                    placeholder="Enter task name..."
                    required
                    className="flex-1 min-w-0 text-xs px-2.5 sm:px-3 py-2 rounded-lg bg-surface text-foreground border border-border focus:outline-none focus:border-neutral-500"
                  />

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveRow(index, 'up')}
                      className="p-1 sm:p-1.5 rounded-lg bg-surface hover:bg-surface-overlay disabled:opacity-20 text-foreground border border-border"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === checklist.length - 1}
                      onClick={() => moveRow(index, 'down')}
                      className="p-1 sm:p-1.5 rounded-lg bg-surface hover:bg-surface-overlay disabled:opacity-20 text-foreground border border-border"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="p-1 sm:p-1.5 rounded-lg bg-surface hover:bg-rose-500/10 text-rose-400 transition-colors border border-border"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={item.remark}
                  onChange={(e) => updateRow(item.id, 'remark', e.target.value)}
                  placeholder="Add remark or specific instructions (optional)..."
                  className="w-full min-w-0 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface text-muted-foreground placeholder:text-muted/60 border border-border focus:outline-none focus:border-neutral-500"
                />
              </div>
            ))}

            {/* Mandatory Dispatch Row */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-surface-raised flex items-center justify-between text-xs text-muted-foreground border border-border gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground text-xs truncate">
                  {checklist.length + 1}. Dispatch & Packing (Final Checkpoint)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground border border-border shrink-0">
                MANDATORY
              </span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-1">
          <Link
            href="/dashboard"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-raised text-xs sm:text-sm font-medium text-foreground transition-colors flex items-center justify-center border border-border"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Table Order'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
