-- Fix ai_notes table schema to match TypeScript types and service expectations
-- Add missing columns and foreign key constraint

-- Add owner_id column with foreign key constraint
ALTER TABLE public.ai_notes 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id);

-- Add tags column (text array, nullable)
ALTER TABLE public.ai_notes 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add is_published column (boolean, default true)
ALTER TABLE public.ai_notes 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Add updated_at column (timestamp, default now())
ALTER TABLE public.ai_notes 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ai_notes_updated_at ON public.ai_notes;
CREATE TRIGGER update_ai_notes_updated_at
    BEFORE UPDATE ON public.ai_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing rows to have default values
UPDATE public.ai_notes 
SET 
    owner_id = (
        SELECT id FROM public.profiles WHERE role = 'owner' LIMIT 1
    ),
    tags = ARRAY[chapter_title],
    is_published = true,
    updated_at = created_at
WHERE owner_id IS NULL;

-- Make owner_id NOT NULL after populating existing rows
ALTER TABLE public.ai_notes 
ALTER COLUMN owner_id SET NOT NULL;

-- Create index on owner_id for performance
CREATE INDEX IF NOT EXISTS idx_ai_notes_owner_id ON public.ai_notes(owner_id);

-- Create index on is_published for performance
CREATE INDEX IF NOT EXISTS idx_ai_notes_is_published ON public.ai_notes(is_published);

-- Add comment explaining the schema
COMMENT ON TABLE public.ai_notes IS 'Structured AI-generated notes with JSON content for dynamic rendering. Includes owner tracking, tags, and publication status.';