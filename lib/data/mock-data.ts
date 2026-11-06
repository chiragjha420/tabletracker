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
  QrAccessRecord 
} from '@/types';

// Only admin@jbb.com is initialized. All mock users and demo tables are removed.
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'b241a576-8872-45f8-a2c7-44a74a2aa6d3',
    full_name: 'Administrator',
    email: 'admin@jbb.com',
    role: 'ADMIN',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_FACTORIES: Factory[] = [];

export const INITIAL_FACTORY_ACCESS: FactoryAccess[] = [];
export const INITIAL_TABLES: TableOrder[] = [];
export const INITIAL_TASKS: ProductionTask[] = [];
export const INITIAL_EVIDENCE: TaskCompletionEvidence[] = [];
export const INITIAL_ISSUES: TaskIssue[] = [];
export const INITIAL_DISPATCH_DETAILS: DispatchDetails[] = [];
export const INITIAL_ACTIVITY: ActivityEvent[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_QR_ACCESS: QrAccessRecord[] = [];
