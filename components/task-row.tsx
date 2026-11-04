'use client';

import React, { useState } from 'react';
import { ProductionTask, UserProfile } from '@/types';
import { StatusBadge } from './status-badge';
import { PhotoUploader } from './photo-uploader';
import { useUser } from './user-context';
import { dataStore } from '@/lib/data/store';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  User, 
  Edit3,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskRowProps {
  task: ProductionTask;
  leadSupervisorId?: string | null;
  factoryId?: string;
  isCompletedTable?: boolean;
  onUpdate?: () => void;
}

export function TaskRow({
  task,
  leadSupervisorId,
  factoryId,
  isCompletedTable = false,
  onUpdate,
}: TaskRowProps) {
  const { currentUser } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal / Inline forms
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState<string>('');

  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemReason, setProblemReason] = useState('');

  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(task.assigned_supervisor_id || '');

  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState(task.task_name);
  const [editRemark, setEditRemark] = useState(task.remark || '');

  // Row tinting based on PRD Section 9.3
  let rowTintClass = 'bg-status-neutral-bg border-status-neutral-border';
  if (task.status === 'IN_PROGRESS') {
    rowTintClass = 'bg-status-blue-bg border-status-blue-border';
  } else if (task.status === 'COMPLETED') {
    rowTintClass = 'bg-status-green-bg border-status-green-border';
  } else if (task.status === 'BLOCKED') {
    rowTintClass = 'bg-status-red-bg border-status-red-border';
  }

  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAdmin = currentUser.role === 'ADMIN';
  const isSales = currentUser.role === 'SALES';
  const isLead = leadSupervisorId === currentUser.id;
  const isAssignedToMe = task.assigned_supervisor_id === currentUser.id;

  const canStart = 
    (isAssignedToMe || !task.assigned_supervisor_id || isAdmin) && 
    task.status === 'NOT_STARTED' && 
    task.task_type !== 'DISPATCH' &&
    !isCompletedTable;

  const canComplete = 
    (isAssignedToMe || isAdmin) && 
    task.status === 'IN_PROGRESS' && 
    task.task_type !== 'DISPATCH' &&
    !isCompletedTable;

  const canReportProblem = 
    (isAssignedToMe || isLead || isAdmin) && 
    (task.status === 'IN_PROGRESS' || task.status === 'NOT_STARTED') && 
    task.task_type !== 'DISPATCH' &&
    !isCompletedTable;

  const canResolveProblem = 
    (isAdmin || isLead) && 
    task.status === 'BLOCKED';

  const canAssign = 
    (isAdmin || isLead || (!task.assigned_supervisor_id && isSupervisor)) && 
    task.status !== 'COMPLETED' &&
    !isCompletedTable;

  const canEdit = 
    (isSales || isAdmin) && 
    task.status !== 'COMPLETED' &&
    !isCompletedTable;

  const canReopen = 
    isAdmin && 
    task.status === 'COMPLETED' && 
    task.task_type !== 'DISPATCH';

  // --- ACTIONS ---
  const handleStart = () => {
    setActionError(null);
    const res = dataStore.startTask(task.id, currentUser.id);
    if (!res.success) {
      setActionError(res.message);
    } else {
      onUpdate?.();
    }
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!completionPhoto) {
      setActionError('A completion photo is strictly mandatory before marking a task complete.');
      return;
    }
    const res = dataStore.completeTask(task.id, currentUser.id, completionPhoto);
    if (!res.success) {
      setActionError(res.message);
    } else {
      setShowCompleteForm(false);
      setCompletionPhoto('');
      onUpdate?.();
    }
  };

  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!problemReason.trim()) {
      setActionError('Please specify the reason for blocking this task.');
      return;
    }
    const res = dataStore.reportProblem(task.id, currentUser.id, problemReason);
    if (!res.success) {
      setActionError(res.message);
    } else {
      setShowProblemForm(false);
      setProblemReason('');
      onUpdate?.();
    }
  };

  const handleResolveProblem = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const res = dataStore.resolveProblem(task.id, currentUser.id, resolveNote || 'Issue resolved');
    if (!res.success) {
      setActionError(res.message);
    } else {
      setShowResolveForm(false);
      setResolveNote('');
      onUpdate?.();
    }
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const newSupId = selectedSupervisor || null;
    const res = dataStore.assignTask(task.id, newSupId, currentUser.id);
    if (!res.success) {
      setActionError(res.message);
    } else {
      setShowAssignForm(false);
      onUpdate?.();
    }
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const res = dataStore.editTask(task.id, currentUser.id, {
      task_name: editName,
      remark: editRemark,
    });
    if (!res.success) {
      setActionError(res.message);
    } else {
      setShowEditForm(false);
      onUpdate?.();
    }
  };

  const handleReopen = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!reopenReason.trim()) {
      setActionError('A mandatory reason is required to reopen a completed task.');
      return;
    }
    const res = dataStore.reopenTask(task.id, currentUser.id, reopenReason);
    if (!res.success) {
      setActionError(res.message);
    } else {
      setShowReopenForm(false);
      setReopenReason('');
      onUpdate?.();
    }
  };

  const eligibleSupervisors = dataStore.getSupervisors(factoryId);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${rowTintClass}`}
    >
      {/* Primary Row Header */}
      <div 
        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start space-x-3">
          <span className="w-6 h-6 rounded-full bg-surface/80 border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
            {task.sequence_number}
          </span>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h4 className="text-sm font-semibold text-foreground tracking-tight">
                {task.task_name}
              </h4>
              {task.task_type === 'DISPATCH' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border text-foreground">
                  Final Checkpoint
                </span>
              )}
            </div>

            {task.remark && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {task.remark}
              </p>
            )}

            <div className="flex items-center space-x-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span className={task.assigned_supervisor ? 'text-foreground font-medium' : 'italic'}>
                  {task.assigned_supervisor ? task.assigned_supervisor.full_name : 'Unassigned'}
                </span>
              </span>

              {task.completed_at && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{format(new Date(task.completed_at), 'dd MMM, HH:mm')}</span>
                </span>
              )}

              {task.evidence && task.evidence.length > 0 && (
                <span className="flex items-center space-x-1 text-foreground font-medium">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{task.evidence.length} photo</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <StatusBadge status={task.status} />
          <button 
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface/50"
            aria-label={isExpanded ? 'Collapse task' : 'Expand task'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Blocked Alert Banner if open issue exists */}
      {task.status === 'BLOCKED' && task.open_issue && (
        <div className="px-3.5 py-2.5 bg-red-500/10 border-t border-status-red-border text-xs text-status-red-text flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <span className="font-semibold">Blocked: </span>
            <span>{task.open_issue.reason}</span>
          </div>
        </div>
      )}

      {/* Expanded Details & Actions Drawer */}
      {isExpanded && (
        <div className="p-3.5 border-t border-border/60 bg-surface/40 space-y-3 text-xs">
          {actionError && (
            <div className="p-2.5 rounded-lg bg-status-red-bg border border-status-red-border text-status-red-text">
              {actionError}
            </div>
          )}

          {/* Timestamps & Personnel details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground bg-surface/60 p-2.5 rounded-lg border border-border/50">
            <div>
              <span className="font-medium text-foreground">Assigned Supervisor: </span>
              {task.assigned_supervisor ? task.assigned_supervisor.full_name : 'Unassigned'}
            </div>
            {task.started_at && (
              <div>
                <span className="font-medium text-foreground">Started: </span>
                {format(new Date(task.started_at), 'dd MMM yyyy, HH:mm')}
              </div>
            )}
            {task.completed_at && (
              <div>
                <span className="font-medium text-foreground">Completed: </span>
                {format(new Date(task.completed_at), 'dd MMM yyyy, HH:mm')} ({task.completer?.full_name || 'Supervisor'})
              </div>
            )}
          </div>

          {/* Completion Photo Preview if available */}
          {task.evidence && task.evidence.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-medium text-foreground">Task Completion Evidence:</span>
              <div className="flex flex-wrap gap-2">
                {task.evidence.map((ev) => (
                  <div key={ev.id} className="relative rounded-lg overflow-hidden border border-border w-28 h-20 bg-surface-raised">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={ev.storage_path} 
                      alt="Task completion evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            {canStart && (
              <button
                type="button"
                onClick={handleStart}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity flex items-center space-x-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Start Task</span>
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                onClick={() => setShowCompleteForm(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-green-700 dark:bg-green-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Task (Upload Photo)</span>
              </button>
            )}

            {canReportProblem && (
              <button
                type="button"
                onClick={() => setShowProblemForm(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center space-x-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Report Problem</span>
              </button>
            )}

            {canResolveProblem && (
              <button
                type="button"
                onClick={() => setShowResolveForm(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity flex items-center space-x-1.5"
              >
                <span>Resolve Problem</span>
              </button>
            )}

            {canAssign && (
              <button
                type="button"
                onClick={() => setShowAssignForm(true)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center space-x-1.5 text-foreground font-medium"
              >
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span>{task.assigned_supervisor ? 'Reassign' : 'Assign Supervisor'}</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowEditForm(true)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center space-x-1.5 text-foreground font-medium"
              >
                <Edit3 className="w-4 h-4 text-muted-foreground" />
                <span>Edit Instructions</span>
              </button>
            )}

            {canReopen && (
              <button
                type="button"
                onClick={() => setShowReopenForm(true)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors flex items-center space-x-1.5 text-status-red-text font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reopen Completed Task</span>
              </button>
            )}
          </div>

          {/* Form: Complete Task Photo Modal / Inline */}
          {showCompleteForm && (
            <form onSubmit={handleComplete} className="p-3.5 bg-surface rounded-xl border border-border space-y-3 mt-3">
              <div className="font-semibold text-foreground text-sm">
                Complete Task: {task.task_name}
              </div>
              <PhotoUploader
                label="Completion Photo (Mandatory)"
                required
                onPhotoSelected={setCompletionPhoto}
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteForm(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!completionPhoto}
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-green-700 dark:bg-green-600 text-white font-medium disabled:opacity-50"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          )}

          {/* Form: Report Problem Modal / Inline */}
          {showProblemForm && (
            <form onSubmit={handleReportProblem} className="p-3.5 bg-surface rounded-xl border border-border space-y-3 mt-3">
              <div className="font-semibold text-foreground text-sm">
                Report Problem: {task.task_name}
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Reason for blocking task <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={problemReason}
                  onChange={(e) => setProblemReason(e.target.value)}
                  placeholder="e.g. Missing hardware, damaged slate thread, instructions unclear..."
                  required
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface-raised text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProblemForm(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!problemReason.trim()}
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
                >
                  Submit Block Alert
                </button>
              </div>
            </form>
          )}

          {/* Form: Resolve Problem */}
          {showResolveForm && (
            <form onSubmit={handleResolveProblem} className="p-3.5 bg-surface rounded-xl border border-border space-y-3 mt-3">
              <div className="font-semibold text-foreground text-sm">
                Resolve Problem: {task.task_name}
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Resolution Note
                </label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Parts replaced from warehouse, ready to resume."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface-raised text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowResolveForm(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-foreground text-background font-medium"
                >
                  Resume Work
                </button>
              </div>
            </form>
          )}

          {/* Form: Assign Supervisor */}
          {showAssignForm && (
            <form onSubmit={handleAssign} className="p-3.5 bg-surface rounded-xl border border-border space-y-3 mt-3">
              <div className="font-semibold text-foreground text-sm">
                Assign Supervisor
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Select Eligible Supervisor
                </label>
                <select
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface-raised text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="">-- Unassigned --</option>
                  {eligibleSupervisors.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.full_name} ({sup.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssignForm(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-foreground text-background font-medium"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          )}

          {/* Form: Edit Task (Salesperson) */}
          {showEditForm && (
            <form onSubmit={handleEdit} className="p-3.5 bg-surface rounded-xl border border-border space-y-3 mt-3">
              <div className="font-semibold text-foreground text-sm">
                Edit Task Instructions
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface-raised text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Remark / Additional Instructions
                </label>
                <textarea
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface-raised text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-foreground text-background font-medium"
                >
                  Save Instructions
                </button>
              </div>
            </form>
          )}

          {/* Form: Reopen Completed Task (Admin only) */}
          {showReopenForm && (
            <form onSubmit={handleReopen} className="p-3.5 bg-surface rounded-xl border border-border space-y-3 mt-3">
              <div className="font-semibold text-foreground text-sm text-red-600 dark:text-red-400">
                Reopen Completed Task
              </div>
              <p className="text-muted-foreground text-[11px]">
                Reopening this task will remove the table from Completed status and revoke public QR access until production is completed again.
              </p>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Mandatory Reason for Reopening <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Quality inspection rejected cloth tension, requires re-tightening..."
                  required
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface-raised text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReopenForm(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reopenReason.trim()}
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50"
                >
                  Confirm Reopen
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
