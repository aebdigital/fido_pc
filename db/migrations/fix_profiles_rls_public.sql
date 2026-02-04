-- Allow authenticated users to view all profiles (needed for displaying team members, owners, assignment creators)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
TO authenticated
USING (true);
