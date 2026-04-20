-- Simplified Active User Tracking Based ONLY on Page Views (Last 2 Minutes)
-- Migration: Replace comprehensive tracking with simple page view-based tracking

-- First, drop the comprehensive functions we don't need
DROP FUNCTION IF EXISTS public.get_comprehensive_active_users();
DROP FUNCTION IF EXISTS public.sync_all_active_users();

-- Create a simplified function that tracks active users based ONLY on page views
CREATE OR REPLACE FUNCTION public.get_currently_active_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  last_active timestamptz,
  session_duration interval,
  user_agent text,
  page_views_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Get users with page views in the last 2 minutes
  SELECT DISTINCT ON (pv.user_id)
    pv.user_id,
    COALESCE(p.full_name::text, 'Anonymous') as full_name,
    COALESCE(p.username::text, 'anonymous') as username,
    MAX(pv.created_at) as last_active,
    COALESCE(now() - MIN(pv.created_at), interval '0 seconds') as session_duration,
    MAX(pv.user_agent) as user_agent,
    COUNT(*) as page_views_count
  FROM public.page_views pv
  LEFT JOIN public.profiles p ON p.id = pv.user_id
  WHERE pv.created_at > now() - interval '2 minutes'
    AND pv.user_id IS NOT NULL
  GROUP BY pv.user_id, p.full_name, p.username
  ORDER BY pv.user_id, last_active DESC;
$$;

-- Create a function to sync active users from page views into active_sessions table
CREATE OR REPLACE FUNCTION public.sync_active_users_from_page_views()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  synced_count integer := 0;
  active_user RECORD;
  session_id text;
BEGIN
  -- For each active user from page views (last 2 minutes)
  FOR active_user IN 
    SELECT DISTINCT ON (pv.user_id)
      pv.user_id,
      COALESCE(p.full_name::text, 'Anonymous') as full_name,
      COALESCE(p.username::text, 'anonymous') as username,
      MAX(pv.created_at) as last_active,
      MAX(pv.user_agent) as user_agent
    FROM public.page_views pv
    LEFT JOIN public.profiles p ON p.id = pv.user_id
    WHERE pv.created_at > now() - interval '2 minutes'
      AND pv.user_id IS NOT NULL
    GROUP BY pv.user_id, p.full_name, p.username
  LOOP
    -- Generate a session ID
    session_id := 'pageview_' || active_user.user_id || '_' || EXTRACT(EPOCH FROM now())::integer;
    
    -- Insert or update active session
    INSERT INTO public.active_sessions (
      user_id,
      session_id,
      last_heartbeat,
      user_agent,
      created_at
    ) VALUES (
      active_user.user_id,
      session_id,
      active_user.last_active,
      active_user.user_agent,
      active_user.last_active
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET 
      last_heartbeat = EXCLUDED.last_heartbeat,
      user_agent = EXCLUDED.user_agent;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  -- Clean up old sessions (older than 5 minutes)
  DELETE FROM public.active_sessions 
  WHERE last_heartbeat < now() - interval '5 minutes';
  
  RETURN synced_count;
END;
$$;

-- Create a view for owner dashboard to easily query active user details
CREATE OR REPLACE VIEW public.owner_active_user_details AS
SELECT 
  au.user_id,
  au.full_name,
  au.username,
  au.last_active,
  au.session_duration,
  au.user_agent,
  au.page_views_count,
  CASE 
    WHEN au.session_duration < interval '1 minute' THEN 'Just now'
    WHEN au.session_duration < interval '5 minutes' THEN 'A few minutes ago'
    WHEN au.session_duration < interval '30 minutes' THEN 'Recently'
    ELSE 'A while ago'
  END as activity_status,
  CASE 
    WHEN p.role = 'owner' THEN 'Owner'
    WHEN p.role = 'admin' THEN 'Admin'
    WHEN p.role = 'student' THEN 'Student'
    ELSE 'Unknown'
  END as user_role
FROM public.get_currently_active_users() au
LEFT JOIN public.profiles p ON p.id = au.user_id;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_currently_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_active_users_from_page_views TO authenticated;
GRANT SELECT ON public.owner_active_user_details TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_currently_active_users IS 'Returns users active in the last 2 minutes based ONLY on page views. Simple tracking as requested by user.';
COMMENT ON FUNCTION public.sync_active_users_from_page_views IS 'Syncs active users from page views into the active_sessions table. Run this periodically to keep sessions updated.';
COMMENT ON VIEW public.owner_active_user_details IS 'View for owner dashboard showing active user details with enhanced information.';