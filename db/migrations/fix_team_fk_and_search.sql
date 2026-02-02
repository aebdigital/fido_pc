-- Add foreign key relationship if it doesn't exist explicitly for Supabase to detect
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'team_members_user_id_fkey'
    ) THEN
        ALTER TABLE public.team_members
        ADD CONSTRAINT team_members_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.user_profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Also verify user_profiles has read access for authenticated users (needed for search)
-- We'll add a policy just in case it's missing or too restrictive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles"
ON public.user_profiles FOR SELECT
USING (auth.role() = 'authenticated');
