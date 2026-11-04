// JBB TableTracker Core Types

export type UserRole = 'ADMIN' | 'SALES' | 'SUPERVISOR';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Factory {
  id: string;
  factory_name: string;
  address?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FactoryAccess {
  id: string;
  user_id: string;
  factory_id: string;
  created_at: string;
}

export type TableType = 'Pool' | 'Snooker' | 'Mini Snooker' | 'American Pool';

export type TableStatus = 
  | 'Submitted' 
  | 'In Progress' 
  | 'Needs Attention' 
  | 'Ready for Dispatch' 
  | 'Completed / Dispatched' 
  | 'Archived';

export interface TableOrder {
  id: string;
  table_code: string;
  table_name: string;
  table_type: TableType;
  reference_photo_path: string;
  salesperson_id: string;
  salesperson?: UserProfile;
  factory_id: string;
  factory?: Factory;
  lead_supervisor_id?: string | null;
  lead_supervisor?: UserProfile | null;
  status: TableStatus;
  claimed_at?: string | null;
  dispatched_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskType = 'BUILD' | 'DISPATCH';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface ProductionTask {
  id: string;
  table_id: string;
  task_name: string;
  remark?: string | null;
  task_type: TaskType;
  sequence_number: number;
  assigned_supervisor_id?: string | null;
  assigned_supervisor?: UserProfile | null;
  status: TaskStatus;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completer?: UserProfile | null;
  previous_workable_status?: 'NOT_STARTED' | 'IN_PROGRESS' | null;
  created_at: string;
  updated_at: string;
  evidence?: TaskCompletionEvidence[];
  open_issue?: TaskIssue | null;
}

export interface TaskCompletionEvidence {
  id: string;
  task_id: string;
  uploaded_by: string;
  storage_path: string;
  evidence_type: string;
  uploaded_at: string;
}

export interface TaskIssue {
  id: string;
  task_id: string;
  reported_by: string;
  reporter?: UserProfile;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolution_note?: string | null;
  resolved_by?: string | null;
  resolver?: UserProfile | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface DispatchDetails {
  id: string;
  table_id: string;
  dispatch_task_id: string;
  nags_count: number;
  driver_name: string;
  driver_phone: string;
  packed_table_photo_path: string;
  submitted_by: string;
  submitted_at: string;
}

export interface ActivityEvent {
  id: string;
  table_id: string;
  task_id?: string | null;
  actor_id: string;
  actor?: UserProfile;
  event_type: 
    | 'TABLE_CREATED'
    | 'TABLE_CLAIMED'
    | 'TASK_ASSIGNED'
    | 'TASK_REASSIGNED'
    | 'TASK_STARTED'
    | 'TASK_BLOCKED'
    | 'PROBLEM_RESOLVED'
    | 'TASK_EDITED'
    | 'TASK_COMPLETED'
    | 'DISPATCH_RECORDED'
    | 'TABLE_COMPLETED'
    | 'QR_GENERATED'
    | 'TASK_REOPENED';
  previous_value?: string | null;
  new_value?: string | null;
  event_metadata?: Record<string, any>;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_table_id: string;
  related_task_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface QrAccessRecord {
  id: string;
  table_id: string;
  token_hash: string;
  is_active: boolean;
  generated_at: string;
  revoked_at?: string | null;
}

export interface PublicTableHistory {
  found: boolean;
  error?: string;
  table_code?: string;
  table_name?: string;
  table_type?: TableType;
  reference_photo_path?: string;
  status?: string;
  dispatched_at?: string | null;
  created_at?: string;
  nags_count?: number;
  driver_name?: string;
  packed_table_photo_path?: string;
  completed_tasks?: Array<{
    task_name: string;
    task_type: TaskType;
    sequence_number: number;
    completed_at: string;
    completed_by_name: string;
    photos: string[];
  }>;
}
