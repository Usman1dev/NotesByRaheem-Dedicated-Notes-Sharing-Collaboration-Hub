
-- Create security definer function to check owner status
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'owner'
  )
$$;

-- Drop the potentially recursive policy
DROP POLICY IF EXISTS "owners_can_update_any_profile" ON public.profiles;

-- Recreate with security definer function
CREATE POLICY "owners_can_update_any_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

-- Also fix the page_views SELECT policy to use security definer
DROP POLICY IF EXISTS "Owners can read all page views" ON public.page_views;
CREATE POLICY "Owners can read all page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (public.is_owner(auth.uid()));
