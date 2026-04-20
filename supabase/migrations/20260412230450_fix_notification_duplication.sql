-- Fix Notification Duplication Issue
-- Removes duplicate notification triggers that cause spammy notifications

-- Drop the old duplicate triggers that create notifications with messages like:
-- "taimur posted a note for review" and "user posted new note"
-- These are created by the create_note_status_notification() function
-- We now have the new notification system triggers that handle notifications properly

-- Drop the new_note_notification trigger
DROP TRIGGER IF EXISTS new_note_notification ON notes;

-- Drop the note_status_change_notification trigger  
DROP TRIGGER IF EXISTS note_status_change_notification ON notes;

-- Note: We keep the following triggers from the new notification system:
-- 1. note_upload_notification_trigger (calls notify_note_uploaded())
-- 2. note_approval_notification_trigger (calls notify_note_approved())
-- 3. note_rejection_notification_trigger (calls notify_note_rejected())
-- These triggers create the proper notifications without duplicates

-- Optional: We could also drop the create_note_status_notification function
-- but it might be used elsewhere, so we'll just leave it disabled
-- DROP FUNCTION IF EXISTS create_note_status_notification();

-- Verify the remaining triggers
COMMENT ON TRIGGER note_upload_notification_trigger ON notes IS 'Creates notifications when a note is uploaded (pending status). Creates: 1) For uploader: "Note Submitted for Review", 2) For admins/owners: "New Note Needs Review"';
COMMENT ON TRIGGER note_approval_notification_trigger ON notes IS 'Creates notifications when a note is approved. Creates: 1) For author: "Note Approved!", 2) For all users: "New Note Available: [title]"';
COMMENT ON TRIGGER note_rejection_notification_trigger ON notes IS 'Creates notifications when a note is rejected. Creates: For author: "Note Rejected"';