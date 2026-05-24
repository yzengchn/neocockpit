import { useEffect, useRef } from 'react';
import { presenceApi } from '@/services/api';

const HEARTBEAT_INTERVAL = 20_000;

function getSessionId(): string {
  const KEY = 'aicg_presence_sid';
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

/**
 * Global presence heartbeat hook.
 * Register on mount, send periodic heartbeats.
 * Does NOT unregister on component unmount — this keeps the session alive
 * across route changes within the same SPA session.
 * When the tab is actually closed, the backend TTL (90s) will naturally
 * expire the session.
 */
export function usePresence(path = '/') {
  const sidRef = useRef(getSessionId());

  useEffect(() => {
    const sid = sidRef.current;

    // Register immediately
    presenceApi.register(sid, path).catch(() => {});

    // Periodic heartbeat
    const interval = setInterval(() => {
      presenceApi.heartbeat(sid, path).catch(() => {});
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
      // Intentionally do NOT call unregister here — route changes within SPA
      // should keep the session alive. The session will expire via backend TTL
      // if the user genuinely leaves (closes tab, navigates away).
    };
  }, [path]);
}
