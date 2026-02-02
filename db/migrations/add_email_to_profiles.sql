-- 1. Add email column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
END $$;

-- 2. Backfill email from auth.users
UPDATE public.profiles
SET email = users.email
FROM auth.users
WHERE profiles.id = users.id;

-- 3. Create a function to keep email in sync
CREATE OR REPLACE FUNCTION public.handle_user_email_sync() 
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting a new user, or updating email
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.email <> OLD.email) THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on auth.users
-- Drop first to allow re-running
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- Note: We can't easily trigger on INSERT to auth.users if the profile is created later, 
-- but usually the profile creation trigger handles the initial email copy.
-- Let's ensure the existing "handle_new_user" (standard Supabase starter trigger) also copies email.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
