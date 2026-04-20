# Notification Redirect Fix Plan

## Problem Statement
When users click on "note approved" or "new note available" notifications, they get a 404 error because the URLs point to non-existent routes (`/notes/:note_id`). Users should be redirected to the note page in the relevant course.

## Current State Analysis

### 1. Notification Data Structure
- **`note_approved` notifications**: Store `note_id`, `note_title`, `course_name`, `approved_by`, `approver_name`, `approval_date`
  - **Missing**: `course_id` (only has `course_name`)
- **`new_note_in_course` notifications**: Store `note_id`, `note_title`, `course_id`, `course_name`, `uploaded_by`, `approval_date`
  - **Has**: `course_id` (good)

### 2. Current URL Generation (`src/services/notificationService.ts`)
```typescript
case 'note_approved':
case 'note_rejected':
  return notification.data?.note_id ? `/notes/${notification.data.note_id}` : '/dashboard';
case 'new_note_in_course':
  return notification.data?.course_id ? `/courses/${notification.data.course_id}` : '/courses';
```

### 3. Routing Structure (`src/App.tsx`)
- No `/notes/:note_id` route exists
- Course page is at `/courses` with query parameter `id`: `/courses?id=${course_id}`
- Notes are displayed within the course page, not on separate pages

### 4. Notification Click Handling
- Both `NotificationBell.tsx` and `NotificationsPage.tsx` use `notificationService.getActionUrl()` 
- They navigate using React Router for internal routes

## Solution Requirements

1. **For `note_approved` notifications** (uploader clicking after note approval):
   - Redirect to the course page where the note was uploaded
   - Need to include `course_id` in notification data

2. **For `new_note_in_course` notifications** (users getting notification about new note):
   - Currently redirects to `/courses/${course_id}` (wrong format)
   - Should redirect to `/courses?id=${course_id}` (correct format)

## Implementation Plan

### Phase 1: Update Database Triggers
**File**: `supabase/migrations/20260412190700_notification_system.sql`

1. **Modify `notify_note_approved()` function**:
   - Add `course_id` to the notification data
   - Update the JSONB data to include `course_id` from the `notes` table

2. **Modify `notify_note_uploaded()` function**:
   - Ensure `course_id` is included (it already is)

### Phase 2: Update Notification Service
**File**: `src/services/notificationService.ts`

1. **Update `getActionUrl()` method**:
   - For `note_approved` and `note_rejected`: Redirect to `/courses?id=${course_id}`
   - For `new_note_in_course`: Redirect to `/courses?id=${course_id}` (fix format)
   - Fallback to `/dashboard` if `course_id` is not available

### Phase 3: Create Migration
**File**: New migration file in `supabase/migrations/`

1. **Create SQL migration**:
   - Update existing trigger functions
   - Add `course_id` to `note_approved` notifications
   - Apply migration to Supabase project

### Phase 4: Testing
1. **Test scenarios**:
   - Upload a note and get it approved (check notification redirect)
   - As a user, receive "new note available" notification (check redirect)
   - Verify no 404 errors
   - Verify correct course page loads

## Technical Details

### 1. Trigger Function Updates
Current `notify_note_approved()` function needs to include `course_id`:
```sql
-- Current (missing course_id):
data := jsonb_build_object(
  'note_id', NEW.id,
  'note_title', NEW.title,
  'course_name', course_row.name,
  'approved_by', approver_profile.id,
  'approver_name', approver_profile.full_name,
  'approval_date', NOW()
);

-- Updated (with course_id):
data := jsonb_build_object(
  'note_id', NEW.id,
  'note_title', NEW.title,
  'course_id', NEW.course_id,  -- Add this
  'course_name', course_row.name,
  'approved_by', approver_profile.id,
  'approver_name', approver_profile.full_name,
  'approval_date', NOW()
);
```

### 2. Notification Service Updates
```typescript
case 'note_approved':
case 'note_rejected':
  return notification.data?.course_id ? `/courses?id=${notification.data.course_id}` : '/dashboard';
case 'new_note_in_course':
  return notification.data?.course_id ? `/courses?id=${notification.data.course_id}` : '/courses';
```

## Migration Strategy

1. **Backward Compatibility**: 
   - Existing notifications without `course_id` will fallback to `/dashboard`
   - New notifications will have `course_id`

2. **Rollback Plan**:
   - Keep backup of original trigger functions
   - Can revert migration if issues arise

## Success Criteria

1. ✅ Uploader clicking "note approved" notification is redirected to correct course page
2. ✅ Users clicking "new note available" notification are redirected to correct course page  
3. ✅ No 404 errors when clicking notifications
4. ✅ All notification types maintain proper functionality
5. ✅ Existing notifications continue to work (fallback to dashboard)

## Files to Modify

1. `supabase/migrations/20260412190700_notification_system.sql` - Update trigger functions
2. `src/services/notificationService.ts` - Update `getActionUrl()` method
3. New migration file for applying changes

## Timeline
1. **Phase 1 & 2**: Update code files (15 minutes)
2. **Phase 3**: Create and apply migration (10 minutes)
3. **Phase 4**: Testing and validation (15 minutes)

## Risks and Mitigations

1. **Risk**: Existing notifications without `course_id` cause errors
   - **Mitigation**: Fallback to `/dashboard` in `getActionUrl()`

2. **Risk**: Trigger function update fails
   - **Mitigation**: Test migration in development first, keep backup

3. **Risk**: Notification redirects to wrong course
   - **Mitigation**: Verify `course_id` mapping is correct in triggers