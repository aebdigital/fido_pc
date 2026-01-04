-- Fix receipts with null amounts (iOS requires amount as non-null Double)
-- Set null amounts to 0

UPDATE receipts
SET amount = COALESCE(amount, 0)
WHERE amount IS NULL;

-- Fix merchant_name - iOS can handle null but let's provide empty string for consistency
UPDATE receipts
SET merchant_name = COALESCE(merchant_name, '')
WHERE merchant_name IS NULL;

-- Fix items - ensure it's a proper JSONB array, not null or string
-- If items is null, set it to empty array
UPDATE receipts
SET items = '[]'::jsonb
WHERE items IS NULL;

-- If items was stored as a string (double-encoded), fix it
UPDATE receipts
SET items = (items #>> '{}')::jsonb
WHERE jsonb_typeof(items) = 'string';

-- Fix raw_ocr_text - ensure not null
UPDATE receipts
SET raw_ocr_text = COALESCE(raw_ocr_text, '')
WHERE raw_ocr_text IS NULL;

-- Verify the fix - show all receipts
SELECT
    c_id,
    amount,
    merchant_name,
    receipt_date,
    jsonb_typeof(items) as items_type,
    items,
    raw_ocr_text
FROM receipts
ORDER BY created_at DESC;
