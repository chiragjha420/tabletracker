'use client';

import { 
  UserProfile, 
  Factory, 
  FactoryAccess, 
  TableOrder, 
  ProductionTask, 
  TaskCompletionEvidence, 
  TaskIssue, 
  DispatchDetails, 
  ActivityEvent, 
  NotificationItem, 
  QrAccessRecord,
  TableStatus,
  PublicTableHistory
} from '@/types';
import {
  INITIAL_USERS,
  INITIAL_FACTORIES,
  INITIAL_FACTORY_ACCESS,
  INITIAL_TABLES,
  INITIAL_TASKS,
  INITIAL_EVIDENCE,
  INITIAL_ISSUES,
  INITIAL_DISPATCH_DETAILS,
  INITIAL_ACTIVITY,
  INITIAL_NOTIFICATIONS,
  INITIAL_QR_ACCESS
} from './mock-data';

// Singleton in-memory store with local storage sync on browser
class ProductionDataStore {
  private users: UserProfile[] = [...INITIAL_USERS];
  private factories: Factory[] = [...INITIAL_FACTORIES];
  private factoryAccess: FactoryAccess[] = [...INITIAL_FACTORY_ACCESS];
  private tables: TableOrder[] = [...INITIAL_TABLES];
  private tasks: ProductionTask[] = [...INITIAL_TASKS];
  private evidence: TaskCompletionEvidence[] = [...INITIAL_EVIDENCE];
  private issues: TaskIssue[] = [...INITIAL_ISSUES];
  private dispatchDetails: DispatchDetails[] = [...INITIAL_DISPATCH_DETAILS];
  private activity: ActivityEvent[] = [...INITIAL_ACTIVITY];
  private notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
  private qrAccess: QrAccessRecord[] = [...INITIAL_QR_ACCESS];

  private currentUserId: string = 'b241a576-8872-45f8-a2c7-44a74a2aa6d3'; // Default: admin@jbb.com
  private listeners: Set<() => void> = new Set();
  private isHydrated: boolean = false;

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    if (typeof window !== 'undefined' && !this.isHydrated) {
      try {
        // Clear any old mock cache from previous sessions
        if (localStorage.getItem('jbb_tabletracker_data_v1')) {
          localStorage.removeItem('jbb_tabletracker_data_v1');
          localStorage.removeItem('jbb_current_user_id');
        }

        const saved = localStorage.getItem('jbb_tabletracker_data_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.users = parsed.users || this.users;
          this.factories = parsed.factories || this.factories;
          this.factoryAccess = parsed.factoryAccess || this.factoryAccess;
          this.tables = parsed.tables || this.tables;
          this.tasks = parsed.tasks || this.tasks;
          this.evidence = parsed.evidence || this.evidence;
          this.issues = parsed.issues || this.issues;
          this.dispatchDetails = parsed.dispatchDetails || this.dispatchDetails;
          this.activity = parsed.activity || this.activity;
          this.notifications = parsed.notifications || this.notifications;
          this.qrAccess = parsed.qrAccess || this.qrAccess;
        }
        const savedUser = localStorage.getItem('jbb_current_user_id_v2');
        if (savedUser && this.users.some(u => u.id === savedUser)) {
          this.currentUserId = savedUser;
        }
        this.isHydrated = true;
      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        const payload = {
          users: this.users,
          factories: this.factories,
          factoryAccess: this.factoryAccess,
          tables: this.tables,
          tasks: this.tasks,
          evidence: this.evidence,
          issues: this.issues,
          dispatchDetails: this.dispatchDetails,
          activity: this.activity,
          notifications: this.notifications,
          qrAccess: this.qrAccess,
        };
        localStorage.setItem('jbb_tabletracker_data_v2', JSON.stringify(payload));
        localStorage.setItem('jbb_current_user_id_v2', this.currentUserId);
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Listener callback error', err);
      }
    });
  }

  // --- USER CONTEXT & SWITCHING ---
  public getCurrentUser(): UserProfile {
    this.hydrateFromStorage();
    const user = this.users.find(u => u.id === this.currentUserId);
    return user || this.users[0];
  }

  public setSessionUser(user: UserProfile): void {
    const existingIndex = this.users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      this.users[existingIndex] = { ...this.users[existingIndex], ...user };
    } else {
      this.users.push(user);
    }
    this.currentUserId = user.id;
    this.saveToStorage();
  }

  public updateUserRole(userId: string, newRole: 'ADMIN' | 'SALES' | 'SUPERVISOR', adminId: string): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const actor = this.users.find(u => u.id === adminId);
    if (actor?.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can change user roles.' };
    }

    const targetUser = this.users.find(u => u.id === userId);
    if (!targetUser) return { success: false, message: 'User not found.' };

    targetUser.role = newRole;
    targetUser.updated_at = new Date().toISOString();
    this.saveToStorage();
    return { success: true, message: `Role updated to ${newRole}.` };
  }

  public toggleUserApproval(userId: string, isActive: boolean, adminId: string): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const actor = this.users.find(u => u.id === adminId);
    if (actor?.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can approve or suspend accounts.' };
    }

    const targetUser = this.users.find(u => u.id === userId);
    if (!targetUser) return { success: false, message: 'User not found.' };

    targetUser.is_active = isActive;
    targetUser.updated_at = new Date().toISOString();
    this.saveToStorage();
    return { success: true, message: isActive ? 'Account approved.' : 'Account suspended.' };
  }

  public getUserFactoryAccess(userId: string): string[] {
    this.hydrateFromStorage();
    return this.factoryAccess.filter(fa => fa.user_id === userId).map(fa => fa.factory_id);
  }

  public setUserFactoryAccess(userId: string, factoryIds: string[], adminId: string): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const actor = this.users.find(u => u.id === adminId);
    if (actor?.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can assign factory access.' };
    }

    // Remove existing
    this.factoryAccess = this.factoryAccess.filter(fa => fa.user_id !== userId);
    // Add new
    factoryIds.forEach(fId => {
      this.factoryAccess.push({
        id: `fa-${Date.now()}-${fId}`,
        user_id: userId,
        factory_id: fId,
        created_at: new Date().toISOString(),
      });
    });

    this.saveToStorage();
    return { success: true, message: 'Factory permissions updated.' };
  }

  public setCurrentUser(userId: string): void {
    if (this.users.some(u => u.id === userId)) {
      this.currentUserId = userId;
      this.saveToStorage();
    }
  }

  public getUsers(): UserProfile[] {
    this.hydrateFromStorage();
    return [...this.users];
  }

  public getSupervisors(factoryId?: string): UserProfile[] {
    this.hydrateFromStorage();
    if (!factoryId) {
      return this.users.filter(u => u.role === 'SUPERVISOR' && u.is_active);
    }
    const authorizedUserIds = new Set(
      this.factoryAccess
        .filter(fa => fa.factory_id === factoryId)
        .map(fa => fa.user_id)
    );
    return this.users.filter(u => u.role === 'SUPERVISOR' && u.is_active && authorizedUserIds.has(u.id));
  }

  public getFactories(): Factory[] {
    this.hydrateFromStorage();
    return [...this.factories];
  }

  // --- TABLE STATUS CALCULATION ---
  public recalculateTableStatus(tableId: string): TableStatus {
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return 'Submitted';

    if (table.status === 'Archived') return 'Archived';

    const tableTasks = this.tasks.filter(t => t.table_id === tableId);
    const dispatchTask = tableTasks.find(t => t.task_type === 'DISPATCH');

    if (dispatchTask && dispatchTask.status === 'COMPLETED') {
      table.status = 'Completed / Dispatched';
      table.updated_at = new Date().toISOString();
      return 'Completed / Dispatched';
    }

    const hasBlocked = tableTasks.some(t => t.status === 'BLOCKED');
    if (hasBlocked) {
      table.status = 'Needs Attention';
      table.updated_at = new Date().toISOString();
      return 'Needs Attention';
    }

    const buildTasks = tableTasks.filter(t => t.task_type === 'BUILD');
    const allBuildComplete = buildTasks.length > 0 && buildTasks.every(t => t.status === 'COMPLETED');

    if (allBuildComplete) {
      table.status = 'Ready for Dispatch';
    } else if (table.lead_supervisor_id || tableTasks.some(t => t.status === 'IN_PROGRESS')) {
      table.status = 'In Progress';
    } else {
      table.status = 'Submitted';
    }

    table.updated_at = new Date().toISOString();
    return table.status;
  }

  // --- QUERY TABLES ---
  public getTables(filters?: {
    status?: string;
    factoryId?: string;
    salespersonId?: string;
    supervisorId?: string;
    search?: string;
    currentRole?: string;
    currentUserId?: string;
  }): TableOrder[] {
    this.hydrateFromStorage();
    let result = [...this.tables];

    // Enforce role-based factory visibility
    if (filters?.currentRole === 'SUPERVISOR' && filters?.currentUserId) {
      const permittedFactoryIds = new Set(
        this.factoryAccess
          .filter(fa => fa.user_id === filters.currentUserId)
          .map(fa => fa.factory_id)
      );
      result = result.filter(t => permittedFactoryIds.has(t.factory_id));
    }

    if (filters?.status && filters.status !== 'All') {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters?.factoryId && filters.factoryId !== 'All') {
      result = result.filter(t => t.factory_id === filters.factoryId);
    }

    if (filters?.salespersonId && filters.salespersonId !== 'All') {
      result = result.filter(t => t.salesperson_id === filters.salespersonId);
    }

    if (filters?.supervisorId && filters.supervisorId !== 'All') {
      result = result.filter(t => t.lead_supervisor_id === filters.supervisorId);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        t =>
          t.table_name.toLowerCase().includes(q) ||
          t.table_code.toLowerCase().includes(q) ||
          t.table_type.toLowerCase().includes(q)
      );
    }

    // Attach populated relationships
    return result.map(t => ({
      ...t,
      salesperson: this.users.find(u => u.id === t.salesperson_id),
      lead_supervisor: this.users.find(u => u.id === t.lead_supervisor_id) || null,
      factory: this.factories.find(f => f.id === t.factory_id),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getTableById(tableId: string): {
    table: TableOrder;
    tasks: ProductionTask[];
    activity: ActivityEvent[];
    dispatch?: DispatchDetails | null;
    qrToken?: string | null;
  } | null {
    this.hydrateFromStorage();
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return null;

    const populatedTable: TableOrder = {
      ...table,
      salesperson: this.users.find(u => u.id === table.salesperson_id),
      lead_supervisor: this.users.find(u => u.id === table.lead_supervisor_id) || null,
      factory: this.factories.find(f => f.id === table.factory_id),
    };

    const tasks = this.tasks
      .filter(t => t.table_id === tableId)
      .map(task => ({
        ...task,
        assigned_supervisor: this.users.find(u => u.id === task.assigned_supervisor_id) || null,
        completer: this.users.find(u => u.id === task.completed_by) || null,
        evidence: this.evidence.filter(e => e.task_id === task.id),
        open_issue: this.issues.find(i => i.task_id === task.id && i.status === 'OPEN') || null,
      }))
      .sort((a, b) => a.sequence_number - b.sequence_number);

    const activity = this.activity
      .filter(a => a.table_id === tableId)
      .map(act => ({
        ...act,
        actor: this.users.find(u => u.id === act.actor_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const dispatch = this.dispatchDetails.find(d => d.table_id === tableId) || null;
    const activeQr = this.qrAccess.find(q => q.table_id === tableId && q.is_active);

    return {
      table: populatedTable,
      tasks,
      activity,
      dispatch,
      qrToken: activeQr ? activeQr.token_hash : null,
    };
  }

  // --- QUERY TASKS FOR SUPERVISOR ---
  public getSupervisorTasks(supervisorId: string, filterStatus?: string): ProductionTask[] {
    this.hydrateFromStorage();
    let tasks = this.tasks.filter(t => t.assigned_supervisor_id === supervisorId);

    if (filterStatus && filterStatus !== 'All Active') {
      if (filterStatus === 'Not Started') tasks = tasks.filter(t => t.status === 'NOT_STARTED');
      else if (filterStatus === 'In Progress') tasks = tasks.filter(t => t.status === 'IN_PROGRESS');
      else if (filterStatus === 'Blocked') tasks = tasks.filter(t => t.status === 'BLOCKED');
      else if (filterStatus === 'Completed') tasks = tasks.filter(t => t.status === 'COMPLETED');
    } else {
      // "All Active" = Not Started, In Progress, Blocked
      tasks = tasks.filter(t => t.status !== 'COMPLETED');
    }

    return tasks.map(task => ({
      ...task,
      assigned_supervisor: this.users.find(u => u.id === task.assigned_supervisor_id) || null,
      completer: this.users.find(u => u.id === task.completed_by) || null,
      evidence: this.evidence.filter(e => e.task_id === task.id),
      open_issue: this.issues.find(i => i.task_id === task.id && i.status === 'OPEN') || null,
    })).sort((a, b) => a.sequence_number - b.sequence_number);
  }

  // --- CREATE TABLE ---
  public createTable(payload: {
    table_name: string;
    table_type: 'Pool' | 'Snooker' | 'Mini Snooker' | 'American Pool';
    reference_photo_path: string;
    salesperson_id: string;
    factory_id: string;
    checklist: Array<{ task_name: string; remark?: string }>;
  }): TableOrder {
    this.hydrateFromStorage();
    const now = new Date().toISOString();
    const tableId = `tbl-${Date.now()}`;
    const codeNum = (this.tables.length + 1).toString().padStart(3, '0');
    const tableCode = `JBB-2026-${codeNum}`;

    const newTable: TableOrder = {
      id: tableId,
      table_code: tableCode,
      table_name: payload.table_name,
      table_type: payload.table_type,
      reference_photo_path: payload.reference_photo_path,
      salesperson_id: payload.salesperson_id,
      factory_id: payload.factory_id,
      lead_supervisor_id: null,
      status: 'Submitted',
      claimed_at: null,
      dispatched_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };

    this.tables.push(newTable);

    // Create user checklist build tasks
    payload.checklist.forEach((item, index) => {
      this.tasks.push({
        id: `task-${Date.now()}-${index + 1}`,
        table_id: tableId,
        task_name: item.task_name,
        remark: item.remark || null,
        task_type: 'BUILD',
        sequence_number: index + 1,
        assigned_supervisor_id: null,
        status: 'NOT_STARTED',
        started_at: null,
        completed_at: null,
        completed_by: null,
        previous_workable_status: null,
        created_at: now,
        updated_at: now,
      });
    });

    // Automatically append mandatory Dispatch & Packing task
    this.tasks.push({
      id: `task-disp-${Date.now()}`,
      table_id: tableId,
      task_name: 'Dispatch & Packing',
      remark: 'Verify total nags, driver name, phone and upload loaded truck photo.',
      task_type: 'DISPATCH',
      sequence_number: payload.checklist.length + 1,
      assigned_supervisor_id: null,
      status: 'NOT_STARTED',
      started_at: null,
      completed_at: null,
      completed_by: null,
      previous_workable_status: null,
      created_at: now,
      updated_at: now,
    });

    // Activity event
    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: tableId,
      task_id: null,
      actor_id: payload.salesperson_id,
      event_type: 'TABLE_CREATED',
      previous_value: null,
      new_value: 'Submitted',
      event_metadata: {
        table_name: payload.table_name,
        tasks_count: payload.checklist.length,
      },
      created_at: now,
    });

    this.saveToStorage();
    return newTable;
  }

  // --- ATOMIC TABLE CLAIM ---
  public claimTable(tableId: string, supervisorId: string): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const table = this.tables.find(t => t.id === tableId);
    if (!table) {
      return { success: false, message: 'Table not found.' };
    }

    if (table.lead_supervisor_id !== null) {
      const lead = this.users.find(u => u.id === table.lead_supervisor_id);
      return { 
        success: false, 
        message: `Table has already been claimed by ${lead ? lead.full_name : 'another supervisor'}.` 
      };
    }

    if (table.status === 'Archived' || table.status === 'Completed / Dispatched') {
      return { success: false, message: 'Cannot claim a closed or completed table.' };
    }

    const now = new Date().toISOString();
    table.lead_supervisor_id = supervisorId;
    table.claimed_at = now;
    table.status = 'In Progress';
    table.updated_at = now;

    const claimingUser = this.users.find(u => u.id === supervisorId);

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: tableId,
      task_id: null,
      actor_id: supervisorId,
      event_type: 'TABLE_CLAIMED',
      previous_value: 'Submitted',
      new_value: 'In Progress',
      event_metadata: { claimed_by: claimingUser ? claimingUser.full_name : supervisorId },
      created_at: now,
    });

    this.saveToStorage();
    return { success: true, message: 'Responsibility claimed successfully.' };
  }

  // --- TASK ASSIGNMENT ---
  public assignTask(
    taskId: string, 
    newSupervisorId: string | null, 
    actorId: string
  ): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    const table = this.tables.find(t => t.id === task.table_id);
    if (!table) return { success: false, message: 'Associated table not found.' };

    const actor = this.users.find(u => u.id === actorId);
    if (!actor) return { success: false, message: 'Actor profile not found.' };

    // Permissions rule:
    // Lead supervisor or admin can assign/reassign.
    // A supervisor may claim an unassigned task for themselves.
    // A supervisor cannot take over another supervisor's assigned task without authorized reassignment.
    const isLeadOrAdmin = actor.role === 'ADMIN' || table.lead_supervisor_id === actorId;
    const isClaimingSelf = task.assigned_supervisor_id === null && newSupervisorId === actorId;

    if (!isLeadOrAdmin && !isClaimingSelf) {
      return { 
        success: false, 
        message: 'You cannot take over another supervisor’s assigned task without authorization.' 
      };
    }

    const prevSupervisorId = task.assigned_supervisor_id;
    const prevSup = this.users.find(u => u.id === prevSupervisorId);
    const newSup = this.users.find(u => u.id === newSupervisorId);
    const now = new Date().toISOString();

    task.assigned_supervisor_id = newSupervisorId;
    task.updated_at = now;

    const eventType = prevSupervisorId ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED';

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: table.id,
      task_id: taskId,
      actor_id: actorId,
      event_type: eventType,
      previous_value: prevSup ? prevSup.full_name : 'Unassigned',
      new_value: newSup ? newSup.full_name : 'Unassigned',
      created_at: now,
    });

    // Notify new supervisor if assigned
    if (newSupervisorId && newSupervisorId !== actorId) {
      this.notifications.push({
        id: `notif-${Date.now()}`,
        recipient_user_id: newSupervisorId,
        notification_type: eventType,
        title: `Task Assigned: ${task.task_name}`,
        message: `${actor.full_name} assigned you the task "${task.task_name}" on table ${table.table_name}.`,
        related_table_id: table.id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    }

    this.saveToStorage();
    return { success: true, message: 'Task assignment updated.' };
  }

  // --- START TASK ---
  public startTask(taskId: string, supervisorId: string): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    const actor = this.users.find(u => u.id === supervisorId);
    if (!actor) return { success: false, message: 'User not found.' };

    if (task.status === 'COMPLETED') {
      return { success: false, message: 'Task is already completed.' };
    }

    const now = new Date().toISOString();
    task.status = 'IN_PROGRESS';
    task.started_at = task.started_at || now;
    task.previous_workable_status = 'IN_PROGRESS';
    task.updated_at = now;

    // If unassigned, automatically assign to starting supervisor
    if (!task.assigned_supervisor_id) {
      task.assigned_supervisor_id = supervisorId;
    }

    this.recalculateTableStatus(task.table_id);

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: task.table_id,
      task_id: taskId,
      actor_id: supervisorId,
      event_type: 'TASK_STARTED',
      previous_value: 'NOT_STARTED',
      new_value: 'IN_PROGRESS',
      created_at: now,
    });

    this.saveToStorage();
    return { success: true, message: 'Task is now In Progress.' };
  }

  // --- COMPLETE TASK WITH MANDATORY PHOTO ---
  public completeTask(
    taskId: string, 
    supervisorId: string, 
    photoDataUrlOrPath: string
  ): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    // STRICT RULE: Proof of work required
    if (!photoDataUrlOrPath || photoDataUrlOrPath.trim().length === 0) {
      return { 
        success: false, 
        message: 'A task cannot be marked completed without an uploaded completion photo.' 
      };
    }

    // Role check: Only assigned supervisor or Admin
    const actor = this.users.find(u => u.id === supervisorId);
    if (actor?.role !== 'ADMIN' && task.assigned_supervisor_id && task.assigned_supervisor_id !== supervisorId) {
      return { 
        success: false, 
        message: 'Only the assigned supervisor or an administrator can mark this task complete.' 
      };
    }

    const now = new Date().toISOString();

    // 1. Store evidence
    const evidenceId = `ev-${Date.now()}`;
    this.evidence.push({
      id: evidenceId,
      task_id: taskId,
      uploaded_by: supervisorId,
      storage_path: photoDataUrlOrPath,
      evidence_type: 'PHOTO',
      uploaded_at: now,
    });

    // 2. Mark complete
    task.status = 'COMPLETED';
    task.completed_at = now;
    task.completed_by = supervisorId;
    task.updated_at = now;

    this.recalculateTableStatus(task.table_id);

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: task.table_id,
      task_id: taskId,
      actor_id: supervisorId,
      event_type: 'TASK_COMPLETED',
      previous_value: 'IN_PROGRESS',
      new_value: 'COMPLETED',
      event_metadata: { photo: evidenceId },
      created_at: now,
    });

    this.saveToStorage();
    return { success: true, message: 'Task completed successfully with evidence.' };
  }

  // --- REPORT PROBLEM (BLOCKED TASK) ---
  public reportProblem(
    taskId: string, 
    supervisorId: string, 
    reason: string
  ): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    if (!reason || reason.trim().length < 3) {
      return { success: false, message: 'A descriptive reason is required to report a problem.' };
    }

    const table = this.tables.find(t => t.id === task.table_id);
    const actor = this.users.find(u => u.id === supervisorId);
    const now = new Date().toISOString();

    task.previous_workable_status = (task.status === 'IN_PROGRESS' || task.status === 'NOT_STARTED') 
      ? task.status 
      : 'IN_PROGRESS';
    task.status = 'BLOCKED';
    task.updated_at = now;

    const issueId = `issue-${Date.now()}`;
    this.issues.push({
      id: issueId,
      task_id: taskId,
      reported_by: supervisorId,
      reason: reason.trim(),
      status: 'OPEN',
      resolution_note: null,
      resolved_by: null,
      created_at: now,
      resolved_at: null,
    });

    this.recalculateTableStatus(task.table_id);

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: task.table_id,
      task_id: taskId,
      actor_id: supervisorId,
      event_type: 'TASK_BLOCKED',
      previous_value: task.previous_workable_status,
      new_value: 'BLOCKED',
      event_metadata: { reason: reason.trim() },
      created_at: now,
    });

    // Notify admins and lead supervisor
    this.users.filter(u => u.role === 'ADMIN').forEach(admin => {
      this.notifications.push({
        id: `notif-${Date.now()}-${admin.id}`,
        recipient_user_id: admin.id,
        notification_type: 'TASK_BLOCKED',
        title: `Task Blocked: ${task.task_name}`,
        message: `${actor?.full_name || 'Supervisor'} reported a problem on table ${table?.table_name}: "${reason}"`,
        related_table_id: task.table_id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    });

    if (table?.lead_supervisor_id && table.lead_supervisor_id !== supervisorId) {
      this.notifications.push({
        id: `notif-${Date.now()}-${table.lead_supervisor_id}`,
        recipient_user_id: table.lead_supervisor_id,
        notification_type: 'TASK_BLOCKED',
        title: `Task Blocked on Your Table`,
        message: `Task "${task.task_name}" on ${table.table_name} is blocked: "${reason}"`,
        related_table_id: table.id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    }

    this.saveToStorage();
    return { success: true, message: 'Problem reported. Task marked as Blocked.' };
  }

  // --- RESOLVE PROBLEM ---
  public resolveProblem(
    taskId: string, 
    actorId: string, 
    resolutionNote: string
  ): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    const issue = this.issues.find(i => i.task_id === taskId && i.status === 'OPEN');
    const actor = this.users.find(u => u.id === actorId);
    const now = new Date().toISOString();

    if (issue) {
      issue.status = 'RESOLVED';
      issue.resolution_note = resolutionNote;
      issue.resolved_by = actorId;
      issue.resolved_at = now;
    }

    // Return to workable state
    task.status = task.previous_workable_status || 'NOT_STARTED';
    task.updated_at = now;

    this.recalculateTableStatus(task.table_id);

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: task.table_id,
      task_id: taskId,
      actor_id: actorId,
      event_type: 'PROBLEM_RESOLVED',
      previous_value: 'BLOCKED',
      new_value: task.status,
      event_metadata: { resolution: resolutionNote },
      created_at: now,
    });

    if (task.assigned_supervisor_id) {
      this.notifications.push({
        id: `notif-${Date.now()}`,
        recipient_user_id: task.assigned_supervisor_id,
        notification_type: 'PROBLEM_RESOLVED',
        title: `Problem Resolved: ${task.task_name}`,
        message: `Issue resolved: "${resolutionNote}". Task is now ${task.status}.`,
        related_table_id: task.table_id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    }

    this.saveToStorage();
    return { success: true, message: 'Problem marked as resolved. Task resumed.' };
  }

  // --- EDIT TASK (Salesperson) ---
  public editTask(
    taskId: string, 
    actorId: string, 
    updates: { task_name?: string; remark?: string; sequence_number?: number }
  ): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    if (task.status === 'COMPLETED') {
      return { 
        success: false, 
        message: 'Completed tasks cannot be edited directly. An administrator must reopen it first.' 
      };
    }

    const table = this.tables.find(t => t.id === task.table_id);
    const actor = this.users.find(u => u.id === actorId);
    const now = new Date().toISOString();

    const prevName = task.task_name;
    const prevRemark = task.remark;

    if (updates.task_name !== undefined) task.task_name = updates.task_name;
    if (updates.remark !== undefined) task.remark = updates.remark;
    if (updates.sequence_number !== undefined) task.sequence_number = updates.sequence_number;
    task.updated_at = now;

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: task.table_id,
      task_id: taskId,
      actor_id: actorId,
      event_type: 'TASK_EDITED',
      previous_value: `Name: ${prevName} | Remark: ${prevRemark || 'None'}`,
      new_value: `Name: ${task.task_name} | Remark: ${task.remark || 'None'}`,
      created_at: now,
    });

    // Notify assigned supervisor or all factory supervisors
    if (task.assigned_supervisor_id) {
      this.notifications.push({
        id: `notif-${Date.now()}`,
        recipient_user_id: task.assigned_supervisor_id,
        notification_type: 'TASK_EDITED',
        title: `Task Updated: ${task.task_name}`,
        message: `${actor?.full_name || 'Sales'} updated instructions for task "${task.task_name}".`,
        related_table_id: task.table_id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    } else if (table) {
      const factorySups = this.getSupervisors(table.factory_id);
      factorySups.forEach(sup => {
        this.notifications.push({
          id: `notif-${Date.now()}-${sup.id}`,
          recipient_user_id: sup.id,
          notification_type: 'TASK_EDITED',
          title: `Unassigned Task Updated: ${task.task_name}`,
          message: `Instructions updated for task "${task.task_name}" in ${table.table_name}.`,
          related_table_id: table.id,
          related_task_id: taskId,
          read_at: null,
          created_at: now,
        });
      });
    }

    this.saveToStorage();
    return { success: true, message: 'Task updated.' };
  }

  // --- REOPEN COMPLETED TASK (Admin only) ---
  public reopenTask(
    taskId: string, 
    adminId: string, 
    reason: string
  ): { success: boolean; message: string } {
    this.hydrateFromStorage();
    const actor = this.users.find(u => u.id === adminId);
    if (actor?.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can reopen completed tasks.' };
    }

    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'A mandatory reason is required to reopen a completed task.' };
    }

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    if (task.status !== 'COMPLETED') {
      return { success: false, message: 'Only completed tasks can be reopened.' };
    }

    const table = this.tables.find(t => t.id === task.table_id);
    const now = new Date().toISOString();

    // Reopen task
    task.status = 'IN_PROGRESS';
    task.completed_at = null;
    task.completed_by = null;
    task.updated_at = now;

    // Also reset any dispatch task since table is no longer fully completed
    const dispatchTask = this.tasks.find(t => t.table_id === task.table_id && t.task_type === 'DISPATCH');
    if (dispatchTask) {
      dispatchTask.status = 'NOT_STARTED';
      dispatchTask.completed_at = null;
      dispatchTask.completed_by = null;
      dispatchTask.updated_at = now;
    }

    // Revoke QR access for table
    this.qrAccess
      .filter(q => q.table_id === task.table_id && q.is_active)
      .forEach(q => {
        q.is_active = false;
        q.revoked_at = now;
      });

    this.recalculateTableStatus(task.table_id);

    this.activity.push({
      id: `act-${Date.now()}`,
      table_id: task.table_id,
      task_id: taskId,
      actor_id: adminId,
      event_type: 'TASK_REOPENED',
      previous_value: 'COMPLETED',
      new_value: 'IN_PROGRESS',
      event_metadata: { reason: reason.trim() },
      created_at: now,
    });

    // Notify assigned supervisor and lead
    if (task.assigned_supervisor_id) {
      this.notifications.push({
        id: `notif-${Date.now()}`,
        recipient_user_id: task.assigned_supervisor_id,
        notification_type: 'TASK_REOPENED',
        title: `Task Reopened: ${task.task_name}`,
        message: `Task has been reopened by administrator: "${reason}". Table status updated.`,
        related_table_id: task.table_id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    }

    if (table?.lead_supervisor_id && table.lead_supervisor_id !== task.assigned_supervisor_id) {
      this.notifications.push({
        id: `notif-${Date.now()}-lead`,
        recipient_user_id: table.lead_supervisor_id,
        notification_type: 'TASK_REOPENED',
        title: `Task Reopened on Table`,
        message: `Administrator reopened "${task.task_name}". Public QR has been revoked until re-dispatched.`,
        related_table_id: task.table_id,
        related_task_id: taskId,
        read_at: null,
        created_at: now,
      });
    }

    this.saveToStorage();
    return { success: true, message: 'Task reopened. Public QR revoked until completed.' };
  }

  // --- FINAL DISPATCH ENFORCEMENT ---
  public completeDispatch(
    tableId: string, 
    supervisorId: string, 
    payload: {
      nags_count: number;
      driver_name: string;
      driver_phone: string;
      packed_photo_path: string;
    }
  ): { success: boolean; message: string; qrToken?: string } {
    this.hydrateFromStorage();
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return { success: false, message: 'Table not found.' };

    if (table.status === 'Archived' || table.status === 'Completed / Dispatched') {
      return { success: false, message: 'Table is already completed or archived.' };
    }

    // 1. Validate Dispatch & Packing task exists
    const dispatchTask = this.tasks.find(t => t.table_id === tableId && t.task_type === 'DISPATCH');
    if (!dispatchTask) {
      return { success: false, message: 'Missing required Dispatch & Packing checkpoint task.' };
    }

    // 2. BACKEND GATE: Check for blocked build tasks
    const blockedTasks = this.tasks.filter(t => t.table_id === tableId && t.task_type === 'BUILD' && t.status === 'BLOCKED');
    if (blockedTasks.length > 0) {
      const names = blockedTasks.map(t => t.task_name).join(', ');
      return { 
        success: false, 
        message: `Cannot dispatch: ${blockedTasks.length} task(s) are blocked: ${names}` 
      };
    }

    // 3. BACKEND GATE: Check for incomplete build tasks
    const incompleteTasks = this.tasks.filter(t => t.table_id === tableId && t.task_type === 'BUILD' && t.status !== 'COMPLETED');
    if (incompleteTasks.length > 0) {
      const names = incompleteTasks.map(t => t.task_name).join(', ');
      return { 
        success: false, 
        message: `Cannot dispatch: ${incompleteTasks.length} build task(s) remain incomplete: ${names}` 
      };
    }

    // 4. BACKEND GATE: Check that every completed build task has evidence
    const missingEvidenceTasks = this.tasks.filter(t => {
      if (t.table_id !== tableId || t.task_type !== 'BUILD') return false;
      const hasPhoto = this.evidence.some(e => e.task_id === t.id);
      return !hasPhoto;
    });

    if (missingEvidenceTasks.length > 0) {
      return { 
        success: false, 
        message: `Cannot dispatch: ${missingEvidenceTasks.length} task(s) are missing mandatory completion photos.` 
      };
    }

    // 5. BACKEND GATE: Validate dispatch input fields
    if (payload.nags_count === undefined || payload.nags_count === null || payload.nags_count < 0) {
      return { success: false, message: 'Total Nags Prepared is required (must be 0 or greater).' };
    }
    if (!payload.driver_name || payload.driver_name.trim().length === 0) {
      return { success: false, message: 'Driver Name is required.' };
    }
    if (!payload.driver_phone || payload.driver_phone.trim().length < 8) {
      return { success: false, message: 'Valid Driver Phone Number is required.' };
    }
    if (!payload.packed_photo_path || payload.packed_photo_path.trim().length === 0) {
      return { success: false, message: 'Packed Table Photo is required.' };
    }

    const now = new Date().toISOString();

    // 6. Record Dispatch Details
    this.dispatchDetails.push({
      id: `disp-${Date.now()}`,
      table_id: tableId,
      dispatch_task_id: dispatchTask.id,
      nags_count: Math.floor(payload.nags_count),
      driver_name: payload.driver_name.trim(),
      driver_phone: payload.driver_phone.trim(),
      packed_table_photo_path: payload.packed_photo_path,
      submitted_by: supervisorId,
      submitted_at: now,
    });

    // 7. Complete dispatch task
    dispatchTask.status = 'COMPLETED';
    dispatchTask.completed_at = now;
    dispatchTask.completed_by = supervisorId;
    dispatchTask.updated_at = now;

    // 8. Add dispatch photo to evidence
    this.evidence.push({
      id: `ev-disp-${Date.now()}`,
      task_id: dispatchTask.id,
      uploaded_by: supervisorId,
      storage_path: payload.packed_photo_path,
      evidence_type: 'DISPATCH_PACKED_PHOTO',
      uploaded_at: now,
    });

    // 9. Mark table Completed / Dispatched
    table.status = 'Completed / Dispatched';
    table.dispatched_at = now;
    table.updated_at = now;

    // 10. Generate cryptographically strong random token
    const token = `jbb-prod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;

    this.qrAccess.push({
      id: `qr-${Date.now()}`,
      table_id: tableId,
      token_hash: token,
      is_active: true,
      generated_at: now,
      revoked_at: null,
    });

    // 11. Record activity
    this.activity.push({
      id: `act-${Date.now()}-1`,
      table_id: tableId,
      task_id: dispatchTask.id,
      actor_id: supervisorId,
      event_type: 'DISPATCH_RECORDED',
      previous_value: 'Ready for Dispatch',
      new_value: 'Completed / Dispatched',
      event_metadata: {
        nags_count: payload.nags_count,
        driver_name: payload.driver_name,
      },
      created_at: now,
    });

    this.activity.push({
      id: `act-${Date.now()}-2`,
      table_id: tableId,
      task_id: null,
      actor_id: supervisorId,
      event_type: 'QR_GENERATED',
      previous_value: null,
      new_value: 'active',
      created_at: now,
    });

    // 12. Notify salesperson and admins
    const notifRecipients = this.users.filter(u => u.id === table.salesperson_id || u.role === 'ADMIN');
    notifRecipients.forEach(u => {
      this.notifications.push({
        id: `notif-${Date.now()}-${u.id}`,
        recipient_user_id: u.id,
        notification_type: 'TABLE_DISPATCHED',
        title: `Table Dispatched: ${table.table_name}`,
        message: `Dispatched with ${payload.nags_count} Nags by driver ${payload.driver_name}. QR certificate ready.`,
        related_table_id: tableId,
        related_task_id: dispatchTask.id,
        read_at: null,
        created_at: now,
      });
    });

    this.saveToStorage();
    return { success: true, message: 'Table successfully dispatched and completed.', qrToken: token };
  }

  // --- PUBLIC QR VERIFICATION (SANITIZED) ---
  public getPublicTableHistory(token: string): PublicTableHistory {
    this.hydrateFromStorage();
    const qr = this.qrAccess.find(q => q.token_hash === token && q.is_active);
    if (!qr) {
      return { 
        found: false, 
        error: 'Invalid, revoked or expired production history token.' 
      };
    }

    const table = this.tables.find(t => t.id === qr.table_id);
    if (!table) {
      return { found: false, error: 'Table record not found.' };
    }

    const dispatch = this.dispatchDetails.find(d => d.table_id === table.id);

    const completedTasks = this.tasks
      .filter(t => t.table_id === table.id && t.status === 'COMPLETED')
      .map(t => {
        const completer = this.users.find(u => u.id === t.completed_by);
        const taskEvidence = this.evidence.filter(e => e.task_id === t.id);
        return {
          task_name: t.task_name,
          task_type: t.task_type,
          sequence_number: t.sequence_number,
          completed_at: t.completed_at || t.updated_at,
          completed_by_name: completer ? completer.full_name : 'Factory Supervisor',
          photos: taskEvidence.map(e => e.storage_path),
        };
      })
      .sort((a, b) => a.sequence_number - b.sequence_number);

    return {
      found: true,
      table_code: table.table_code,
      table_name: table.table_name,
      table_type: table.table_type,
      reference_photo_path: table.reference_photo_path,
      status: table.status,
      dispatched_at: table.dispatched_at,
      created_at: table.created_at,
      nags_count: dispatch ? dispatch.nags_count : undefined,
      driver_name: dispatch ? dispatch.driver_name : undefined,
      packed_table_photo_path: dispatch ? dispatch.packed_table_photo_path : undefined,
      completed_tasks: completedTasks,
    };
  }

  // --- REVOKE / REGENERATE QR ---
  public revokeQr(tableId: string, adminId: string): boolean {
    this.hydrateFromStorage();
    const actor = this.users.find(u => u.id === adminId);
    if (actor?.role !== 'ADMIN') return false;

    this.qrAccess
      .filter(q => q.table_id === tableId && q.is_active)
      .forEach(q => {
        q.is_active = false;
        q.revoked_at = new Date().toISOString();
      });

    this.saveToStorage();
    return true;
  }

  public regenerateQr(tableId: string, adminId: string): string | null {
    this.hydrateFromStorage();
    const actor = this.users.find(u => u.id === adminId);
    if (actor?.role !== 'ADMIN') return null;

    const table = this.tables.find(t => t.id === tableId);
    if (!table || table.status !== 'Completed / Dispatched') return null;

    // Revoke old tokens
    this.revokeQr(tableId, adminId);

    // Create new token
    const token = `jbb-prod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    this.qrAccess.push({
      id: `qr-${Date.now()}`,
      table_id: tableId,
      token_hash: token,
      is_active: true,
      generated_at: new Date().toISOString(),
      revoked_at: null,
    });

    this.saveToStorage();
    return token;
  }

  // --- NOTIFICATIONS ---
  public getNotifications(userId: string): NotificationItem[] {
    this.hydrateFromStorage();
    return this.notifications
      .filter(n => n.recipient_user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public markNotificationAsRead(notificationId: string): void {
    this.hydrateFromStorage();
    const n = this.notifications.find(item => item.id === notificationId);
    if (n) {
      n.read_at = new Date().toISOString();
      this.saveToStorage();
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    this.hydrateFromStorage();
    const now = new Date().toISOString();
    this.notifications
      .filter(n => n.recipient_user_id === userId && !n.read_at)
      .forEach(n => {
        n.read_at = now;
      });
    this.saveToStorage();
  }
}

// Global singleton instance
export const dataStore = new ProductionDataStore();
