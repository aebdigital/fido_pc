-- Allow project owners to create time entries for their project members
-- Previously, INSERT policy required user_id = auth.uid() which prevented
-- owners from creating entries on behalf of members.

DROP POLICY IF EXISTS "dennik_time_entries_insert" ON dennik_time_entries;

CREATE POLICY "dennik_time_entries_insert"
ON dennik_time_entries
FOR INSERT
TO authenticated
WITH CHECK (
  -- User creating their own entry (owner or member of the project)
  (
    user_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.c_id = dennik_time_entries.project_id
        AND projects.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = dennik_time_entries.project_id
        AND project_members.user_id = auth.uid()
      )
    )
  )
  OR
  -- Project owner creating entry for a project member
  (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.c_id = dennik_time_entries.project_id
      AND projects.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = dennik_time_entries.project_id
      AND project_members.user_id = dennik_time_entries.user_id
    )
  )
);
