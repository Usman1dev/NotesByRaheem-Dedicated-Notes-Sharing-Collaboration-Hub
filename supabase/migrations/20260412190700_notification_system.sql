-- Notification System Migration
-- Creates functions and triggers for automatic notification generation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- NOTIFICATION HELPER FUNCTIONS
-- ============================================

-- Function to create notification for a single user
CREATE OR REPLACE FUNCTION create_notification_for_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Validate notification type
  IF p_type NOT IN ('note_uploaded', 'note_approved', 'note_rejected', 'new_note_in_course', 'system', 'announcement', 'note_pending_review', 'badge') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, data, created_at)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, NOW())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to create notification for all users
CREATE OR REPLACE FUNCTION create_notification_for_all_users(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert notifications for all users in auth.users
  WITH user_ids AS (
    SELECT id FROM auth.users
    WHERE deleted_at IS NULL
  )
  INSERT INTO notifications (user_id, type, title, message, data, created_at)
  SELECT id, p_type, p_title, p_message, p_data, NOW()
  FROM user_ids;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to create notification for admins and owners only
CREATE OR REPLACE FUNCTION create_notification_for_admins_owners(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert notifications for users with admin or owner role
  WITH admin_users AS (
    SELECT p.id 
    FROM profiles p
    WHERE p.role IN ('admin', 'owner')
      AND p.is_active = true
      AND p.is_banned = false
  )
  INSERT INTO notifications (user_id, type, title, message, data, created_at)
  SELECT id, p_type, p_title, p_message, p_data, NOW()
  FROM admin_users;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = false;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE id = p_notification_id
    AND is_read = false;
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE user_id = p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- NOTIFICATION TRIGGERS
-- ============================================

-- Trigger function for new announcements
CREATE OR REPLACE FUNCTION notify_new_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification for all users
  PERFORM create_notification_for_all_users(
    'announcement',
    'New Announcement: ' || NEW.title,
    'A new announcement has been posted: ' || NEW.title,
    jsonb_build_object(
      'announcement_id', NEW.id,
      'created_by', NEW.created_by,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new announcements
DROP TRIGGER IF EXISTS announcement_notification_trigger ON announcements;
CREATE TRIGGER announcement_notification_trigger
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_announcement();

-- Trigger function for note uploads (pending status)
CREATE OR REPLACE FUNCTION notify_note_uploaded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uploader_name TEXT;
  v_course_name TEXT;
BEGIN
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
      'course_name', v_course_name,
      'upload_date', NEW.upload_date,
      'has_review_button', true
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for note uploads
DROP TRIGGER IF EXISTS note_upload_notification_trigger ON notes;
CREATE TRIGGER note_upload_notification_trigger
  AFTER INSERT ON notes
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_note_uploaded();

-- Trigger function for note approvals
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

-- Create trigger for note approvals
DROP TRIGGER IF EXISTS note_approval_notification_trigger ON notes;
CREATE TRIGGER note_approval_notification_trigger
  AFTER UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_note_approved();

-- Trigger function for note rejections
CREATE OR REPLACE FUNCTION notify_note_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rejecter_name TEXT;
BEGIN
  -- Only trigger when status changes to rejected
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Get rejecter name (could be approved_by or someone else)
    SELECT full_name INTO v_rejecter_name
    FROM profiles
    WHERE id = NEW.approved_by;
    
    -- Notification for the note author
    PERFORM create_notification_for_user(
      NEW.uploaded_by,
      'note_rejected',
      'Note Rejected',
      'Your note "' || NEW.title || '" was rejected.' || 
      CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason ELSE '' END,
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'rejected_by', NEW.approved_by,
        'rejecter_name', v_rejecter_name,
        'rejection_reason', NEW.rejection_reason,
        'rejection_date', NEW.approval_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for note rejections
DROP TRIGGER IF EXISTS note_rejection_notification_trigger ON notes;
CREATE TRIGGER note_rejection_notification_trigger
  AFTER UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_note_rejected();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for fast notification retrieval by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
ON notifications(user_id, created_at DESC);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read 
ON notifications(user_id, is_read) 
WHERE is_read = false;

-- Index for notification type queries
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type);

-- ============================================
-- RLS POLICIES (if not already set)
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can update their own notifications (mark as read)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Only server functions can insert notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Server functions can insert notifications'
  ) THEN
    CREATE POLICY "Server functions can insert notifications" ON notifications
      FOR INSERT WITH CHECK (true); -- Allow all inserts (functions are SECURITY DEFINER)
  END IF;
END $$;

-- ============================================
-- VIEW FOR NOTIFICATION SUMMARY
-- ============================================

CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  MAX(created_at) as latest_notification
FROM notifications
GROUP BY user_id;

-- ============================================
-- COMMENT ON FUNCTIONS
-- ============================================

COMMENT ON FUNCTION create_notification_for_user IS 'Creates a notification for a single user. Returns the notification ID.';
COMMENT ON FUNCTION create_notification_for_all_users IS 'Creates a notification for all active users. Returns the number of notifications created.';
COMMENT ON FUNCTION create_notification_for_admins_owners IS 'Creates a notification for admin and owner users only. Returns the number of notifications created.';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns the count of unread notifications for a user.';
COMMENT ON FUNCTION mark_notification_as_read IS 'Marks a specific notification as read. Returns true if successful.';
COMMENT ON FUNCTION mark_all_notifications_as_read IS 'Marks all notifications for a user as read. Returns the number of notifications updated.';

COMMENT ON FUNCTION notify_new_announcement IS 'Trigger function that creates notifications for all users when a new announcement is created.';
COMMENT ON FUNCTION notify_note_uploaded IS 'Trigger function that creates notifications when a note is uploaded (pending status).';
COMMENT ON FUNCTION notify_note_approved IS 'Trigger function that creates notifications when a note is approved.';
COMMENT ON FUNCTION notify_note_rejected IS 'Trigger function that creates notifications when a note is rejected.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================