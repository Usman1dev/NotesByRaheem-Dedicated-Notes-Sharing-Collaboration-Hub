
-- Fix: ensure storage policies allow upsert for avatars (drop and recreate INSERT with proper check)
-- The existing policies look fine, let's check if the issue is the profiles update

-- Add is_banned column to profiles for ban functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Create page_views table for analytics
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL,
  user_agent text,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own page views"
  ON public.page_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can read all page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

-- Create edge function helper: owner can update user roles via direct update
-- We need to allow owners to update other users' profiles
-- Currently profiles_update only allows auth.uid() = id
-- Add a new policy for owners to update any profile
CREATE POLICY "owners_can_update_any_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );
