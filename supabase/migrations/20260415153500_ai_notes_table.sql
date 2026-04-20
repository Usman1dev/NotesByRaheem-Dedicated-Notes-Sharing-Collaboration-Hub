-- Create ai_notes table for storing structured AI-generated notes
CREATE TABLE IF NOT EXISTS public.ai_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    lecture text NOT NULL,
    course text NOT NULL,
    chapter_title text NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_notes ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_notes_course ON public.ai_notes(course);
CREATE INDEX IF NOT EXISTS idx_ai_notes_lecture ON public.ai_notes(lecture);
CREATE INDEX IF NOT EXISTS idx_ai_notes_created_at ON public.ai_notes(created_at DESC);

-- RLS Policies

-- Policy 1: All authenticated users can read AI notes
CREATE POLICY "Anyone can read AI notes"
    ON public.ai_notes
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Only owners can insert AI notes
CREATE POLICY "Only owners can insert AI notes"
    ON public.ai_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
        )
    );

-- Policy 3: Only owners can update AI notes
CREATE POLICY "Only owners can update AI notes"
    ON public.ai_notes
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
        )
    );

-- Policy 4: Only owners can delete AI notes
CREATE POLICY "Only owners can delete AI notes"
    ON public.ai_notes
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
        )
    );

-- Add comment to table
COMMENT ON TABLE public.ai_notes IS 'Structured AI-generated notes with JSON content for dynamic rendering';