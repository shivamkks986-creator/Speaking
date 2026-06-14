// useUserQuota — hook that returns the current user's daily AI call quota.
// Polls every 30s while the screen is mounted + refreshes on demand.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserQuota, UserQuotaStatus } from '@/services/remoteConfigService';

export function useUserQuota(pollMs: number = 30_000) {
  const { user } = useAuth();
  const [quota, setQuota] = useState<UserQuotaStatus | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const result = await fetchUserQuota(user?.uid ?? null, !!user?.isPremium);
    if (mounted.current) setQuota(result);
  }, [user?.uid, user?.isPremium]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [refresh, pollMs]);

  return { quota, refresh };
}
