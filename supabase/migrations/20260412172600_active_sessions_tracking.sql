-- Active Sessions Tracking System
-- Migration: Add real-time active user tracking for owner analytics

-- Create active_sessions table for real-time user tracking
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address inet,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_heartbeat ON public.active_sessions(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON public.active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_created_at ON public.active_sessions(created_at);

-- Enable Row Level Security
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sessions (insert, update, delete)
CREATE POLICY "users_manage_own_sessions"
  ON public.active_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can read all active sessions
CREATE POLICY "owners_read_all_sessions"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (public.is_owner(auth.uid()));

-- Function to update or create user session (heartbeat)
CREATE OR REPLACE FUNCTION public.update_user_session(
  p_user_id uuid,
  p_session_id text,
  p_user_agent text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.active_sessions (user_id, session_id, last_heartbeat, user_agent, ip_address)
  VALUES (p_user_id, p_session_id, now(), p_user_agent, p_ip_address)
  ON CONFLICT (session_id) DO UPDATE
  SET last_heartbeat = now(),
      user_agent = EXCLUDED.user_agent,
      ip_address = EXCLUDED.ip_address,
      metadata = COALESCE(active_sessions.metadata, '{}'::jsonb) || jsonb_build_object('heartbeat_count', COALESCE((active_sessions.metadata->>'heartbeat_count')::int, 0) + 1);
END;
$$;

-- Function to end user session
CREATE OR REPLACE FUNCTION public.end_user_session(
  p_session_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE session_id = p_session_id;
END;
$$;

-- Function to get currently active users (last 2 minutes)
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
    ases.user_id,
    p.full_name,
    p.username,
    ases.last_heartbeat as last_active,
    now() - ases.created_at as session_duration,
    ases.user_agent
  FROM public.active_sessions ases
  JOIN public.profiles p ON p.id = ases.user_id
  WHERE ases.last_heartbeat > now() - interval '5 minutes'
  ORDER BY ases.last_heartbeat DESC;
$$;

-- Function to clean up stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.active_sessions
  WHERE last_heartbeat < now() - interval '10 minutes'
  RETURNING count(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Create view for owner dashboard analytics
CREATE OR REPLACE VIEW public.owner_active_users AS
SELECT 
  COUNT(DISTINCT user_id) as active_user_count,
  COUNT(*) as total_sessions,
  AVG(EXTRACT(EPOCH FROM (now() - created_at))) as avg_session_duration_seconds,
  MIN(last_heartbeat) as oldest_activity,
  MAX(last_heartbeat) as newest_activity
FROM public.active_sessions
WHERE last_heartbeat > now() - interval '5 minutes';

-- Create view for detailed active user list
CREATE OR REPLACE VIEW public.owner_active_users_detail AS
SELECT 
  ases.user_id,
  p.full_name,
  p.username,
  p.role,
  ases.last_heartbeat,
  ases.created_at,
  ases.user_agent,
  EXTRACT(EPOCH FROM (now() - ases.created_at)) as session_duration_seconds,
  CASE 
    WHEN ases.last_heartbeat > now() - interval '30 seconds' THEN 'Very Active'
    WHEN ases.last_heartbeat > now() - interval '1 minute' THEN 'Active'
    WHEN ases.last_heartbeat > now() - interval '2 minutes' THEN 'Idle'
    ELSE 'Inactive'
  END as activity_status
FROM public.active_sessions ases
JOIN public.profiles p ON p.id = ases.user_id
WHERE ases.last_heartbeat > now() - interval '2 minutes'
ORDER BY ases.last_heartbeat DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_currently_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions TO authenticated;

GRANT SELECT ON public.owner_active_users TO authenticated;
GRANT SELECT ON public.owner_active_users_detail TO authenticated;

-- Add comment explaining the system
COMMENT ON TABLE public.active_sessions IS 'Tracks currently active user sessions for real-time analytics';
COMMENT ON FUNCTION public.update_user_session IS 'Updates or creates a user session (heartbeat mechanism)';
COMMENT ON FUNCTION public.get_currently_active_users IS 'Returns list of users active in the last 2 minutes';
COMMENT ON VIEW public.owner_active_users IS 'Aggregate view of currently active users for owner dashboard';
COMMENT ON VIEW public.owner_active_users_detail IS 'Detailed view of active users with profile information';