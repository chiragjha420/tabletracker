-- Migration 002: Row Level Security (RLS) Policies and Storage Configuration

-- ENABLE RLS ON ALL TABLES
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

-- HELPER FUNCTIONS FOR RLS
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

-- 1. PROFILES POLICIES
CREATE POLICY "Authenticated users can read all active profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.current_user_role() = 'ADMIN');

-- 2. FACTORIES POLICIES
CREATE POLICY "Authenticated users can read active factories"
ON public.factories FOR SELECT
TO authenticated
USING (is_active = true OR public.current_user_role() = 'ADMIN');

CREATE POLICY "Admins can manage factories"
ON public.factories FOR ALL
TO authenticated
USING (public.current_user_role() = 'ADMIN');

-- 3. FACTORY ACCESS POLICIES
CREATE POLICY "Authenticated users can read factory access"
ON public.factory_access FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage factory access"
ON public.factory_access FOR ALL
TO authenticated
USING (public.current_user_role() = 'ADMIN');

-- 4. TABLES POLICIES
CREATE POLICY "Users can view tables for their authorized factories"
ON public.tables FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'ADMIN' OR
  public.current_user_role() = 'SALES' OR
  public.has_factory_access(factory_id)
);

CREATE POLICY "Sales and Admins can insert tables"
ON public.tables FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('ADMIN', 'SALES')
);

CREATE POLICY "Admins and Sales can update tables"
ON public.tables FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'ADMIN' OR
  (public.current_user_role() = 'SALES' AND salesperson_id = auth.uid()) OR
  (public.current_user_role() = 'SUPERVISOR' AND public.has_factory_access(factory_id))
);

-- 5. TASKS POLICIES
CREATE POLICY "Users can view tasks for accessible tables"
ON public.tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.id = tasks.table_id AND (
      public.current_user_role() = 'ADMIN' OR
      public.current_user_role() = 'SALES' OR
      public.has_factory_access(t.factory_id)
    )
  )
);

CREATE POLICY "Admins and Sales can insert tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('ADMIN', 'SALES')
);

CREATE POLICY "Authorized users can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'ADMIN' OR
  EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.id = tasks.table_id AND (
      (public.current_user_role() = 'SALES' AND t.salesperson_id = auth.uid()) OR
      (public.current_user_role() = 'SUPERVISOR' AND public.has_factory_access(t.factory_id))
    )
  )
);

-- 6. TASK COMPLETION EVIDENCE POLICIES
CREATE POLICY "Users can view completion evidence"
ON public.task_completion_evidence FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors and Admins can insert evidence"
ON public.task_completion_evidence FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('ADMIN', 'SUPERVISOR')
);

-- 7. TASK ISSUES POLICIES
CREATE POLICY "Users can view task issues"
ON public.task_issues FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors can report task issues"
ON public.task_issues FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('ADMIN', 'SUPERVISOR')
);

CREATE POLICY "Admins and Lead Supervisors can resolve task issues"
ON public.task_issues FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'ADMIN' OR
  EXISTS (
    SELECT 1 FROM public.tasks tk
    JOIN public.tables tb ON tb.id = tk.table_id
    WHERE tk.id = task_issues.task_id AND tb.lead_supervisor_id = auth.uid()
  )
);

-- 8. DISPATCH DETAILS POLICIES
CREATE POLICY "Users can view dispatch details"
ON public.dispatch_details FOR SELECT
TO authenticated
USING (true);

-- 9. ACTIVITY EVENTS POLICIES
CREATE POLICY "Users can view activity events"
ON public.activity_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert activity events"
ON public.activity_events FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- 10. NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid());

-- 11. QR ACCESS POLICIES
-- Public access for valid hash verification
CREATE POLICY "Anyone can verify active QR tokens"
ON public.qr_access FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage QR tokens"
ON public.qr_access FOR ALL
TO authenticated
USING (public.current_user_role() = 'ADMIN');

-- PUBLIC FUNCTION TO RETRIEVE QR TABLE PRODUCTION RECORD SECURELY
-- Sanitized: DOES NOT expose driver phone number, internal alerts, private remarks, or internal user IDs
CREATE OR REPLACE FUNCTION public.get_public_table_history(p_token_hash TEXT)
RETURNS JSONB AS $$
DECLARE
  v_table_id UUID;
  v_result JSONB;
BEGIN
  -- Validate active token
  SELECT table_id INTO v_table_id
  FROM public.qr_access
  WHERE token_hash = p_token_hash AND is_active = true;

  IF v_table_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'Invalid, expired or revoked QR token.');
  END IF;

  SELECT jsonb_build_object(
    'found', true,
    'table_code', t.table_code,
    'table_name', t.table_name,
    'table_type', t.table_type,
    'reference_photo_path', t.reference_photo_path,
    'status', t.status,
    'dispatched_at', t.dispatched_at,
    'created_at', t.created_at,
    'nags_count', d.nags_count,
    'driver_name', d.driver_name,
    'packed_table_photo_path', d.packed_table_photo_path,
    'completed_tasks', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'task_name', tk.task_name,
          'task_type', tk.task_type,
          'sequence_number', tk.sequence_number,
          'completed_at', tk.completed_at,
          'completed_by_name', cp.full_name,
          'photos', (
            SELECT COALESCE(jsonb_agg(e.storage_path ORDER BY e.uploaded_at ASC), '[]'::jsonb)
            FROM public.task_completion_evidence e
            WHERE e.task_id = tk.id
          )
        ) ORDER BY tk.sequence_number ASC
      ), '[]'::jsonb)
      FROM public.tasks tk
      LEFT JOIN public.profiles cp ON cp.id = tk.completed_by
      WHERE tk.table_id = t.id AND tk.status = 'COMPLETED'
    )
  ) INTO v_result
  FROM public.tables t
  LEFT JOIN public.dispatch_details d ON d.table_id = t.id
  WHERE t.id = v_table_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
