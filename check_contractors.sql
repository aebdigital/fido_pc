-- Check if contractors are being saved
SELECT
  id,
  user_id,
  c_id,
  name,
  email,
  phone,
  created_at
FROM contractors
ORDER BY created_at DESC
LIMIT 10;
