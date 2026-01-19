-- Migration: Add archive_date to pending_overdue_stores
-- Created: 2026-01-19
-- Purpose: Track the archive date for each overdue store entry

-- Step 1: Add the archive_date column
ALTER TABLE pending_overdue_stores 
ADD COLUMN IF NOT EXISTS archive_date DATE;

-- Step 2: Set default value for existing records (current date)
UPDATE pending_overdue_stores 
SET archive_date = CURRENT_DATE 
WHERE archive_date IS NULL;

-- Step 3: Make the column NOT NULL
ALTER TABLE pending_overdue_stores 
ALTER COLUMN archive_date SET NOT NULL;

-- Step 4: Add index for performance (user_id + archive_date DESC)
CREATE INDEX IF NOT EXISTS idx_overdue_user_date 
ON pending_overdue_stores(user_id, archive_date DESC);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN pending_overdue_stores.archive_date IS 
'The date when this overdue entry was archived. Should match the corresponding daily archive date.';

-- Verification query (optional - for testing)
-- SELECT user_id, code, shop, net, archive_date 
-- FROM pending_overdue_stores 
-- ORDER BY user_id, archive_date DESC 
-- LIMIT 10;
