-- Migration 003: Storage Buckets & Seed Initial Data

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('table-references', 'table-references', true),
  ('task-completions', 'task-completions', true),
  ('dispatch', 'dispatch', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Read Access for table-references"
ON storage.objects FOR SELECT
USING (bucket_id IN ('table-references', 'task-completions', 'dispatch'));

CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('table-references', 'task-completions', 'dispatch'));

CREATE POLICY "Authenticated Update/Delete Access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id IN ('table-references', 'task-completions', 'dispatch'));
