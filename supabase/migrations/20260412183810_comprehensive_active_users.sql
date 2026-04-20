-- Comprehensive Active Users Tracking
-- Migration: Create function to track active users from multiple activity sources

-- Drop the existing function first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_comprehensive_active_users();

-- Function to get active users from ALL activity sources (last 2 minutes)
CREATE OR REPLACE FUNCTION public.get_comprehensive_active_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  last_active timestamptz,
  activity_type text,
  user_agent text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Get users from active_sessions (heartbeat-based) - last 2 minutes
  SELECT DISTINCT ON (ases.user_id)
    ases.user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    ases.last_heartbeat as last_active,
    'heartbeat' as activity_type,
    ases.user_agent
  FROM public.active_sessions ases
  JOIN public.profiles p ON p.id = ases.user_id
  WHERE ases.last_heartbeat > now() - interval '2 minutes'
  
  UNION
  
  -- Get users from page_views - last 2 minutes
  SELECT DISTINCT ON (pv.user_id)
    pv.user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    MAX(pv.created_at) as last_active,
    'page_view' as activity_type,
    MAX(pv.user_agent) as user_agent
  FROM public.page_views pv
  JOIN public.profiles p ON p.id = pv.user_id
  WHERE pv.created_at > now() - interval '2 minutes'
    AND pv.user_id IS NOT NULL
  GROUP BY pv.user_id, p.full_name, p.username
  
  UNION
  
  -- Get users from direct_messages - last 2 minutes
  SELECT DISTINCT ON (dm.sender_id)
    dm.sender_id as user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    MAX(dm.created_at) as last_active,
    'direct_message' as activity_type,
    NULL as user_agent
  FROM public.direct_messages dm
  JOIN public.profiles p ON p.id = dm.sender_id
  WHERE dm.created_at > now() - interval '2 minutes'
    AND dm.sender_id IS NOT NULL
  GROUP BY dm.sender_id, p.full_name, p.username
  
  UNION
  
  -- Get users from chatroom messages - last 2 minutes
  SELECT DISTINCT ON (m.user_id)
    m.user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    MAX(m.created_at) as last_active,
    'chat_message' as activity_type,
    NULL as user_agent
  FROM public.messages m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.created_at > now() - interval '2 minutes'
    AND m.user_id IS NOT NULL
  GROUP BY m.user_id, p.full_name, p.username
  
  UNION
  
  -- Get users from download_logs - last 2 minutes
  SELECT DISTINCT ON (dl.user_id)
    dl.user_id,
    p.full_name::text as full_name,
    p.username::text as username,
    MAX(dl.downloaded_at) as last_active,
    'download' as activity_type,
    NULL as user_agent
  FROM public.download_logs dl
  JOIN public.profiles p ON p.id = dl.user_id
  WHERE dl.downloaded_at > now() - interval '2 minutes'
    AND dl.user_id IS NOT NULL
  GROUP BY dl.user_id, p.full_name, p.username
  
  ORDER BY last_active DESC;
$$;

-- Function to sync all active users into active_sessions table
CREATE OR REPLACE FUNCTION public.sync_all_active_users()
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
  -- For each active user from comprehensive tracking
  FOR active_user IN 
    SELECT * FROM public.get_comprehensive_active_users()
  LOOP
    -- Generate a session ID
    session_id := 'sync_' || active_user.user_id || '_' || EXTRACT(EPOCH FROM now())::integer;
    
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
  
  -- Clean up old sessions (older than 10 minutes)
  DELETE FROM public.active_sessions 
  WHERE last_heartbeat < now() - interval '10 minutes';
  
  RETURN synced_count;
END;
$$;

-- Update the get_currently_active_users function to use comprehensive tracking
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
    cau.user_id,
    cau.full_name,
    cau.username,
    cau.last_active,
    COALESCE(now() - ases.created_at, interval '0 seconds') as session_duration,
    COALESCE(cau.user_agent, ases.user_agent) as user_agent
  FROM public.get_comprehensive_active_users() cau
  LEFT JOIN public.active_sessions ases ON ases.user_id = cau.user_id 
    AND ases.last_heartbeat > now() - interval '5 minutes'
  ORDER BY cau.last_active DESC;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_comprehensive_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_all_active_users TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_comprehensive_active_users IS 'Returns all users active in the last 2 minutes from multiple activity sources (heartbeats, page views, messages, downloads).';
COMMENT ON FUNCTION public.sync_all_active_users IS 'Syncs all active users into the active_sessions table. Run this periodically to keep sessions updated.';
COMMENT ON FUNCTION public.get_currently_active_users IS 'Returns currently active users (last 2 minutes) from all activity sources with session duration.';