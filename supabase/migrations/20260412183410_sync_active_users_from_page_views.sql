-- Sync Active Users from Page Views
-- Migration: Automatically create active sessions for users with recent page views

-- Function to sync active sessions with users who have recent page views
CREATE OR REPLACE FUNCTION public.sync_active_users_from_page_views()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  synced_count integer := 0;
  user_record RECORD;
  session_id text;
BEGIN
  -- Find users with page views in the last 5 minutes who don't have active sessions
  FOR user_record IN 
    SELECT DISTINCT 
      pv.user_id,
      p.full_name,
      p.username,
      MAX(pv.created_at) as last_page_view,
      MAX(pv.user_agent) as user_agent
    FROM public.page_views pv
    JOIN public.profiles p ON p.id = pv.user_id
    WHERE pv.created_at > now() - interval '5 minutes'
      AND pv.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.active_sessions a 
        WHERE a.user_id = pv.user_id 
        AND a.last_heartbeat > now() - interval '5 minutes'
      )
    GROUP BY pv.user_id, p.full_name, p.username
  LOOP
    -- Generate a session ID based on user ID and timestamp
    session_id := 'pageview_' || user_record.user_id || '_' || EXTRACT(EPOCH FROM now())::integer;
    
    -- Insert or update active session
    INSERT INTO public.active_sessions (
      user_id,
      session_id,
      last_heartbeat,
      user_agent,
      created_at
    ) VALUES (
      user_record.user_id,
      session_id,
      user_record.last_page_view, -- Use last page view time as heartbeat
      user_record.user_agent,
      user_record.last_page_view
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET 
      last_heartbeat = EXCLUDED.last_heartbeat,
      user_agent = EXCLUDED.user_agent;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$;

-- Function to get all active users (combining heartbeat sessions and recent page views)
CREATE OR REPLACE FUNCTION public.get_all_active_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  last_active timestamptz,
  session_duration interval,
  user_agent text,
  activity_source text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Get users from active_sessions (heartbeat-based)
  SELECT
    ases.user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    ases.last_heartbeat as last_active,
    now() - ases.created_at as session_duration,
    ases.user_agent,
    'heartbeat' as activity_source
  FROM public.active_sessions ases
  JOIN public.profiles p ON p.id = ases.user_id
  WHERE ases.last_heartbeat > now() - interval '5 minutes'
  
  UNION
  
  -- Get users from recent page views (pageview-based)
  SELECT
    pv.user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    MAX(pv.created_at) as last_active,
    interval '0 seconds' as session_duration, -- Page views don't have session duration
    MAX(pv.user_agent) as user_agent,
    'pageview' as activity_source
  FROM public.page_views pv
  JOIN public.profiles p ON p.id = pv.user_id
  WHERE pv.created_at > now() - interval '5 minutes'
    AND pv.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.active_sessions a
      WHERE a.user_id = pv.user_id
      AND a.last_heartbeat > now() - interval '5 minutes'
    )
  GROUP BY pv.user_id, p.full_name, p.username
  
  ORDER BY last_active DESC;
$$;

-- Update the owner_active_users_detail view to use the new combined approach
CREATE OR REPLACE VIEW public.owner_active_users_detail AS
SELECT 
  au.user_id,
  au.full_name,
  au.username,
  p.role,
  au.last_active as last_heartbeat,
  COALESCE(ases.created_at, au.last_active) as created_at,
  au.user_agent,
  EXTRACT(EPOCH FROM (now() - COALESCE(ases.created_at, au.last_active))) as session_duration_seconds,
  CASE 
    WHEN au.last_active > now() - interval '30 seconds' THEN 'Very Active'
    WHEN au.last_active > now() - interval '1 minute' THEN 'Active'
    WHEN au.last_active > now() - interval '2 minutes' THEN 'Idle'
    ELSE 'Inactive'
  END as activity_status,
  au.activity_source
FROM public.get_all_active_users() au
LEFT JOIN public.active_sessions ases ON ases.user_id = au.user_id 
  AND ases.last_heartbeat > now() - interval '5 minutes'
LEFT JOIN public.profiles p ON p.id = au.user_id
WHERE au.last_active > now() - interval '5 minutes'
ORDER BY au.last_active DESC;

-- Update the get_currently_active_users function to use the new combined approach
CREATE OR REPLACE FUNCTION public.get_currently_active_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  last_active timestamptz,
  session_duration interval,
  user_agent text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    user_id,
    full_name,
    username,
    last_active,
    session_duration,
    user_agent
  FROM public.get_all_active_users()
  ORDER BY last_active DESC;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.sync_active_users_from_page_views TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_active_users TO authenticated;

-- Create a trigger or scheduled job to sync active users periodically
-- (This would typically be set up in the Supabase dashboard as a cron job)
COMMENT ON FUNCTION public.sync_active_users_from_page_views IS 'Syncs active sessions with users who have recent page views. Run this periodically (e.g., every minute) to keep active sessions updated.';

COMMENT ON FUNCTION public.get_all_active_users IS 'Returns all active users combining both heartbeat sessions and recent page views.';

COMMENT ON FUNCTION public.get_currently_active_users IS 'Returns currently active users (last 5 minutes) combining both heartbeat and page view activity.';