import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

/**
 * Tracks whether the user is idle (no mouse/keyboard/touch/scroll activity for 3 min).
 * Returns { isIdle, resetIdle } — pages can use isIdle to disable polling.
 */
export function useIdleDetector(timeout = IDLE_TIMEOUT) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), timeout);
  }, [timeout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
    const handler = () => resetIdle();

    // Start the initial timer
    resetIdle();

    for (const e of events) {
      window.addEventListener(e, handler, { passive: true });
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const e of events) {
        window.removeEventListener(e, handler);
      }
    };
  }, [resetIdle]);

  return { isIdle, resetIdle };
}
