import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHeartbeat } from './useHeartbeat';

export function usePageTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const { triggerHeartbeat } = useHeartbeat();

  useEffect(() => {
    if (!user) return;

    // Track page view
    supabase.from('page_views').insert({
      user_id: user.id,
      path: location.pathname,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    } as any).then(() => {});

    // Trigger heartbeat on page navigation
    triggerHeartbeat();
  }, [location.pathname, user, triggerHeartbeat]);
}
