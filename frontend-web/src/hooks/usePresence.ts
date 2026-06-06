import { useEffect } from 'react';
import { presenceApi } from '@/services/api';

const HEARTBEAT_INTERVAL = 20_000;
const ANON_SESSION_KEY = 'aigc_anon_session_id';

function getOrCreateAnonSessionId(): string {
  let sessionId = localStorage.getItem(ANON_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(ANON_SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Global presence heartbeat hook.
 *
 * Uses anonymous session-based heartbeat for all visitors (both logged-in
 * and anonymous). Each browser generates a persistent session ID that is
 * used to track online presence via TTL-based Redis keys.
 */
export function usePresence() {
  useEffect(() => {
    const anonSessionId = getOrCreateAnonSessionId();
    presenceApi.anonymousHeartbeat(anonSessionId).catch(() => {});
    const interval = setInterval(() => {
      presenceApi.anonymousHeartbeat(anonSessionId).catch(() => {});
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
      // Backend TTL will expire the entry naturally when the user closes the tab.
    };
  }, []);
}
