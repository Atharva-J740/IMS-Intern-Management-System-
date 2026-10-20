-- ============================================================
-- Migration: Add task creator tracking fields
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Add created_by column (UUID of the creator — admin or intern)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add created_by_role column ('ADMIN' or 'INTERN')
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by_role text CHECK (created_by_role IN ('ADMIN', 'INTERN'));

-- 3. Backfill existing rows: assume intern_id is the creator
UPDATE public.tasks
  SET created_by = intern_id,
      created_by_role = 'INTERN'
  WHERE created_by IS NULL;

-- 4. Allow admins to INSERT tasks (previously only interns could)
--    Drop the old intern-only insert policy and replace it.
DROP POLICY IF EXISTS "Interns can insert own tasks" ON public.tasks;

CREATE POLICY "Users can insert tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (
    -- Interns can only insert tasks for themselves
    (auth.uid() = intern_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'INTERN')
    OR
    -- Admins can insert tasks for any intern
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- 5. Allow admins to DELETE any task (interns can only delete their own)
DROP POLICY IF EXISTS "Interns can delete own tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks" ON public.tasks
  FOR DELETE
  USING (
    auth.uid() = intern_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );
