-- Link team_members to the profiles TABLE, not the user_profiles view.
DO $$
BEGIN
    -- 1. Drop the constraint if it exists (in case it was made incorrectly)
    ALTER TABLE public.team_members 
    DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

    -- 2. Add the correct Foreign Key to public.profiles
    -- This assumes 'profiles' is the actual table name (standard in Supabase starters).
    ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

    -- 3. Force schema cache reload (Supabase usually does this, but being explicit helps)
    NOTIFY pgrst, 'reload schema';
END $$;
