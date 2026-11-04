-- JBB TableTracker Database Schema
-- Migration 001: Initial Schema, Constraints, Functions, RLS and Triggers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends auth.users or acts as user directory)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SALES', 'SUPERVISOR')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FACTORIES
CREATE TABLE IF NOT EXISTS public.factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_name TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FACTORY ACCESS (Multi-factory assignment for supervisors)
CREATE TABLE IF NOT EXISTS public.factory_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, factory_id)
);

-- 4. TABLES (Manufacturing Orders)
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_code TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  table_type TEXT NOT NULL CHECK (table_type IN ('Pool', 'Snooker', 'Mini Snooker', 'American Pool')),
  reference_photo_path TEXT NOT NULL,
  salesperson_id UUID NOT NULL REFERENCES public.profiles(id),
  factory_id UUID NOT NULL REFERENCES public.factories(id),
  lead_supervisor_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Progress', 'Needs Attention', 'Ready for Dispatch', 'Completed / Dispatched', 'Archived')),
  claimed_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  remark TEXT,
  task_type TEXT NOT NULL DEFAULT 'BUILD' CHECK (task_type IN ('BUILD', 'DISPATCH')),
  sequence_number INT NOT NULL,
  assigned_supervisor_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  previous_workable_status TEXT CHECK (previous_workable_status IN ('NOT_STARTED', 'IN_PROGRESS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TASK COMPLETION EVIDENCE
CREATE TABLE IF NOT EXISTS public.task_completion_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'PHOTO',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TASK ISSUES / ALERTS
CREATE TABLE IF NOT EXISTS public.task_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolution_note TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 8. DISPATCH DETAILS
CREATE TABLE IF NOT EXISTS public.dispatch_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  dispatch_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  nags_count INT NOT NULL CHECK (nags_count >= 0),
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  packed_table_photo_path TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ACTIVITY EVENTS (Append-only audit trail)
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  event_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. QR ACCESS (Public tokens for completed tables)
CREATE TABLE IF NOT EXISTS public.qr_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_factory_id ON public.tables(factory_id);
CREATE INDEX IF NOT EXISTS idx_tables_salesperson_id ON public.tables(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_tables_lead_supervisor_id ON public.tables(lead_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_table_id ON public.tasks(table_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_supervisor ON public.tasks(assigned_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_activity_events_table_id ON public.activity_events(table_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_token ON public.qr_access(token_hash);

-- RECALCULATE TABLE STATUS FUNCTION
-- Condition Priority:
-- 1. If archived -> 'Archived'
-- 2. If dispatch task completed -> 'Completed / Dispatched'
-- 3. If any task is BLOCKED -> 'Needs Attention'
-- 4. If all BUILD tasks are COMPLETED -> 'Ready for Dispatch'
-- 5. If lead_supervisor_id is set or any task is IN_PROGRESS -> 'In Progress'
-- 6. Else -> 'Submitted'
CREATE OR REPLACE FUNCTION public.recalculate_table_status(target_table_id UUID)
RETURNS TEXT AS $$
DECLARE
  current_status TEXT;
  lead_sup UUID;
  has_blocked BOOLEAN;
  total_build_tasks INT;
  completed_build_tasks INT;
  dispatch_completed BOOLEAN;
  new_status TEXT;
BEGIN
  SELECT status, lead_supervisor_id INTO current_status, lead_sup 
  FROM public.tables WHERE id = target_table_id;

  IF current_status = 'Archived' THEN
    RETURN 'Archived';
  END IF;

  -- Check if dispatch completed
  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE table_id = target_table_id AND task_type = 'DISPATCH' AND status = 'COMPLETED'
  ) INTO dispatch_completed;

  IF dispatch_completed THEN
    new_status := 'Completed / Dispatched';
  ELSE
    -- Check if any task is BLOCKED
    SELECT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE table_id = target_table_id AND status = 'BLOCKED'
    ) INTO has_blocked;

    IF has_blocked THEN
      new_status := 'Needs Attention';
    ELSE
      -- Count build tasks
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'COMPLETED')
      INTO total_build_tasks, completed_build_tasks
      FROM public.tasks
      WHERE table_id = target_table_id AND task_type = 'BUILD';

      IF total_build_tasks > 0 AND total_build_tasks = completed_build_tasks THEN
        new_status := 'Ready for Dispatch';
      ELSIF lead_sup IS NOT NULL OR EXISTS (
        SELECT 1 FROM public.tasks WHERE table_id = target_table_id AND status = 'IN_PROGRESS'
      ) THEN
        new_status := 'In Progress';
      ELSE
        new_status := 'Submitted';
      END IF;
    END IF;
  END IF;

  UPDATE public.tables 
  SET status = new_status, updated_at = now() 
  WHERE id = target_table_id;

  RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATOMIC TABLE CLAIM FUNCTION
-- Ensures two supervisors cannot claim the same unclaimed table simultaneously
CREATE OR REPLACE FUNCTION public.claim_table(target_table_id UUID, claiming_supervisor_id UUID)
RETURNS JSONB AS $$
DECLARE
  updated_rows INT;
  tbl_record RECORD;
BEGIN
  -- Atomically update only if lead_supervisor_id is currently NULL and status != 'Archived'
  UPDATE public.tables
  SET lead_supervisor_id = claiming_supervisor_id,
      claimed_at = now(),
      status = 'In Progress',
      updated_at = now()
  WHERE id = target_table_id 
    AND lead_supervisor_id IS NULL
    AND status NOT IN ('Archived', 'Completed / Dispatched');

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Table has already been claimed or is unavailable.');
  END IF;

  -- Record activity event
  INSERT INTO public.activity_events (table_id, actor_id, event_type, new_value, event_metadata)
  VALUES (
    target_table_id,
    claiming_supervisor_id,
    'TABLE_CLAIMED',
    'In Progress',
    jsonb_build_object('claimed_by', claiming_supervisor_id)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Table claimed successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATOMIC DISPATCH COMPLETION FUNCTION
-- Backend gate: Validates all build tasks are COMPLETED with valid photos
CREATE OR REPLACE FUNCTION public.complete_dispatch(
  target_table_id UUID,
  dispatch_supervisor_id UUID,
  p_nags_count INT,
  p_driver_name TEXT,
  p_driver_phone TEXT,
  p_packed_photo_path TEXT,
  p_qr_token_hash TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_dispatch_task_id UUID;
  v_incomplete_count INT;
  v_missing_evidence_count INT;
  v_blocked_count INT;
BEGIN
  -- 1. Check if table is archived or already dispatched
  IF EXISTS (SELECT 1 FROM public.tables WHERE id = target_table_id AND status IN ('Archived', 'Completed / Dispatched')) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Table is already completed or archived.');
  END IF;

  -- 2. Find dispatch task
  SELECT id INTO v_dispatch_task_id FROM public.tasks 
  WHERE table_id = target_table_id AND task_type = 'DISPATCH'
  LIMIT 1;

  IF v_dispatch_task_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Dispatch task not found for this table.');
  END IF;

  -- 3. Check for blocked build tasks
  SELECT COUNT(*) INTO v_blocked_count FROM public.tasks
  WHERE table_id = target_table_id AND task_type = 'BUILD' AND status = 'BLOCKED';

  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', format('Cannot dispatch: %s build task(s) are currently blocked.', v_blocked_count)
    );
  END IF;

  -- 4. Check for incomplete build tasks
  SELECT COUNT(*) INTO v_incomplete_count FROM public.tasks
  WHERE table_id = target_table_id AND task_type = 'BUILD' AND status != 'COMPLETED';

  IF v_incomplete_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', format('Cannot dispatch: %s build task(s) are not completed yet.', v_incomplete_count)
    );
  END IF;

  -- 5. Verify every completed build task has evidence
  SELECT COUNT(*) INTO v_missing_evidence_count FROM public.tasks t
  WHERE t.table_id = target_table_id 
    AND t.task_type = 'BUILD'
    AND NOT EXISTS (
      SELECT 1 FROM public.task_completion_evidence e WHERE e.task_id = t.id
    );

  IF v_missing_evidence_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Cannot dispatch: %s build task(s) are missing required photographic completion evidence.', v_missing_evidence_count)
    );
  END IF;

  -- 6. Insert dispatch details
  INSERT INTO public.dispatch_details (
    table_id, dispatch_task_id, nags_count, driver_name, driver_phone,
    packed_table_photo_path, submitted_by, submitted_at
  ) VALUES (
    target_table_id, v_dispatch_task_id, p_nags_count, p_driver_name, p_driver_phone,
    p_packed_photo_path, dispatch_supervisor_id, now()
  );

  -- 7. Mark dispatch task completed
  UPDATE public.tasks
  SET status = 'COMPLETED',
      completed_at = now(),
      completed_by = dispatch_supervisor_id,
      updated_at = now()
  WHERE id = v_dispatch_task_id;

  -- 8. Add dispatch photo as completion evidence for dispatch task
  INSERT INTO public.task_completion_evidence (
    task_id, uploaded_by, storage_path, evidence_type
  ) VALUES (
    v_dispatch_task_id, dispatch_supervisor_id, p_packed_photo_path, 'DISPATCH_PACKED_PHOTO'
  );

  -- 9. Mark table Completed / Dispatched
  UPDATE public.tables
  SET status = 'Completed / Dispatched',
      dispatched_at = now(),
      updated_at = now()
  WHERE id = target_table_id;

  -- 10. Generate QR access token record
  INSERT INTO public.qr_access (table_id, token_hash, is_active, generated_at)
  VALUES (target_table_id, p_qr_token_hash, true, now());

  -- 11. Record activity events
  INSERT INTO public.activity_events (table_id, task_id, actor_id, event_type, new_value, event_metadata)
  VALUES (
    target_table_id,
    v_dispatch_task_id,
    dispatch_supervisor_id,
    'DISPATCH_RECORDED',
    'Completed / Dispatched',
    jsonb_build_object(
      'nags_count', p_nags_count,
      'driver_name', p_driver_name,
      'driver_phone', p_driver_phone
    )
  );

  -- 12. Create notifications for salesperson and admins
  INSERT INTO public.notifications (recipient_user_id, notification_type, title, message, related_table_id, related_task_id)
  SELECT 
    p.id, 
    'TABLE_DISPATCHED',
    'Table Dispatched',
    format('Table %s has been dispatched and completed.', t.table_name),
    target_table_id,
    v_dispatch_task_id
  FROM public.tables t
  JOIN public.profiles p ON (p.id = t.salesperson_id OR p.role = 'ADMIN')
  WHERE t.id = target_table_id AND p.is_active = true;

  RETURN jsonb_build_object('success', true, 'message', 'Table successfully dispatched.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REOPEN TASK (Admin only)
-- Reopening a completed task invalidates QR access and shifts table out of Completed
CREATE OR REPLACE FUNCTION public.reopen_task(
  p_task_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_table_id UUID;
  v_prev_status TEXT;
  v_task_name TEXT;
  v_supervisor_id UUID;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'ADMIN') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only administrators can reopen completed tasks.');
  END IF;

  SELECT table_id, status, task_name, assigned_supervisor_id 
  INTO v_table_id, v_prev_status, v_task_name, v_supervisor_id
  FROM public.tasks WHERE id = p_task_id;

  IF v_prev_status != 'COMPLETED' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only completed tasks can be reopened.');
  END IF;

  -- Reopen task to IN_PROGRESS
  UPDATE public.tasks
  SET status = 'IN_PROGRESS',
      completed_at = NULL,
      completed_by = NULL,
      updated_at = now()
  WHERE id = p_task_id;

  -- Also reset dispatch task if present since table is now back in production
  UPDATE public.tasks
  SET status = 'NOT_STARTED',
      completed_at = NULL,
      completed_by = NULL,
      updated_at = now()
  WHERE table_id = v_table_id AND task_type = 'DISPATCH';

  -- Revoke QR access for table
  UPDATE public.qr_access
  SET is_active = false, revoked_at = now()
  WHERE table_id = v_table_id AND is_active = true;

  -- Recalculate table status
  PERFORM public.recalculate_table_status(v_table_id);

  -- Record activity
  INSERT INTO public.activity_events (table_id, task_id, actor_id, event_type, previous_value, new_value, event_metadata)
  VALUES (
    v_table_id,
    p_task_id,
    p_admin_id,
    'TASK_REOPENED',
    'COMPLETED',
    'IN_PROGRESS',
    jsonb_build_object('reason', p_reason)
  );

  -- Notify assigned supervisor and lead supervisor
  INSERT INTO public.notifications (recipient_user_id, notification_type, title, message, related_table_id, related_task_id)
  SELECT DISTINCT p.id, 'TASK_REOPENED', 'Task Reopened',
    format('Task "%s" has been reopened by admin. Reason: %s', v_task_name, p_reason),
    v_table_id, p_task_id
  FROM public.tables t
  JOIN public.profiles p ON (p.id = v_supervisor_id OR p.id = t.lead_supervisor_id)
  WHERE t.id = v_table_id AND p.is_active = true;

  RETURN jsonb_build_object('success', true, 'message', 'Task reopened successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
