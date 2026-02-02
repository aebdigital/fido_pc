-- COMPREHENSIVE FIX FOR PROFILES AND SEARCH
-- Run this in Supabase SQL Editor

-- 1. Add missing columns (SAFE guarded)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
END $$;

-- 2. Backfill data from auth.users (This fixes existing empty rows)
UPDATE public.profiles
SET
  full_name = COALESCE(users.raw_user_meta_data->>'full_name', users.email), -- Fallback to email if name missing
  avatar_url = users.raw_user_meta_data->>'avatar_url',
  email = users.email
FROM auth.users
WHERE profiles.id = users.id;

-- 3. Update RLS Policies to allow Search
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove old restrictive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create correct policy: Authenticated users must be able to see others to search/add them to teams
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. Update Sync Trigger to keep data fresh automatically
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- We sync on any relevant change
  UPDATE public.profiles
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url'
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
AFTER UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();
