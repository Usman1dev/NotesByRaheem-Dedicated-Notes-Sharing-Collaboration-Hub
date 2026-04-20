
-- Add category to notes
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'lecture_slides';

-- Add profile privacy toggle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_public boolean NOT NULL DEFAULT true;
