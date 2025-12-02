import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';

interface UseStuckDetectionOptions {
  stepId: string | null;
  dwellThreshold?: number; // ms - 20 seconds
  clickThreshold?: number; // 6+ clicks
}

export function useStuckDetection({
  stepId,
  dwellThreshold = 20000, // 20 seconds
  clickThreshold = 6, // 6 repeated clicks
}: UseStuckDetectionOptions) {
  const { triggerStuck, userSession } = useApp();
  const clickCountRef = useRef(0);
  const dwellStartRef = useRef<Date | null>(null);
  const hasTriggeredRef = useRef(false);

  const resetDetection = useCallback(() => {
    clickCountRef.current = 0;
    dwellStartRef.current = null;
    hasTriggeredRef.current = false;
  }, []);

  useEffect(() => {
    if (!stepId) return;

    // Don't trigger if already prompted for this step
    if (userSession.stuckPromptedSteps?.includes(stepId)) {
      return;
    }

    dwellStartRef.current = new Date();

    const handleClick = () => {
      clickCountRef.current += 1;

      // Trigger on 6+ repeated clicks
      if (clickCountRef.current >= clickThreshold && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        triggerStuck(stepId);
      }
    };

    // Check for dwell time (20s) - no mouse movement requirement
    const checkStuck = setInterval(() => {
      if (!dwellStartRef.current || hasTriggeredRef.current) return;

      const dwellTime = new Date().getTime() - dwellStartRef.current.getTime();

      if (dwellTime >= dwellThreshold) {
        hasTriggeredRef.current = true;
        triggerStuck(stepId);
      }
    }, 5000);

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
      clearInterval(checkStuck);
      resetDetection();
    };
  }, [stepId, dwellThreshold, clickThreshold, triggerStuck, resetDetection, userSession.stuckPromptedSteps]);

  return { resetDetection };
}
