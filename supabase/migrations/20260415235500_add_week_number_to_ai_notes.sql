-- Add week_number column to ai_notes table for week-based organization
-- Also add index for performance

-- Add week_number column (nullable integer)
ALTER TABLE public.ai_notes 
ADD COLUMN IF NOT EXISTS week_number integer;

-- Create index on week_number for performance
CREATE INDEX IF NOT EXISTS idx_ai_notes_week_number ON public.ai_notes(week_number);

-- Create composite index for course + week_number queries
CREATE INDEX IF NOT EXISTS idx_ai_notes_course_week ON public.ai_notes(course, week_number);

-- Update existing rows: try to extract week number from lecture field
-- For lectures like "Week 1", "Week 2", etc.
UPDATE public.ai_notes 
SET week_number = CAST(SUBSTRING(lecture FROM 'Week\s*(\d+)') AS integer)
WHERE lecture ~ 'Week\s*\d+' AND week_number IS NULL;

-- For lectures that are just numbers, use that as week number
UPDATE public.ai_notes 
SET week_number = CAST(lecture AS integer)
WHERE lecture ~ '^\d+$' AND week_number IS NULL;

-- Set default week_number to 1 for any remaining null values
UPDATE public.ai_notes 
SET week_number = 1
WHERE week_number IS NULL;