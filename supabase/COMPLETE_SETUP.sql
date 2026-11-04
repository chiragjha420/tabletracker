-- ==============================================================================
-- JBB TableTracker: Complete Production Database Schema, Security & Bootstrap
-- Run this entire script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLES & CONSTRAINTS
-- ------------------------------------------------------------------------------

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SALES', 'SUPERVISOR')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factories
CREATE TABLE IF NOT EXISTS public.factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_name TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factory Access (Supervisors)
CREATE TABLE IF NOT EXISTS public.factory_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, factory_id)
);

-- Tables (Manufacturing Orders)
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

-- Production Tasks
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

-- Task Completion Evidence (Photos)
CREATE TABLE IF NOT EXISTS public.task_completion_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'PHOTO',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task Issues / Alerts
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

-- Dispatch Details
CREATE TABLE IF NOT EXISTS public.dispatch_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  dispatch_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  nags_count INT NOT NULL CHECK (nags_count >= 0),
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  packed_table_photo_path TEXT NOT NULL,
  dispatched_by UUID NOT NULL REFERENCES public.profiles(id),
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity Events (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  event_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- QR Access Tokens
CREATE TABLE IF NOT EXISTS public.qr_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 2. BUSINESS LOGIC FUNCTIONS & PROCEDURES
-- ------------------------------------------------------------------------------

-- Recalculate Table Status
CREATE OR REPLACE FUNCTION public.recalculate_table_status(p_table_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_current_status TEXT;
  v_has_blocked BOOLEAN;
  v_has_incomplete_build BOOLEAN;
  v_has_build_tasks BOOLEAN;
  v_dispatch_completed BOOLEAN;
  v_lead_assigned BOOLEAN;
  v_has_in_progress BOOLEAN;
  v_new_status TEXT;
BEGIN
  SELECT status, (lead_supervisor_id IS NOT NULL) INTO v_current_status, v_lead_assigned
  FROM public.tables WHERE id = p_table_id;

  IF v_current_status = 'Archived' THEN
    RETURN 'Archived';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE table_id = p_table_id AND task_type = 'DISPATCH' AND status = 'COMPLETED'
  ) INTO v_dispatch_completed;

  IF v_dispatch_completed THEN
    UPDATE public.tables SET status = 'Completed / Dispatched', updated_at = now() WHERE id = p_table_id;
    RETURN 'Completed / Dispatched';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE table_id = p_table_id AND status = 'BLOCKED'
  ) INTO v_has_blocked;

  IF v_has_blocked THEN
    UPDATE public.tables SET status = 'Needs Attention', updated_at = now() WHERE id = p_table_id;
    RETURN 'Needs Attention';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE table_id = p_table_id AND task_type = 'BUILD'
  ) INTO v_has_build_tasks;

  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE table_id = p_table_id AND task_type = 'BUILD' AND status != 'COMPLETED'
  ) INTO v_has_incomplete_build;

  IF v_has_build_tasks AND NOT v_has_incomplete_build THEN
    v_new_status := 'Ready for Dispatch';
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE table_id = p_table_id AND status = 'IN_PROGRESS'
    ) INTO v_has_in_progress;

    IF v_lead_assigned OR v_has_in_progress THEN
      v_new_status := 'In Progress';
    ELSE
      v_new_status := 'Submitted';
    END IF;
  END IF;

  UPDATE public.tables SET status = v_new_status, updated_at = now() WHERE id = p_table_id;
  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Table Claiming
CREATE OR REPLACE FUNCTION public.claim_table(p_table_id UUID, p_supervisor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_claimed_rows INT;
  v_factory_id UUID;
  v_has_access BOOLEAN;
  v_table_name TEXT;
  v_salesperson_id UUID;
BEGIN
  SELECT factory_id, table_name, salesperson_id INTO v_factory_id, v_table_name, v_salesperson_id
  FROM public.tables WHERE id = p_table_id;

  IF v_factory_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Table not found.');
  END IF;

  SELECT (
    EXISTS (SELECT 1 FROM public.factory_access WHERE user_id = p_supervisor_id AND factory_id = v_factory_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = p_supervisor_id AND role IN ('ADMIN', 'SALES'))
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('success', false, 'message', 'Supervisor is not authorized for this factory.');
  END IF;

  UPDATE public.tables
  SET lead_supervisor_id = p_supervisor_id,
      claimed_at = now(),
      status = 'In Progress',
      updated_at = now()
  WHERE id = p_table_id AND lead_supervisor_id IS NULL;

  GET DIAGNOSTICS v_claimed_rows = ROW_COUNT;

  IF v_claimed_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Table has already been claimed by another supervisor.');
  END IF;

  INSERT INTO public.activity_events (table_id, actor_id, event_type, previous_value, new_value, event_metadata)
  VALUES (
    p_table_id,
    p_supervisor_id,
    'TABLE_CLAIMED',
    'Submitted',
    'In Progress',
    jsonb_build_object('lead_supervisor_id', p_supervisor_id)
  );

  INSERT INTO public.notifications (recipient_user_id, notification_type, title, message, related_table_id)
  VALUES (
    v_salesperson_id,
    'TABLE_CLAIMED',
    'Table Order Claimed',
    format('Table "%s" has been claimed by a factory supervisor.', v_table_name),
    p_table_id
  );

  RETURN jsonb_build_object('success', true, 'message', 'Table successfully claimed.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete Final Dispatch Gatekeeper
CREATE OR REPLACE FUNCTION public.complete_dispatch(
  p_table_id UUID,
  p_supervisor_id UUID,
  p_nags_count INT,
  p_driver_name TEXT,
  p_driver_phone TEXT,
  p_packed_photo_path TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_dispatch_task_id UUID;
  v_blocked_count INT;
  v_incomplete_count INT;
  v_missing_evidence_count INT;
  v_token TEXT;
  v_salesperson_id UUID;
  v_table_name TEXT;
BEGIN
  IF p_nags_count IS NULL OR p_nags_count < 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Total Nags Prepared must be 0 or greater.');
  END IF;

  IF p_driver_name IS NULL OR length(trim(p_driver_name)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Driver Name is required.');
  END IF;

  IF p_driver_phone IS NULL OR length(trim(p_driver_phone)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Valid Driver Phone Number is required.');
  END IF;

  IF p_packed_photo_path IS NULL OR length(trim(p_packed_photo_path)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Packed Table Photo is mandatory.');
  END IF;

  SELECT id INTO v_dispatch_task_id FROM public.tasks WHERE table_id = p_table_id AND task_type = 'DISPATCH';
  IF v_dispatch_task_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Missing required Dispatch & Packing checkpoint task.');
  END IF;

  SELECT COUNT(*) INTO v_blocked_count FROM public.tasks WHERE table_id = p_table_id AND task_type = 'BUILD' AND status = 'BLOCKED';
  IF v_blocked_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', format('Cannot dispatch: %s build task(s) are blocked.', v_blocked_count));
  END IF;

  SELECT COUNT(*) INTO v_incomplete_count FROM public.tasks WHERE table_id = p_table_id AND task_type = 'BUILD' AND status != 'COMPLETED';
  IF v_incomplete_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', format('Cannot dispatch: %s build task(s) remain incomplete.', v_incomplete_count));
  END IF;

  SELECT COUNT(*) INTO v_missing_evidence_count
  FROM public.tasks t
  WHERE t.table_id = p_table_id AND t.task_type = 'BUILD'
    AND NOT EXISTS (SELECT 1 FROM public.task_completion_evidence e WHERE e.task_id = t.id);

  IF v_missing_evidence_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', format('Cannot dispatch: %s completed build task(s) lack photographic evidence.', v_missing_evidence_count));
  END IF;

  UPDATE public.tasks
  SET status = 'COMPLETED',
      completed_at = now(),
      completed_by = p_supervisor_id,
      updated_at = now()
  WHERE id = v_dispatch_task_id;

  INSERT INTO public.dispatch_details (
    table_id, dispatch_task_id, nags_count, driver_name, driver_phone,
    packed_table_photo_path, dispatched_by, dispatched_at
  )
  VALUES (
    p_table_id, v_dispatch_task_id, p_nags_count, trim(p_driver_name),
    trim(p_driver_phone), trim(p_packed_photo_path), p_supervisor_id, now()
  );

  INSERT INTO public.task_completion_evidence (task_id, uploaded_by, storage_path, evidence_type)
  VALUES (v_dispatch_task_id, p_supervisor_id, trim(p_packed_photo_path), 'PHOTO');

  UPDATE public.tables
  SET status = 'Completed / Dispatched',
      dispatched_at = now(),
      updated_at = now()
  WHERE id = p_table_id
  RETURNING salesperson_id, table_name INTO v_salesperson_id, v_table_name;

  v_token := 'jbb-prod-' || encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.qr_access (table_id, token_hash, is_active, generated_at)
  VALUES (p_table_id, v_token, true, now());

  INSERT INTO public.activity_events (table_id, task_id, actor_id, event_type, previous_value, new_value, event_metadata)
  VALUES (
    p_table_id, v_dispatch_task_id, p_supervisor_id, 'TABLE_DISPATCHED',
    'Ready for Dispatch', 'Completed / Dispatched',
    jsonb_build_object('nags_count', p_nags_count, 'driver_name', p_driver_name, 'qr_token', v_token)
  );

  INSERT INTO public.notifications (recipient_user_id, notification_type, title, message, related_table_id)
  VALUES (
    v_salesperson_id, 'TABLE_DISPATCHED', 'Table Dispatched',
    format('Table "%s" has been verified, packed, and dispatched.', v_table_name), p_table_id
  );

  RETURN jsonb_build_object('success', true, 'message', 'Table successfully dispatched.', 'qr_token', v_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reopen Task (Admin Only)
CREATE OR REPLACE FUNCTION public.reopen_task(p_task_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  v_table_id UUID;
  v_prev_status TEXT;
  v_task_name TEXT;
  v_supervisor_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'ADMIN') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only administrators can reopen completed tasks.');
  END IF;

  SELECT table_id, status, task_name, assigned_supervisor_id INTO v_table_id, v_prev_status, v_task_name, v_supervisor_id
  FROM public.tasks WHERE id = p_task_id;

  IF v_prev_status != 'COMPLETED' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only completed tasks can be reopened.');
  END IF;

  UPDATE public.tasks
  SET status = 'IN_PROGRESS', completed_at = NULL, completed_by = NULL, updated_at = now()
  WHERE id = p_task_id;

  UPDATE public.tasks
  SET status = 'NOT_STARTED', completed_at = NULL, completed_by = NULL, updated_at = now()
  WHERE table_id = v_table_id AND task_type = 'DISPATCH';

  UPDATE public.qr_access
  SET is_active = false, revoked_at = now()
  WHERE table_id = v_table_id AND is_active = true;

  PERFORM public.recalculate_table_status(v_table_id);

  INSERT INTO public.activity_events (table_id, task_id, actor_id, event_type, previous_value, new_value, event_metadata)
  VALUES (
    v_table_id, p_task_id, p_admin_id, 'TASK_REOPENED',
    'COMPLETED', 'IN_PROGRESS', jsonb_build_object('reason', p_reason)
  );

  INSERT INTO public.notifications (recipient_user_id, notification_type, title, message, related_table_id, related_task_id)
  SELECT DISTINCT p.id, 'TASK_REOPENED', 'Task Reopened',
    format('Task "%s" has been reopened by admin. Reason: %s', v_task_name, p_reason),
    v_table_id, p_task_id
  FROM public.tables t
  JOIN public.profiles p ON (p.id = v_supervisor_id OR p.id = t.lead_supervisor_id)
  WHERE t.id = v_table_id AND p.is_active = true;

  RETURN jsonb_build_object('success', true, 'message', 'Task reopened successfully. QR revoked.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completion_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_factory_access(target_factory_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.factory_access 
    WHERE user_id = auth.uid() AND factory_id = target_factory_id
  ) OR (public.current_user_role() IN ('ADMIN', 'SALES'));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Authenticated users can read all active profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read all active profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL TO authenticated USING (public.current_user_role() = 'ADMIN');

-- Factories Policies
DROP POLICY IF EXISTS "Authenticated users can read active factories" ON public.factories;
CREATE POLICY "Authenticated users can read active factories"
ON public.factories FOR SELECT TO authenticated USING (is_active = true OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "Admins can manage factories" ON public.factories;
CREATE POLICY "Admins can manage factories"
ON public.factories FOR ALL TO authenticated USING (public.current_user_role() = 'ADMIN');

-- Factory Access Policies
DROP POLICY IF EXISTS "Authenticated users can read factory access" ON public.factory_access;
CREATE POLICY "Authenticated users can read factory access"
ON public.factory_access FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage factory access" ON public.factory_access;
CREATE POLICY "Admins can manage factory access"
ON public.factory_access FOR ALL TO authenticated USING (public.current_user_role() = 'ADMIN');

-- Tables Policies
DROP POLICY IF EXISTS "Users can view tables for their authorized factories" ON public.tables;
CREATE POLICY "Users can view tables for their authorized factories"
ON public.tables FOR SELECT TO authenticated USING (
  public.current_user_role() = 'ADMIN' OR
  public.current_user_role() = 'SALES' OR
  public.has_factory_access(factory_id)
);

DROP POLICY IF EXISTS "Sales and Admins can insert tables" ON public.tables;
CREATE POLICY "Sales and Admins can insert tables"
ON public.tables FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() IN ('ADMIN', 'SALES')
);

DROP POLICY IF EXISTS "Admins and Sales can update tables" ON public.tables;
CREATE POLICY "Admins and Sales can update tables"
ON public.tables FOR UPDATE TO authenticated USING (
  public.current_user_role() = 'ADMIN' OR
  (public.current_user_role() = 'SALES' AND salesperson_id = auth.uid()) OR
  (public.current_user_role() = 'SUPERVISOR' AND public.has_factory_access(factory_id))
);

-- Tasks Policies
DROP POLICY IF EXISTS "Users can view tasks for accessible tables" ON public.tasks;
CREATE POLICY "Users can view tasks for accessible tables"
ON public.tasks FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.id = public.tasks.table_id AND (
      public.current_user_role() IN ('ADMIN', 'SALES') OR
      public.has_factory_access(t.factory_id)
    )
  )
);

DROP POLICY IF EXISTS "Supervisors and Admins can update tasks" ON public.tasks;
CREATE POLICY "Supervisors and Admins can update tasks"
ON public.tasks FOR UPDATE TO authenticated USING (
  public.current_user_role() = 'ADMIN' OR
  public.current_user_role() = 'SUPERVISOR'
);

DROP POLICY IF EXISTS "Sales and Admins can insert tasks" ON public.tasks;
CREATE POLICY "Sales and Admins can insert tasks"
ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() IN ('ADMIN', 'SALES')
);

-- Task Completion Evidence Policies
DROP POLICY IF EXISTS "Users can view evidence" ON public.task_completion_evidence;
CREATE POLICY "Users can view evidence"
ON public.task_completion_evidence FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and Admins can insert evidence" ON public.task_completion_evidence;
CREATE POLICY "Supervisors and Admins can insert evidence"
ON public.task_completion_evidence FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() IN ('SUPERVISOR', 'ADMIN')
);

-- Task Issues Policies
DROP POLICY IF EXISTS "Users can view issues" ON public.task_issues;
CREATE POLICY "Users can view issues"
ON public.task_issues FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and Admins can report issues" ON public.task_issues;
CREATE POLICY "Supervisors and Admins can report issues"
ON public.task_issues FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() IN ('SUPERVISOR', 'ADMIN')
);

DROP POLICY IF EXISTS "Admins and Supervisors can update issues" ON public.task_issues;
CREATE POLICY "Admins and Supervisors can update issues"
ON public.task_issues FOR UPDATE TO authenticated USING (
  public.current_user_role() IN ('ADMIN', 'SUPERVISOR')
);

-- Dispatch Details Policies
DROP POLICY IF EXISTS "Users can view dispatch details" ON public.dispatch_details;
CREATE POLICY "Users can view dispatch details"
ON public.dispatch_details FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and Admins can insert dispatch" ON public.dispatch_details;
CREATE POLICY "Supervisors and Admins can insert dispatch"
ON public.dispatch_details FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() IN ('SUPERVISOR', 'ADMIN')
);

-- Activity Events Policies
DROP POLICY IF EXISTS "Users can view activity events" ON public.activity_events;
CREATE POLICY "Users can view activity events"
ON public.activity_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_events;
CREATE POLICY "Authenticated users can insert activity"
ON public.activity_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- QR Access Tokens Policies
DROP POLICY IF EXISTS "Admins and Supervisors can view QR tokens" ON public.qr_access;
CREATE POLICY "Admins and Supervisors can view QR tokens"
ON public.qr_access FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('ADMIN', 'SUPERVISOR', 'SALES')
);

-- Public Certificate Sanitized Function (Unauthenticated Public Access)
CREATE OR REPLACE FUNCTION public.get_public_table_history(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_table_id UUID;
  v_is_active BOOLEAN;
  v_table RECORD;
  v_dispatch RECORD;
  v_tasks JSONB;
BEGIN
  SELECT table_id, is_active INTO v_table_id, v_is_active
  FROM public.qr_access WHERE token_hash = p_token;

  IF v_table_id IS NULL OR NOT v_is_active THEN
    RETURN jsonb_build_object('found', false, 'error', 'Invalid or revoked production certificate.');
  END IF;

  SELECT table_code, table_name, table_type, reference_photo_path, status, dispatched_at, created_at
  INTO v_table FROM public.tables WHERE id = v_table_id;

  SELECT nags_count, driver_name, packed_table_photo_path
  INTO v_dispatch FROM public.dispatch_details WHERE table_id = v_table_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'task_name', t.task_name,
      'task_type', t.task_type,
      'sequence_number', t.sequence_number,
      'completed_at', t.completed_at,
      'completed_by_name', COALESCE(p.full_name, 'Factory Supervisor'),
      'photos', (
        SELECT jsonb_agg(storage_path)
        FROM public.task_completion_evidence e
        WHERE e.task_id = t.id
      )
    ) ORDER BY t.sequence_number
  ) INTO v_tasks
  FROM public.tasks t
  LEFT JOIN public.profiles p ON p.id = t.completed_by
  WHERE t.table_id = v_table_id AND t.status = 'COMPLETED';

  RETURN jsonb_build_object(
    'found', true,
    'table_code', v_table.table_code,
    'table_name', v_table.table_name,
    'table_type', v_table.table_type,
    'reference_photo_path', v_table.reference_photo_path,
    'status', v_table.status,
    'dispatched_at', v_table.dispatched_at,
    'created_at', v_table.created_at,
    'nags_count', v_dispatch.nags_count,
    'driver_name', v_dispatch.driver_name,
    'packed_table_photo_path', v_dispatch.packed_table_photo_path,
    'completed_tasks', COALESCE(v_tasks, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_public_table_history(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. STORAGE BUCKETS
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('table-references', 'table-references', true),
  ('task-completions', 'task-completions', true),
  ('dispatch', 'dispatch', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for table-references" ON storage.objects;
CREATE POLICY "Public Read Access for table-references"
ON storage.objects FOR SELECT
USING (bucket_id IN ('table-references', 'task-completions', 'dispatch'));

DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('table-references', 'task-completions', 'dispatch'));

DROP POLICY IF EXISTS "Authenticated Update/Delete Access" ON storage.objects;
CREATE POLICY "Authenticated Update/Delete Access"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id IN ('table-references', 'task-completions', 'dispatch'));

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE TRIGGER ON AUTH.USERS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_user BOOLEAN;
  v_role TEXT;
  v_is_active BOOLEAN;
BEGIN
  -- If there are no active admin profiles, this user is the Admin!
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'ADMIN') INTO v_first_user;

  IF v_first_user THEN
    v_role := 'ADMIN';
    v_is_active := true;
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'SUPERVISOR');
    v_is_active := false; -- Requires approval by admin
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    v_is_active,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 6. SEED FACTORIES
-- ------------------------------------------------------------------------------

INSERT INTO public.factories (id, factory_name, address, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Bangalore Main Facility', 'Plot 42, Peenya Industrial Area, Bangalore, Karnataka', true),
  ('a0000000-0000-0000-0000-000000000002', 'Hosur Satellite Unit', 'Phase 2, SIPCOT Industrial Complex, Hosur, Tamil Nadu', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. BOOTSTRAP EXISTING USERS IN AUTH.USERS AS ADMIN
-- ------------------------------------------------------------------------------

-- Immediately sync your registered user into public.profiles as an approved ADMIN:
INSERT INTO public.profiles (id, full_name, email, role, is_active, created_at, updated_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
  email, 
  'ADMIN', 
  true, 
  now(), 
  now()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', is_active = true;
