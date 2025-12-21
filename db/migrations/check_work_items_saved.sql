-- Check if work items were saved to the database
-- Replace the room_id with your actual room ID from the logs

-- Check laying_floating_floors table
SELECT * FROM laying_floating_floors
WHERE room_id = '086a8bb6-2d9d-4d1b-b1cd-d24a718d18b7'
ORDER BY created_at DESC;
