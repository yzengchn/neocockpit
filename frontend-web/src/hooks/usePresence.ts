import { useEffect, useState } from 'react';
import { presenceApi, getUserInfo, isUserLoggedIn } from '@/services/api';

const HEARTBEAT_INTERVAL = 20_000;

/**
 * Global presence heartbeat hook (user-scoped).
 *
 * Only registers / heartbeats when a user is logged in. Anonymous visitors
 * are not counted toward the online user total. Reacts to login/logout via
 * the custom `aigc-auth-change` event dispatched by setUserAuth/clearUserAuth.
 */
export function usePresence(path = '/') {
  const [userId, setUserId] = useState<string | null>(() => getUserInfo()?.id ?? null);

  useEffect(() => {
    const sync = () => setUserId(getUserInfo()?.id ?? null);
    window.addEventListener('aigc-auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('aigc-auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!userId || !isUserLoggedIn()) return;

    presenceApi.register(path).catch(() => {});
    const interval = setInterval(() => {
      presenceApi.heartbeat(path).catch(() => {});
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
      // Backend TTL will expire the entry naturally if the user closes the tab.
      // We do unregister on explicit logout via clearUserAuth → auth-change event.
    };
  }, [path, userId]);
}
