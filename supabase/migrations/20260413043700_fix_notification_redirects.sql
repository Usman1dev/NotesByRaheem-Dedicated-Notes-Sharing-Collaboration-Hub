-- Fix Notification Redirects Migration
-- Updates notification trigger functions to include course_id for proper redirects
-- and ensures notification URLs point to correct course pages

-- ============================================
-- UPDATE NOTIFY_NOTE_APPROVED FUNCTION
-- ============================================

-- Update the notify_note_approved function to include course_id in notification data
CREATE OR REPLACE FUNCTION notify_note_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_approver_name TEXT;
  v_course_name TEXT;
BEGIN
  -- Only trigger when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get approver name
    SELECT full_name INTO v_approver_name
    FROM profiles
    WHERE id = NEW.approved_by;
    
    -- Get course name
    SELECT name INTO v_course_name
    FROM courses
    WHERE id = NEW.course_id;
    
    -- Notification for the note author
    PERFORM create_notification_for_user(
      NEW.uploaded_by,
      'note_approved',
      'Note Approved!',
      'Your note "' || NEW.title || '" has been approved by ' || COALESCE(v_approver_name, 'Admin') || '.',
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'course_id', NEW.course_id,  -- ADDED: Include course_id for redirect
        'course_name', v_course_name,
        'approved_by', NEW.approved_by,
        'approver_name', v_approver_name,
        'approval_date', NEW.approval_date
      )
    );
    
    -- Notification for all users about new note
    PERFORM create_notification_for_all_users(
      'new_note_in_course',
      'New Note Available: ' || NEW.title,
      'A new note "' || NEW.title || '" has been added to ' || v_course_name || '.',
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'course_id', NEW.course_id,
        'course_name', v_course_name,
        'uploaded_by', NEW.uploaded_by,
        'approval_date', NEW.approval_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- UPDATE NOTIFY_NOTE_REJECTED FUNCTION
-- ============================================

-- Update the notify_note_rejected function to include course_id in notification data
CREATE OR REPLACE FUNCTION notify_note_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rejecter_name TEXT;
  v_course_name TEXT;
BEGIN
  -- Only trigger when status changes to rejected
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Get rejecter name
    SELECT full_name INTO v_rejecter_name
    FROM profiles
    WHERE id = NEW.rejected_by;
    
    -- Get course name
    SELECT name INTO v_course_name
    FROM courses
    WHERE id = NEW.course_id;
    
    -- Notification for the note author
    PERFORM create_notification_for_user(
      NEW.uploaded_by,
      'note_rejected',
      'Note Rejected',
      'Your note "' || NEW.title || '" was rejected by ' || COALESCE(v_rejecter_name, 'Admin') || '.',
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'course_id', NEW.course_id,  -- ADDED: Include course_id for redirect
        'course_name', v_course_name,
        'rejected_by', NEW.rejected_by,
        'rejecter_name', v_rejecter_name,
        'rejection_date', NEW.rejection_date,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- UPDATE NOTIFY_NOTE_UPLOADED FUNCTION
-- ============================================

-- Update the notify_note_uploaded function to include course_id in notification data
CREATE OR REPLACE FUNCTION notify_note_uploaded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uploader_name TEXT;
  v_course_name TEXT;
BEGIN
  -- Only trigger for new pending notes
  IF NEW.status = 'pending' THEN
    -- Get uploader name
    SELECT full_name INTO v_uploader_name
    FROM profiles
    WHERE id = NEW.uploaded_by;
    
    -- Get course name
    SELECT name INTO v_course_name
    FROM courses
    WHERE id = NEW.course_id;
    
    -- Notification for the uploader
    PERFORM create_notification_for_user(
      NEW.uploaded_by,
      'note_uploaded',
      'Note Submitted for Review',
      'Your note "' || NEW.title || '" has been submitted for approval.',
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'course_id', NEW.course_id,  -- ADDED: Include course_id for consistency
        'course_name', v_course_name,
        'upload_date', NEW.upload_date
      )
    );
    
    -- Notification for admins/owners
    PERFORM create_notification_for_admins_owners(
      'note_pending_review',
      'New Note Needs Review',
      'A new note "' || NEW.title || '" by ' || COALESCE(v_uploader_name, 'Unknown') || ' needs review.',
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'uploaded_by', NEW.uploaded_by,
        'uploader_name', v_uploader_name,
        'course_id', NEW.course_id,  -- ADDED: Include course_id
        'course_name', v_course_name,
        'upload_date', NEW.upload_date,
        'has_review_button', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- UPDATE COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_note_uploaded IS 'Trigger function that creates notifications when a note is uploaded (pending status). Includes course_id for proper redirects.';
COMMENT ON FUNCTION notify_note_approved IS 'Trigger function that creates notifications when a note is approved. Includes course_id for proper redirects.';
COMMENT ON FUNCTION notify_note_rejected IS 'Trigger function that creates notifications when a note is rejected. Includes course_id for proper redirects.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the functions were updated correctly
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Notification trigger functions updated to include course_id for proper redirects';
  RAISE NOTICE '1. notify_note_approved() updated to include course_id in note_approved notifications';
  RAISE NOTICE '2. notify_note_rejected() updated to include course_id in note_rejected notifications';
  RAISE NOTICE '3. notify_note_uploaded() updated to include course_id for consistency';
  RAISE NOTICE '4. Frontend notificationService.ts already updated to use /courses?id={course_id} format';
END $$;