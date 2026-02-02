-- 1. Add full_name column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name text;
    END IF;
END $$;

-- 2. Backfill full_name from auth.users metadata
UPDATE public.profiles
SET full_name = (users.raw_user_meta_data->>'full_name')
FROM auth.users
WHERE profiles.id = users.id;

-- 3. Update the sync function to include full_name
CREATE OR REPLACE FUNCTION public.handle_user_email_sync() 
RETURNS TRIGGER AS $$
BEGIN
  -- Sync email
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.email <> OLD.email) THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;

  -- Sync full_name from metadata
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.raw_user_meta_data->>'full_name' <> OLD.raw_user_meta_data->>'full_name') THEN
    UPDATE public.profiles 
    SET full_name = (NEW.raw_user_meta_data->>'full_name')
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger covers metadata updates too
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
AFTER UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- 5. Enhanced new user handler
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url', 
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
