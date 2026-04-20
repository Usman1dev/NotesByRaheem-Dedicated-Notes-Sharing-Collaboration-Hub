# Notification Duplication Fix Plan

## Problem Analysis

The user reports receiving duplicate notifications:
1. **When a user submits a note for review**: Admin/owner gets 2 notifications:
   - "New Note Needs Review" (from database trigger)
   - "taimur posted a note for review" (unknown source)

2. **When a note is approved**: Everyone gets 2 notifications:
   - "New Note Available: [title]" (from database trigger)
   - "user posted new note" (unknown source)

## Root Cause Investigation

Based on analysis of the notification system migration file (`supabase/migrations/20260412190700_notification_system.sql`):

### Current Trigger Functions:

1. **`notify_note_uploaded()`** - Creates:
   - For uploader: "Note Submitted for Review" (type: `note_uploaded`)
   - For admins/owners: "New Note Needs Review" (type: `note_pending_review`)

2. **`notify_note_approved()`** - Creates:
   - For author: "Note Approved!" (type: `note_approved`)
   - For all users: "New Note Available: [title]" (type: `new_note_in_course`)

### Missing Sources:
The duplicate messages ("taimur posted a note for review" and "user posted new note") are NOT created by these triggers. They must come from:
- Another database trigger not found in migration files
- Frontend code manually creating notifications
- A different notification system

## Plan to Fix Notification Duplication

### Phase 1: Investigation
1. **Check database for existing triggers**: Use Supabase SQL to list all triggers on the `notes` table
2. **Search frontend code**: Look for manual notification creation in UploadPage.tsx, OwnerNotes.tsx, AdminPending.tsx
3. **Examine notification data**: Check actual notification records in database to see message patterns

### Phase 2: Fix Implementation
Based on investigation results:

#### Option A: If duplicate triggers exist
1. Identify and remove duplicate notification triggers
2. Ensure only one trigger creates notifications per event
3. Update trigger messages to be consistent

#### Option B: If frontend code creates duplicates
1. Remove manual notification creation from frontend
2. Rely solely on database triggers for consistency
3. Ensure triggers handle all notification scenarios

#### Option C: If messages need consolidation
1. Modify existing triggers to send only one notification per event:
   - For note upload: Send only "New Note Needs Review" to admins/owners
   - For note approval: Send only "New Note Available: [title]" to all users
2. Remove redundant notifications

### Phase 3: Specific Fixes

#### Fix 1: Note Upload Notification Consolidation
- **Current**: Uploader gets "Note Submitted for Review", Admins get "New Note Needs Review"
- **Issue**: Admins might be getting additional "taimur posted a note for review"
- **Fix**: Ensure only `notify_note_uploaded()` trigger runs, remove any other notification sources

#### Fix 2: Note Approval Notification Consolidation
- **Current**: Author gets "Note Approved!", All users get "New Note Available: [title]"
- **Issue**: Users might be getting additional "user posted new note"
- **Fix**: Ensure only `notify_note_approved()` trigger runs, remove duplicates

### Phase 4: Testing Strategy
1. Test note upload → Check admin notifications (should be exactly 1)
2. Test note approval → Check user notifications (should be exactly 1)
3. Verify notification messages match expected format
4. Test edge cases (rejection, multiple uploads, etc.)

## Implementation Steps

1. **Investigate current triggers** using SQL: `SELECT * FROM pg_trigger WHERE tgrelid = 'notes'::regclass;`
2. **Check for duplicate notification creation** in frontend components
3. **Modify migration file** to remove duplicate notification logic if found
4. **Apply database changes** via new migration
5. **Test thoroughly** with actual note upload/approval flows
6. **Verify fix** by checking notification counts and messages

## Expected Outcome
- Admin/owner receives exactly 1 notification when note is uploaded: "New Note Needs Review"
- All users receive exactly 1 notification when note is approved: "New Note Available: [title]"
- No duplicate or spammy notifications
- Consistent notification messaging across the application