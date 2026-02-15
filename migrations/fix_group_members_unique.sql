-- Add unique constraint to prevent duplicate memberships
-- This will ensure each user can only join a group once
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS unique_group_user;

ALTER TABLE group_members 
ADD CONSTRAINT unique_group_user UNIQUE (group_id, user_id);

-- Clean up any existing duplicates before applying the constraint
-- Keep only the first membership record for each user-group combination
DELETE FROM group_members a
USING group_members b
WHERE a.id > b.id 
  AND a.group_id = b.group_id 
  AND a.user_id = b.user_id;
