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

interface ChecklistDraftItem {
  id: string;
  task_name: string;
  remark: string;
}

export default function CreateTablePage() {
  const router = useRouter();
  const { currentUser } = useUser();

  const factories = dataStore.getFactories();

  const [tableName, setTableName] = useState('');
  const [tableType, setTableType] = useState<TableType>('Snooker');
  const [factoryId, setFactoryId] = useState(factories[0]?.id || '');
  const [referencePhoto, setReferencePhoto] = useState<string>('');

  const [checklist, setChecklist] = useState<ChecklistDraftItem[]>([
    { id: '1', task_name: 'Prepare and calibrate table frame', remark: 'Verify squareness and joint strength.' },
    { id: '2', task_name: 'Prepare and level precision slate', remark: 'Check with spirit level; ensure tight seam bonding.' },
    { id: '3', task_name: 'Assemble cushions and rail profile', remark: 'Confirm specified rubber hardness and profile.' },
    { id: '4', task_name: 'Strap and stretch tournament cloth', remark: 'Zero slack or visible surface blemishes.' },
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
      setError('At least one build task is required in the checklist.');
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

    if (!factoryId) {
      setError('Please select a target manufacturing factory.');
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
        factory_id: factoryId,
        checklist: checklist.map((t) => ({
          task_name: t.task_name.trim(),
          remark: t.remark.trim() || undefined,
        })),
      });

      router.push(`/tables/${newTable.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create table. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Create Table Order
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define table specifications and production checklist for factory execution
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-status-red-bg border border-status-red-border text-status-red-text text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Table Information */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-4">
          <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-divider pb-2">
            Table Details
          </h2>

          {/* Reference Photo Uploader */}
          <PhotoUploader
            label="Finished Reference Photo"
            required
            onPhotoSelected={setReferencePhoto}
          />

          {/* Table Name */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Table Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g. Master Tournament Snooker 12ft"
              required
              className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Table Type */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Table Type <span className="text-red-500">*</span>
              </label>
              <select
                value={tableType}
                onChange={(e) => setTableType(e.target.value as TableType)}
                className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                <option value="Pool">Pool</option>
                <option value="Snooker">Snooker</option>
                <option value="Mini Snooker">Mini Snooker</option>
                <option value="American Pool">American Pool</option>
              </select>
            </div>

            {/* Target Factory */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Manufacturing Factory <span className="text-red-500">*</span>
              </label>
              <select
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                {factories.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.factory_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salesperson Auto-populated */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Salesperson
            </label>
            <input
              type="text"
              disabled
              value={`${currentUser.full_name} (${currentUser.email})`}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3.5 py-2 rounded-lg border border-border bg-surface-raised text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        {/* Custom Checklist Builder */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-4">
          <div className="flex items-center justify-between border-b border-divider pb-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Production Checklist
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Build step-by-step tasks. Supervisors will complete each task with mandatory photo evidence.
              </p>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center space-x-1 min-h-[40px] px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised text-xs font-medium text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Checklist Rows */}
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-border bg-surface-raised space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
                    {index + 1}
                  </span>

                  <input
                    type="text"
                    value={item.task_name}
                    onChange={(e) => updateRow(item.id, 'task_name', e.target.value)}
                    placeholder="Task name (e.g. Assemble steel frame)"
                    required
                    className="flex-1 text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  />

                  {/* Reordering and Delete Buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveRow(index, 'up')}
                      className="p-1.5 rounded-md border border-border bg-surface hover:bg-surface-raised disabled:opacity-30 text-foreground"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === checklist.length - 1}
                      onClick={() => moveRow(index, 'down')}
                      className="p-1.5 rounded-md border border-border bg-surface hover:bg-surface-raised disabled:opacity-30 text-foreground"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="p-1.5 rounded-md border border-border bg-surface hover:bg-red-500/10 text-status-red-text transition-colors"
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
                  placeholder="Additional instructions / remarks (optional)"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-surface text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            ))}

            {/* Mandatory Dispatch & Packing Row (Auto-included, cannot be deleted) */}
            <div className="p-3 rounded-xl border border-dashed border-border bg-surface flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">
                    {checklist.length + 1}. Dispatch & Packing (Final Checkpoint)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Automatically enforced: requires driver details, Nags count, and loaded truck photo before table completion.
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-surface-raised border border-border">
                Mandatory
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-2">
          <Link
            href="/dashboard"
            className="min-h-[44px] px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-raised text-xs sm:text-sm font-medium text-foreground transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] px-6 py-2.5 rounded-lg bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Order...' : 'Submit Table Order'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
